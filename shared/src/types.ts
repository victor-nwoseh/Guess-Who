// --- Constants (const objects instead of enums for Vite/erasableSyntaxOnly compatibility) ---

export const GameMode = {
  REMOTE: 'remote',
  IN_PERSON: 'in_person',
} as const;
export type GameMode = (typeof GameMode)[keyof typeof GameMode];

export const GamePhase = {
  LOBBY: 'lobby',
  SETUP: 'setup',
  CHARACTER_SELECT: 'character_select',
  PLAYING: 'playing',
  ROUND_OVER: 'round_over',
  GAME_OVER: 'game_over',
} as const;
export type GamePhase = (typeof GamePhase)[keyof typeof GamePhase];

export const Category = {
  MUTUAL_FRIENDS: 'mutual_friends',
  YOUTUBERS: 'youtubers',
  MUSIC_ARTISTS: 'music_artists',
  ACTORS: 'actors',
  ATHLETES: 'athletes',
  BIBLE_CHARACTERS: 'bible_characters',
  FAMOUS_FACES: 'famous_faces',
} as const;
export type Category = (typeof Category)[keyof typeof Category];

// --- Core Interfaces ---

export interface Character {
  id: string;
  name: string;
  imageUrl: string;
  gender?: 'male' | 'female';
}

export interface Player {
  id: string;
  displayName: string;
  isHost: boolean;
  selectedCharacterId: string | null;
  eliminatedIds: string[];
  wins: number;
}

export interface Question {
  id: string;
  askerId: string;
  text: string | null;
  answer: 'yes' | 'no' | null;
  isSnipe: boolean;
  snipeCharacterId: string | null;
  snipeCorrect: boolean | null;
}

export interface GameState {
  roomCode: string;
  phase: GamePhase;
  mode: GameMode;
  category: Category | null;
  boardSize: number;
  characters: Character[];
  players: Player[];
  currentTurnPlayerId: string | null;
  questions: Question[];
  roundNumber: number;
  bestOf: 1 | 3;
  winnerId: string | null;
}

// --- Client → Server Events ---

export interface ClientEvents {
  'create-room': (data: { displayName: string }) => void;
  'join-room': (data: { roomCode: string; displayName: string }) => void;
  'join-matchmaking': (data: { displayName: string }) => void;
  'configure-game': (data: {
    mode: GameMode;
    category: Category;
    boardSize: number;
    bestOf: 1 | 3;
    customCharacters?: Character[];
  }) => void;
  'select-character': (data: { characterId: string }) => void;
  'ask-question': (data: { text: string }) => void;
  'answer-question': (data: { questionId: string; answer: 'yes' | 'no' }) => void;
  'end-turn': () => void;
  'snipe': (data: { characterId: string }) => void;
  'request-rematch': () => void;
  'accept-rematch': () => void;
  'decline-rematch': () => void;
}

// --- Server → Client Events ---

export interface ServerEvents {
  'room-created': (data: { roomCode: string; gameState: GameState }) => void;
  'room-joined': (data: { gameState: GameState }) => void;
  'player-joined': (data: { player: Player; gameState: GameState }) => void;
  'game-configured': (data: { gameState: GameState }) => void;
  'both-selected': (data: { currentTurnPlayerId: string }) => void;
  'turn-started': (data: { currentTurnPlayerId: string }) => void;
  'question-asked': (data: { question: Question }) => void;
  'question-answered': (data: { question: Question }) => void;
  'snipe-result': (data: {
    sniperId: string;
    characterId: string;
    characterName: string;
    correct: boolean;
    winnerId: string | null;
    players: Player[];
  }) => void;
  'round-over': (data: {
    winnerId: string;
    players: Player[];
    playerCharacters: { playerId: string; characterId: string }[];
  }) => void;
  'game-over': (data: {
    winnerId: string;
    players: Player[];
  }) => void;
  'rematch-requested': () => void;
  'rematch-started': (data: { gameState: GameState }) => void;
  'rematch-declined': () => void;
  'opponent-disconnected': () => void;
  'error': (data: { message: string }) => void;
}
