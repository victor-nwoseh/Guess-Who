import { GameState, GamePhase, GameMode, Player } from '@guess-who/shared';

const rooms = new Map<string, GameState>();

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code: string;
  do {
    code = '';
    for (let i = 0; i < 4; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
  } while (rooms.has(code));
  return code;
}

export function createRoom(hostId: string, displayName: string): GameState {
  const roomCode = generateRoomCode();
  const host: Player = {
    id: hostId,
    displayName,
    isHost: true,
    selectedCharacterId: null,
    eliminatedIds: [],
    wins: 0,
  };

  const gameState: GameState = {
    roomCode,
    phase: GamePhase.LOBBY,
    mode: GameMode.REMOTE,
    category: null,
    boardSize: 24,
    characters: [],
    players: [host],
    currentTurnPlayerId: null,
    questions: [],
    roundNumber: 1,
    bestOf: 1,
    winnerId: null,
  };

  rooms.set(roomCode, gameState);
  return gameState;
}

export function joinRoom(roomCode: string, playerId: string, displayName: string): GameState | null {
  const room = rooms.get(roomCode);
  if (!room) return null;
  if (room.players.length >= 2) return null;
  if (room.phase !== GamePhase.LOBBY) return null;

  const player: Player = {
    id: playerId,
    displayName,
    isHost: false,
    selectedCharacterId: null,
    eliminatedIds: [],
    wins: 0,
  };

  room.players.push(player);
  return room;
}

export function getRoom(roomCode: string): GameState | null {
  return rooms.get(roomCode) || null;
}

export function deleteRoom(roomCode: string): void {
  rooms.delete(roomCode);
}

export function getRoomByPlayerId(playerId: string): GameState | null {
  for (const room of rooms.values()) {
    if (room.players.some(p => p.id === playerId)) {
      return room;
    }
  }
  return null;
}

export function updatePlayerIdInRoom(roomCode: string, oldId: string, newId: string): boolean {
  const room = rooms.get(roomCode);
  if (!room) return false;
  const player = room.players.find(p => p.id === oldId);
  if (!player) return false;
  player.id = newId;
  if (room.currentTurnPlayerId === oldId) {
    room.currentTurnPlayerId = newId;
  }
  return true;
}
