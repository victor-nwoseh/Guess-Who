import { Server, Socket } from 'socket.io';
import { ClientEvents, ServerEvents, GamePhase, GameMode } from '@guess-who/shared';
import { createRoom, joinRoom, getRoom, deleteRoom, getRoomByPlayerId, updatePlayerIdInRoom } from './rooms';
import { addToQueue, removeFromQueue } from './matchmaking';
import {
  configureGame,
  selectCharacter,
  createQuestion,
  answerQuestion,
  processSnipe,
  advanceTurn,
  resetForRematch,
  resetForNewRound,
  stripSecretForPlayer,
} from './gameLogic';

type TypedSocket = Socket<ClientEvents, ServerEvents>;
type TypedServer = Server<ClientEvents, ServerEvents>;

// Track reconnection data: maps old socket IDs to room codes
const disconnectedPlayers = new Map<string, { roomCode: string; timeout: NodeJS.Timeout }>();

export function registerHandlers(io: TypedServer, socket: TypedSocket): void {

  socket.on('create-room', ({ displayName }) => {
    const gameState = createRoom(socket.id, displayName);
    socket.join(gameState.roomCode);
    socket.emit('room-created', {
      roomCode: gameState.roomCode,
      gameState: stripSecretForPlayer(gameState, socket.id),
    });
  });

  socket.on('reconnect-session', ({ oldSocketId, roomCode }) => {
    const reconnected = handleReconnection(io, socket, oldSocketId);
    if (!reconnected) {
      socket.emit('error', { message: 'Session expired or room no longer exists.' });
    }
  });

  socket.on('join-room', ({ roomCode, displayName }) => {
    const upperCode = roomCode.toUpperCase();
    const gameState = joinRoom(upperCode, socket.id, displayName);
    if (!gameState) {
      socket.emit('error', { message: 'Room not found, full, or game already started.' });
      return;
    }

    socket.join(upperCode);
    socket.emit('room-joined', {
      gameState: stripSecretForPlayer(gameState, socket.id),
    });

    // Notify the other player
    const otherPlayer = gameState.players.find(p => p.id !== socket.id);
    if (otherPlayer) {
      const newPlayer = gameState.players.find(p => p.id === socket.id)!;
      io.to(otherPlayer.id).emit('player-joined', {
        player: newPlayer,
        gameState: stripSecretForPlayer(gameState, otherPlayer.id),
      });
    }
  });

  socket.on('join-matchmaking', ({ displayName }) => {
    const match = addToQueue(socket.id, displayName);
    if (match) {
      // Pair found — create a room with player1 as host
      const gameState = createRoom(match.socketId, match.displayName);
      const roomCode = gameState.roomCode;

      // Join player1
      const matchSocket = io.sockets.sockets.get(match.socketId);
      if (matchSocket) {
        matchSocket.join(roomCode);
        matchSocket.emit('room-created', {
          roomCode,
          gameState: stripSecretForPlayer(gameState, match.socketId),
        });
      }

      // Join player2 (current socket)
      const updatedState = joinRoom(roomCode, socket.id, displayName);
      if (updatedState) {
        socket.join(roomCode);
        socket.emit('room-joined', {
          gameState: stripSecretForPlayer(updatedState, socket.id),
        });

        // Notify player1 about player2 joining
        if (matchSocket) {
          const newPlayer = updatedState.players.find(p => p.id === socket.id)!;
          matchSocket.emit('player-joined', {
            player: newPlayer,
            gameState: stripSecretForPlayer(updatedState, match.socketId),
          });
        }
      }
    }
  });

  socket.on('configure-game', ({ mode, category, boardSize, bestOf, customCharacters }) => {
    const room = getRoomByPlayerId(socket.id);
    if (!room) return;

    const player = room.players.find(p => p.id === socket.id);
    if (!player?.isHost) {
      socket.emit('error', { message: 'Only the host can configure the game.' });
      return;
    }

    configureGame(room, mode, category, boardSize, bestOf, customCharacters);

    // Send each player their own view of the game state
    for (const p of room.players) {
      io.to(p.id).emit('game-configured', {
        gameState: stripSecretForPlayer(room, p.id),
      });
    }
  });

  socket.on('select-character', ({ characterId }) => {
    const room = getRoomByPlayerId(socket.id);
    if (!room) return;

    const bothSelected = selectCharacter(room, socket.id, characterId);

    if (bothSelected) {
      for (const p of room.players) {
        io.to(p.id).emit('both-selected', {
          currentTurnPlayerId: room.currentTurnPlayerId!,
        });
      }
    }
  });

  socket.on('ask-question', ({ text }) => {
    const room = getRoomByPlayerId(socket.id);
    if (!room) return;
    if (room.mode !== GameMode.REMOTE) return;

    const question = createQuestion(room, socket.id, text);
    if (!question) {
      socket.emit('error', { message: 'Not your turn.' });
      return;
    }

    // Send to both players
    io.to(room.roomCode).emit('question-asked', { question });
  });

  socket.on('answer-question', ({ questionId, answer }) => {
    const room = getRoomByPlayerId(socket.id);
    if (!room) return;

    const question = answerQuestion(room, questionId, answer);
    if (!question) {
      socket.emit('error', { message: 'Invalid question or already answered.' });
      return;
    }

    io.to(room.roomCode).emit('question-answered', { question });

    // Notify both players of the new turn
    for (const p of room.players) {
      io.to(p.id).emit('turn-started', {
        currentTurnPlayerId: room.currentTurnPlayerId!,
      });
    }
  });

  socket.on('end-turn', () => {
    const room = getRoomByPlayerId(socket.id);
    if (!room) return;
    if (room.mode !== GameMode.IN_PERSON) return;
    if (room.currentTurnPlayerId !== socket.id) return;

    advanceTurn(room);

    for (const p of room.players) {
      io.to(p.id).emit('turn-started', {
        currentTurnPlayerId: room.currentTurnPlayerId!,
      });
    }
  });

  socket.on('snipe', ({ characterId }) => {
    const room = getRoomByPlayerId(socket.id);
    if (!room) return;

    const result = processSnipe(room, socket.id, characterId);
    if (!result) {
      socket.emit('error', { message: 'Not your turn or invalid snipe.' });
      return;
    }

    const guessedChar = room.characters.find(c => c.id === characterId);

    // Send snipe result to both players
    io.to(room.roomCode).emit('snipe-result', {
      sniperId: socket.id,
      characterId,
      characterName: guessedChar?.name || 'Unknown',
      correct: result.correct,
      winnerId: result.winnerId,
      players: room.players,
    });

    if (result.correct) {
      // Send round-over with both characters revealed
      io.to(room.roomCode).emit('round-over', {
        winnerId: result.winnerId!,
        players: room.players,
        playerCharacters: room.players.map(p => ({
          playerId: p.id,
          characterId: p.selectedCharacterId!,
        })),
      });

      if (room.phase === GamePhase.GAME_OVER) {
        io.to(room.roomCode).emit('game-over', {
          winnerId: room.winnerId!,
          players: room.players,
        });
      }
    } else {
      // Wrong guess — turn advances, notify
      for (const p of room.players) {
        io.to(p.id).emit('turn-started', {
          currentTurnPlayerId: room.currentTurnPlayerId!,
        });
      }
    }
  });

  socket.on('request-rematch', () => {
    const room = getRoomByPlayerId(socket.id);
    if (!room) return;

    const opponent = room.players.find(p => p.id !== socket.id);
    if (!opponent) return;

    io.to(opponent.id).emit('rematch-requested');
  });

  socket.on('accept-rematch', () => {
    const room = getRoomByPlayerId(socket.id);
    if (!room) return;

    if (room.phase === GamePhase.GAME_OVER) {
      // Full rematch: reset wins
      for (const p of room.players) {
        p.wins = 0;
      }
      resetForRematch(room);
    } else {
      // Next round in a best-of series
      resetForNewRound(room);
    }

    for (const p of room.players) {
      io.to(p.id).emit('rematch-started', {
        gameState: stripSecretForPlayer(room, p.id),
      });
    }
  });

  socket.on('decline-rematch', () => {
    const room = getRoomByPlayerId(socket.id);
    if (!room) return;

    const opponent = room.players.find(p => p.id !== socket.id);
    if (!opponent) return;

    io.to(opponent.id).emit('rematch-declined');
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    removeFromQueue(socket.id);

    const room = getRoomByPlayerId(socket.id);
    if (!room) return;

    const opponent = room.players.find(p => p.id !== socket.id);
    if (opponent) {
      io.to(opponent.id).emit('opponent-disconnected');
    }

    // 30-second reconnection window
    const timeout = setTimeout(() => {
      disconnectedPlayers.delete(socket.id);
      // If still disconnected, clean up
      const currentRoom = getRoom(room.roomCode);
      if (currentRoom) {
        const stillDisconnected = currentRoom.players.find(p => p.id === socket.id);
        if (stillDisconnected) {
          deleteRoom(room.roomCode);
        }
      }
    }, 30000);

    disconnectedPlayers.set(socket.id, { roomCode: room.roomCode, timeout });
  });
}

export function handleReconnection(io: TypedServer, socket: TypedSocket, oldSocketId: string): boolean {
  const entry = disconnectedPlayers.get(oldSocketId);
  if (!entry) return false;

  clearTimeout(entry.timeout);
  disconnectedPlayers.delete(oldSocketId);

  const updated = updatePlayerIdInRoom(entry.roomCode, oldSocketId, socket.id);
  if (!updated) return false;

  socket.join(entry.roomCode);

  const room = getRoom(entry.roomCode);
  if (room) {
    socket.emit('room-joined', {
      gameState: stripSecretForPlayer(room, socket.id),
    });
  }

  return true;
}
