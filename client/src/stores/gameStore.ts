import { create } from 'zustand';
import type { GameState, GamePhase, Question, Player } from '@guess-who/shared';
import { getSocket, storeSession } from '../services/socket';
import { playSound } from '../services/audio';

interface GameStore {
  // Server-synced state
  roomCode: string | null;
  gameState: GameState | null;

  // Client-only state
  myPlayerId: string | null;
  myEliminatedIds: string[];
  displayName: string;
  revealedCharacters: { playerId: string; characterId: string }[] | null;

  // Actions — state updates
  setGameState: (gameState: GameState) => void;
  setPhase: (phase: GamePhase) => void;
  setMyPlayerId: (id: string) => void;
  setRoomCode: (code: string) => void;
  setDisplayName: (name: string) => void;
  eliminateCharacter: (characterId: string) => void;
  restoreCharacter: (characterId: string) => void;
  addQuestion: (question: Question) => void;
  updateQuestion: (question: Question) => void;
  updatePlayers: (players: Player[]) => void;
  setCurrentTurn: (playerId: string) => void;
  setWinner: (winnerId: string) => void;
  clearRevealedCharacters: () => void;
  reset: () => void;
}

const initialState = {
  roomCode: null as string | null,
  gameState: null as GameState | null,
  myPlayerId: null as string | null,
  myEliminatedIds: JSON.parse(sessionStorage.getItem('gw_eliminatedIds') || '[]') as string[],
  displayName: localStorage.getItem('gw_displayName') || '',
  revealedCharacters: null as { playerId: string; characterId: string }[] | null,
};

export const useGameStore = create<GameStore>((set, get) => ({
  ...initialState,

  setGameState: (gameState) => set({ gameState, roomCode: gameState.roomCode }),

  setPhase: (phase) => set((state) => {
    if (!state.gameState) return state;
    return { gameState: { ...state.gameState, phase } };
  }),

  setMyPlayerId: (id) => set({ myPlayerId: id }),

  setRoomCode: (code) => set({ roomCode: code }),

  setDisplayName: (name) => {
    localStorage.setItem('gw_displayName', name);
    set({ displayName: name });
  },

  eliminateCharacter: (characterId) => set((state) => {
    if (state.myEliminatedIds.includes(characterId)) return state;
    const updated = [...state.myEliminatedIds, characterId];
    sessionStorage.setItem('gw_eliminatedIds', JSON.stringify(updated));
    return { myEliminatedIds: updated };
  }),

  restoreCharacter: (characterId) => set((state) => {
    const updated = state.myEliminatedIds.filter(id => id !== characterId);
    sessionStorage.setItem('gw_eliminatedIds', JSON.stringify(updated));
    return { myEliminatedIds: updated };
  }),

  addQuestion: (question) => set((state) => {
    if (!state.gameState) return state;
    if (state.gameState.questions.some(q => q.id === question.id)) return state;
    const questions = [...state.gameState.questions, question];
    sessionStorage.setItem('gw_questions', JSON.stringify(questions));
    return {
      gameState: {
        ...state.gameState,
        questions,
      },
    };
  }),

  updateQuestion: (question) => set((state) => {
    if (!state.gameState) return state;
    const questions = state.gameState.questions.map(q =>
      q.id === question.id ? question : q
    );
    sessionStorage.setItem('gw_questions', JSON.stringify(questions));
    return {
      gameState: {
        ...state.gameState,
        questions,
      },
    };
  }),

  updatePlayers: (players) => set((state) => {
    if (!state.gameState) return state;
    return { gameState: { ...state.gameState, players } };
  }),

  setCurrentTurn: (playerId) => set((state) => {
    if (!state.gameState) return state;
    return { gameState: { ...state.gameState, currentTurnPlayerId: playerId } };
  }),

  setWinner: (winnerId) => set((state) => {
    if (!state.gameState) return state;
    return { gameState: { ...state.gameState, winnerId } };
  }),

  clearRevealedCharacters: () => set({ revealedCharacters: null }),

  reset: () => set({ ...initialState, displayName: get().displayName }),
}));

