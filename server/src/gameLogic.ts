import {
  GameState,
  GamePhase,
  GameMode,
  Category,
  Character,
  Question,
  getCategoryRoster,
} from '@guess-who/shared';

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function configureGame(
  room: GameState,
  mode: GameMode,
  category: Category,
  boardSize: number,
  bestOf: 1 | 3,
  customCharacters?: Character[],
): void {
  room.mode = mode;
  room.category = category;
  room.bestOf = bestOf;

  if (category === Category.MUTUAL_FRIENDS && customCharacters) {
    room.characters = customCharacters;
    room.boardSize = customCharacters.length;
  } else {
    const roster = getCategoryRoster(category);
    if (!roster) {
      room.boardSize = boardSize;
      room.phase = GamePhase.CHARACTER_SELECT;
      return;
    }
    const size = Math.min(boardSize, roster.characters.length);
    room.characters = shuffle(roster.characters).slice(0, size);
    room.boardSize = size;
  }

  room.phase = GamePhase.CHARACTER_SELECT;
}

export function selectCharacter(
  room: GameState,
  playerId: string,
  characterId: string,
): boolean {
  const player = room.players.find(p => p.id === playerId);
  if (!player) return false;
  if (room.phase !== GamePhase.CHARACTER_SELECT) return false;

  // Verify character exists on the board
  if (!room.characters.some(c => c.id === characterId)) return false;

  player.selectedCharacterId = characterId;

  // Check if both players have selected
  const bothSelected = room.players.length === 2 &&
    room.players.every(p => p.selectedCharacterId !== null);

  if (bothSelected) {
    room.phase = GamePhase.PLAYING;
    // Randomly assign first turn
    const randomIndex = Math.floor(Math.random() * 2);
    room.currentTurnPlayerId = room.players[randomIndex].id;
  }

  return bothSelected;
}

export function advanceTurn(room: GameState): void {
  if (room.players.length !== 2) return;
  const currentIndex = room.players.findIndex(p => p.id === room.currentTurnPlayerId);
  const nextIndex = currentIndex === 0 ? 1 : 0;
  room.currentTurnPlayerId = room.players[nextIndex].id;
}

export function createQuestion(
  room: GameState,
  askerId: string,
  text: string,
): Question | null {
  if (room.currentTurnPlayerId !== askerId) return null;
  if (room.phase !== GamePhase.PLAYING) return null;

  const question: Question = {
    id: `q-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    askerId,
    text,
    answer: null,
    isSnipe: false,
    snipeCharacterId: null,
    snipeCorrect: null,
  };

  room.questions.push(question);
  return question;
}

export function answerQuestion(
  room: GameState,
  questionId: string,
  answer: 'yes' | 'no',
): Question | null {
  const question = room.questions.find(q => q.id === questionId);
  if (!question) return null;
  if (question.answer !== null) return null;

  question.answer = answer;
  advanceTurn(room);
  return question;
}

export function processSnipe(
  room: GameState,
  sniperId: string,
  guessedCharacterId: string,
): { correct: boolean; winnerId: string | null; question: Question } | null {
  if (room.currentTurnPlayerId !== sniperId) return null;
  if (room.phase !== GamePhase.PLAYING) return null;

  const opponent = room.players.find(p => p.id !== sniperId);
  if (!opponent) return null;

  const correct = opponent.selectedCharacterId === guessedCharacterId;
  const guessedCharacter = room.characters.find(c => c.id === guessedCharacterId);

  const question: Question = {
    id: `q-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    askerId: sniperId,
    text: null,
    answer: null,
    isSnipe: true,
    snipeCharacterId: guessedCharacterId,
    snipeCorrect: correct,
  };
  room.questions.push(question);

  let winnerId: string | null = null;

  if (correct) {
    winnerId = sniperId;
    const sniper = room.players.find(p => p.id === sniperId)!;
    sniper.wins += 1;

    // Check if game is over (best-of series)
    const winsNeeded = room.bestOf === 3 ? 2 : 1;
    if (sniper.wins >= winsNeeded) {
      room.phase = GamePhase.GAME_OVER;
      room.winnerId = sniperId;
    } else {
      room.phase = GamePhase.ROUND_OVER;
      room.winnerId = sniperId;
    }
  } else {
    // Wrong guess: turn is consumed
    advanceTurn(room);
  }

  return {
    correct,
    winnerId,
    question,
  };
}

export function resetForRematch(room: GameState): void {
  room.phase = GamePhase.CHARACTER_SELECT;
  room.currentTurnPlayerId = null;
  room.questions = [];
  room.roundNumber = 1;
  room.winnerId = null;

  // Re-shuffle characters from the same category
  if (room.category && room.category !== Category.MUTUAL_FRIENDS) {
    const roster = getCategoryRoster(room.category);
    if (roster) {
      room.characters = shuffle(roster.characters).slice(0, room.boardSize);
    }
  }

  for (const player of room.players) {
    player.selectedCharacterId = null;
    player.eliminatedIds = [];
  }
}

export function resetForNewRound(room: GameState): void {
  room.phase = GamePhase.CHARACTER_SELECT;
  room.currentTurnPlayerId = null;
  room.questions = [];
  room.roundNumber += 1;
  room.winnerId = null;

  for (const player of room.players) {
    player.selectedCharacterId = null;
    player.eliminatedIds = [];
  }
}

export function stripSecretForPlayer(room: GameState, playerId: string): GameState {
  return {
    ...room,
    players: room.players.map(p => ({
      ...p,
      selectedCharacterId: p.id === playerId ? p.selectedCharacterId : null,
      eliminatedIds: p.id === playerId ? p.eliminatedIds : [],
    })),
  };
}