// Subscribe to server events
export function subscribeToServerEvents(): () => void {
  const socket = getSocket();
  const store = useGameStore.getState;
  const set = useGameStore.setState;

  const onRoomCreated = ({ roomCode, gameState }: { roomCode: string; gameState: GameState }) => {
    set({ gameState, roomCode, myPlayerId: socket.id ?? null });
    storeSession(roomCode, store().displayName);
  };

  const onRoomJoined = ({ gameState }: { gameState: GameState }) => {
    // Sync sessionStorage with server's authoritative question state
    if (gameState.questions.length > 0) {
      sessionStorage.setItem('gw_questions', JSON.stringify(gameState.questions));
    }
    set({ gameState, roomCode: gameState.roomCode, myPlayerId: socket.id ?? null });
    storeSession(gameState.roomCode, store().displayName);
  };

  const onPlayerJoined = ({ gameState }: { player: Player; gameState: GameState }) => {
    set({ gameState });
    playSound('playerJoined');
  };

  const onGameConfigured = ({ gameState }: { gameState: GameState }) => {
    sessionStorage.removeItem('gw_eliminatedIds');
    sessionStorage.removeItem('gw_selectedCharId');
    sessionStorage.removeItem('gw_questions');
    set({ gameState, myEliminatedIds: [] });
  };

  const onBothSelected = ({ currentTurnPlayerId }: { currentTurnPlayerId: string }) => {
    const gs = store().gameState;
    if (!gs) return;
    set({
      gameState: {
        ...gs,
        phase: 'playing' as GamePhase,
        currentTurnPlayerId,
      },
    });
    const isMyTurn = currentTurnPlayerId === store().myPlayerId;
    playSound(isMyTurn ? 'turnStart' : 'matchFound');
  };

  const onTurnStarted = ({ currentTurnPlayerId }: { currentTurnPlayerId: string }) => {
    const gs = store().gameState;
    if (!gs) return;
    set({ gameState: { ...gs, currentTurnPlayerId } });
    if (currentTurnPlayerId === store().myPlayerId) {
      playSound('turnStart');
    }
  };

  const onQuestionAsked = ({ question }: { question: Question }) => {
    useGameStore.getState().addQuestion(question);
    if (question.askerId !== store().myPlayerId) {
      playSound('questionReceived');
    }
  };

  const onQuestionAnswered = ({ question }: { question: Question }) => {
    useGameStore.getState().updateQuestion(question);
  };

  const onSnipeResult = ({ players }: {
    sniperId: string;
    characterId: string;
    characterName: string;
    correct: boolean;
    winnerId: string | null;
    players: Player[];
  }) => {
    useGameStore.getState().updatePlayers(players);
  };

  const onRoundOver = ({ winnerId, players, playerCharacters }: {
    winnerId: string;
    players: Player[];
    playerCharacters: { playerId: string; characterId: string }[];
  }) => {
    const gs = store().gameState;
    if (!gs) return;
    set({
      gameState: {
        ...gs,
        phase: 'round_over' as GamePhase,
        winnerId,
        players,
      },
      revealedCharacters: playerCharacters,
    });
    playSound(winnerId === store().myPlayerId ? 'victory' : 'defeat');
  };

  const onGameOver = ({ winnerId, players }: { winnerId: string; players: Player[] }) => {
    const gs = store().gameState;
    if (!gs) return;
    set({
      gameState: {
        ...gs,
        phase: 'game_over' as GamePhase,
        winnerId,
        players,
      },
    });
  };

  const onRematchStarted = ({ gameState }: { gameState: GameState }) => {
    sessionStorage.removeItem('gw_eliminatedIds');
    sessionStorage.removeItem('gw_selectedCharId');
    sessionStorage.removeItem('gw_questions');
    set({ gameState, myEliminatedIds: [] });
  };

  const onOpponentDisconnected = () => {
    // Phase 6 will add a modal for this
  };

  const onError = ({ message }: { message: string }) => {
    console.error('Server error:', message);
  };

  socket.on('room-created', onRoomCreated);
  socket.on('room-joined', onRoomJoined);
  socket.on('player-joined', onPlayerJoined);
  socket.on('game-configured', onGameConfigured);
  socket.on('both-selected', onBothSelected);
  socket.on('turn-started', onTurnStarted);
  socket.on('question-asked', onQuestionAsked);
  socket.on('question-answered', onQuestionAnswered);
  socket.on('snipe-result', onSnipeResult);
  socket.on('round-over', onRoundOver);
  socket.on('game-over', onGameOver);
  socket.on('rematch-started', onRematchStarted);
  socket.on('opponent-disconnected', onOpponentDisconnected);
  socket.on('error', onError);

  // Return cleanup function
  return () => {
    socket.off('room-created', onRoomCreated);
    socket.off('room-joined', onRoomJoined);
    socket.off('player-joined', onPlayerJoined);
    socket.off('game-configured', onGameConfigured);
    socket.off('both-selected', onBothSelected);
    socket.off('turn-started', onTurnStarted);
    socket.off('question-asked', onQuestionAsked);
    socket.off('question-answered', onQuestionAnswered);
    socket.off('snipe-result', onSnipeResult);
    socket.off('round-over', onRoundOver);
    socket.off('game-over', onGameOver);
    socket.off('rematch-started', onRematchStarted);
    socket.off('opponent-disconnected', onOpponentDisconnected);
    socket.off('error', onError);
  };
}
