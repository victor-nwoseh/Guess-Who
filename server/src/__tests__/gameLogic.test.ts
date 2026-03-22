import { describe, it, expect, beforeEach } from 'vitest';
import {
  configureGame,
  selectCharacter,
  advanceTurn,
  createQuestion,
  answerQuestion,
  processSnipe,
  resetForRematch,
  resetForNewRound,
  stripSecretForPlayer,
} from '../gameLogic';
import { GameState, GamePhase, GameMode, Category, Character } from '@guess-who/shared';

function makeRoom(overrides?: Partial<GameState>): GameState {
  return {
    roomCode: 'TEST',
    phase: GamePhase.LOBBY,
    mode: GameMode.REMOTE,
    category: null,
    boardSize: 24,
    characters: [],
    players: [
      {
        id: 'p1',
        displayName: 'Alice',
        isHost: true,
        selectedCharacterId: null,
        eliminatedIds: [],
        wins: 0,
        seriesWins: 0,
      },
      {
        id: 'p2',
        displayName: 'Bob',
        isHost: false,
        selectedCharacterId: null,
        eliminatedIds: [],
        wins: 0,
        seriesWins: 0,
      },
    ],
    currentTurnPlayerId: null,
    questions: [],
    roundNumber: 1,
    bestOf: 1,
    winnerId: null,
    ...overrides,
  };
}

const testCharacters: Character[] = Array.from({ length: 24 }, (_, i) => ({
  id: `char-${i + 1}`,
  name: `Character ${i + 1}`,
  imageUrl: `/img/${i + 1}.jpg`,
  gender: i % 2 === 0 ? 'male' as const : 'female' as const,
}));

describe('gameLogic', () => {
  describe('configureGame', () => {
    it('sets mode, category, bestOf, and transitions to CHARACTER_SELECT', () => {
      const room = makeRoom();
      configureGame(room, GameMode.IN_PERSON, Category.ACTORS, 20, 3);

      expect(room.mode).toBe(GameMode.IN_PERSON);
      expect(room.category).toBe(Category.ACTORS);
      expect(room.bestOf).toBe(3);
      expect(room.phase).toBe(GamePhase.CHARACTER_SELECT);
      expect(room.characters.length).toBeLessThanOrEqual(20);
      expect(room.characters.length).toBeGreaterThan(0);
      expect(room.boardSize).toBe(room.characters.length);
    });

    it('uses custom characters for Mutual Friends', () => {
      const room = makeRoom();
      const friends: Character[] = [
        { id: 'mf-1', name: 'Friend 1', imageUrl: '', gender: 'male' },
        { id: 'mf-2', name: 'Friend 2', imageUrl: '', gender: 'female' },
      ];
      configureGame(room, GameMode.REMOTE, Category.MUTUAL_FRIENDS, 2, 1, friends);

      expect(room.characters).toEqual(friends);
      expect(room.boardSize).toBe(2);
      expect(room.phase).toBe(GamePhase.CHARACTER_SELECT);
    });

    it('limits board size to available roster', () => {
      const room = makeRoom();
      configureGame(room, GameMode.REMOTE, Category.ACTORS, 999, 1);

      // Should be capped at roster size (50)
      expect(room.characters.length).toBeLessThanOrEqual(50);
      expect(room.boardSize).toBe(room.characters.length);
    });
  });

  describe('selectCharacter', () => {
    it('sets player character selection', () => {
      const room = makeRoom({
        phase: GamePhase.CHARACTER_SELECT,
        characters: testCharacters,
      });

      const bothSelected = selectCharacter(room, 'p1', 'char-1');
      expect(bothSelected).toBe(false);
      expect(room.players[0].selectedCharacterId).toBe('char-1');
      expect(room.phase).toBe(GamePhase.CHARACTER_SELECT);
    });

    it('transitions to PLAYING when both players select', () => {
      const room = makeRoom({
        phase: GamePhase.CHARACTER_SELECT,
        characters: testCharacters,
      });

      selectCharacter(room, 'p1', 'char-1');
      const bothSelected = selectCharacter(room, 'p2', 'char-2');

      expect(bothSelected).toBe(true);
      expect(room.phase).toBe(GamePhase.PLAYING);
      expect(room.currentTurnPlayerId).toBeDefined();
      expect(['p1', 'p2']).toContain(room.currentTurnPlayerId);
    });

    it('rejects selection if not in CHARACTER_SELECT phase', () => {
      const room = makeRoom({
        phase: GamePhase.PLAYING,
        characters: testCharacters,
      });

      const result = selectCharacter(room, 'p1', 'char-1');
      expect(result).toBe(false);
      expect(room.players[0].selectedCharacterId).toBeNull();
    });

    it('rejects selection of character not on the board', () => {
      const room = makeRoom({
        phase: GamePhase.CHARACTER_SELECT,
        characters: testCharacters,
      });

      const result = selectCharacter(room, 'p1', 'nonexistent');
      expect(result).toBe(false);
    });

    it('rejects selection by unknown player', () => {
      const room = makeRoom({
        phase: GamePhase.CHARACTER_SELECT,
        characters: testCharacters,
      });

      const result = selectCharacter(room, 'unknown', 'char-1');
      expect(result).toBe(false);
    });
  });

  describe('advanceTurn', () => {
    it('alternates between players', () => {
      const room = makeRoom({
        phase: GamePhase.PLAYING,
        currentTurnPlayerId: 'p1',
      });

      advanceTurn(room);
      expect(room.currentTurnPlayerId).toBe('p2');

      advanceTurn(room);
      expect(room.currentTurnPlayerId).toBe('p1');
    });
  });

  describe('createQuestion', () => {
    it('creates a question when it is the asker turn', () => {
      const room = makeRoom({
        phase: GamePhase.PLAYING,
        currentTurnPlayerId: 'p1',
      });

      const q = createQuestion(room, 'p1', 'Is it male?');
      expect(q).not.toBeNull();
      expect(q!.askerId).toBe('p1');
      expect(q!.text).toBe('Is it male?');
      expect(q!.answer).toBeNull();
      expect(q!.isSnipe).toBe(false);
      expect(room.questions).toHaveLength(1);
    });

    it('rejects question when not the asker turn', () => {
      const room = makeRoom({
        phase: GamePhase.PLAYING,
        currentTurnPlayerId: 'p2',
      });

      const q = createQuestion(room, 'p1', 'Is it male?');
      expect(q).toBeNull();
    });

    it('rejects question when not in PLAYING phase', () => {
      const room = makeRoom({
        phase: GamePhase.LOBBY,
        currentTurnPlayerId: 'p1',
      });

      const q = createQuestion(room, 'p1', 'Is it male?');
      expect(q).toBeNull();
    });
  });

  describe('answerQuestion', () => {
    it('answers a question and advances turn', () => {
      const room = makeRoom({
        phase: GamePhase.PLAYING,
        currentTurnPlayerId: 'p1',
      });

      const q = createQuestion(room, 'p1', 'Is it male?')!;
      const answered = answerQuestion(room, q.id, 'yes');

      expect(answered).not.toBeNull();
      expect(answered!.answer).toBe('yes');
      expect(room.currentTurnPlayerId).toBe('p2'); // Turn advanced
    });

    it('rejects answering non-existent question', () => {
      const room = makeRoom({ phase: GamePhase.PLAYING });
      const result = answerQuestion(room, 'nonexistent', 'yes');
      expect(result).toBeNull();
    });

    it('rejects answering already answered question', () => {
      const room = makeRoom({
        phase: GamePhase.PLAYING,
        currentTurnPlayerId: 'p1',
      });

      const q = createQuestion(room, 'p1', 'Is it male?')!;
      answerQuestion(room, q.id, 'yes');
      const duplicate = answerQuestion(room, q.id, 'no');
      expect(duplicate).toBeNull();
    });
  });

  describe('processSnipe', () => {
    it('correct snipe wins the round (best-of-1)', () => {
      const room = makeRoom({
        phase: GamePhase.PLAYING,
        currentTurnPlayerId: 'p1',
        characters: testCharacters,
        bestOf: 1,
      });
      room.players[1].selectedCharacterId = 'char-5'; // Opponent's secret

      const result = processSnipe(room, 'p1', 'char-5');

      expect(result).not.toBeNull();
      expect(result!.correct).toBe(true);
      expect(result!.winnerId).toBe('p1');
      expect(room.phase).toBe(GamePhase.GAME_OVER);
      expect(room.winnerId).toBe('p1');
      expect(room.players[0].wins).toBe(1);
      expect(room.players[0].seriesWins).toBe(1);
    });

    it('correct snipe in best-of-3 goes to ROUND_OVER (not GAME_OVER) on first win', () => {
      const room = makeRoom({
        phase: GamePhase.PLAYING,
        currentTurnPlayerId: 'p1',
        characters: testCharacters,
        bestOf: 3,
      });
      room.players[1].selectedCharacterId = 'char-5';

      const result = processSnipe(room, 'p1', 'char-5');

      expect(result!.correct).toBe(true);
      expect(room.phase).toBe(GamePhase.ROUND_OVER);
      expect(room.players[0].wins).toBe(1);
      expect(room.players[0].seriesWins).toBe(0); // Not enough for series win
    });

    it('second win in best-of-3 ends the game', () => {
      const room = makeRoom({
        phase: GamePhase.PLAYING,
        currentTurnPlayerId: 'p1',
        characters: testCharacters,
        bestOf: 3,
      });
      room.players[0].wins = 1; // Already won 1
      room.players[1].selectedCharacterId = 'char-5';

      const result = processSnipe(room, 'p1', 'char-5');

      expect(result!.correct).toBe(true);
      expect(room.phase).toBe(GamePhase.GAME_OVER);
      expect(room.players[0].wins).toBe(2);
      expect(room.players[0].seriesWins).toBe(1);
    });

    it('wrong snipe consumes the turn', () => {
      const room = makeRoom({
        phase: GamePhase.PLAYING,
        currentTurnPlayerId: 'p1',
        characters: testCharacters,
      });
      room.players[1].selectedCharacterId = 'char-5';

      const result = processSnipe(room, 'p1', 'char-3'); // Wrong guess

      expect(result!.correct).toBe(false);
      expect(result!.winnerId).toBeNull();
      expect(room.phase).toBe(GamePhase.PLAYING);
      expect(room.currentTurnPlayerId).toBe('p2'); // Turn consumed
      expect(room.players[0].wins).toBe(0);
    });

    it('records snipe as a question with isSnipe=true', () => {
      const room = makeRoom({
        phase: GamePhase.PLAYING,
        currentTurnPlayerId: 'p1',
        characters: testCharacters,
      });
      room.players[1].selectedCharacterId = 'char-5';

      processSnipe(room, 'p1', 'char-3');

      expect(room.questions).toHaveLength(1);
      expect(room.questions[0].isSnipe).toBe(true);
      expect(room.questions[0].snipeCharacterId).toBe('char-3');
      expect(room.questions[0].snipeCorrect).toBe(false);
    });

    it('rejects snipe when not the player turn', () => {
      const room = makeRoom({
        phase: GamePhase.PLAYING,
        currentTurnPlayerId: 'p2',
        characters: testCharacters,
      });
      room.players[1].selectedCharacterId = 'char-5';

      const result = processSnipe(room, 'p1', 'char-5');
      expect(result).toBeNull();
    });

    it('rejects snipe when not in PLAYING phase', () => {
      const room = makeRoom({
        phase: GamePhase.LOBBY,
        currentTurnPlayerId: 'p1',
        characters: testCharacters,
      });

      const result = processSnipe(room, 'p1', 'char-5');
      expect(result).toBeNull();
    });
  });

  describe('resetForRematch', () => {
    it('resets game state for a new match', () => {
      const room = makeRoom({
        phase: GamePhase.GAME_OVER,
        currentTurnPlayerId: 'p1',
        characters: testCharacters,
        category: Category.ACTORS,
        winnerId: 'p1',
        roundNumber: 3,
      });
      room.players[0].selectedCharacterId = 'char-1';
      room.players[0].wins = 2;
      room.players[1].selectedCharacterId = 'char-2';
      room.questions.push({
        id: 'q1', askerId: 'p1', text: 'test', answer: 'yes',
        isSnipe: false, snipeCharacterId: null, snipeCorrect: null,
      });

      resetForRematch(room);

      expect(room.phase).toBe(GamePhase.CHARACTER_SELECT);
      expect(room.currentTurnPlayerId).toBeNull();
      expect(room.questions).toEqual([]);
      expect(room.roundNumber).toBe(1);
      expect(room.winnerId).toBeNull();
      expect(room.players[0].selectedCharacterId).toBeNull();
      expect(room.players[1].selectedCharacterId).toBeNull();
      expect(room.players[0].eliminatedIds).toEqual([]);
      // Characters should be re-shuffled (different order, same category)
      expect(room.characters.length).toBeGreaterThan(0);
    });
  });

  describe('resetForNewRound', () => {
    it('resets for next round in best-of-3', () => {
      const room = makeRoom({
        phase: GamePhase.ROUND_OVER,
        currentTurnPlayerId: 'p1',
        roundNumber: 1,
        winnerId: 'p1',
      });
      room.players[0].selectedCharacterId = 'char-1';
      room.players[1].selectedCharacterId = 'char-2';

      resetForNewRound(room);

      expect(room.phase).toBe(GamePhase.CHARACTER_SELECT);
      expect(room.currentTurnPlayerId).toBeNull();
      expect(room.roundNumber).toBe(2);
      expect(room.winnerId).toBeNull();
      expect(room.questions).toEqual([]);
      expect(room.players[0].selectedCharacterId).toBeNull();
      expect(room.players[1].selectedCharacterId).toBeNull();
    });
  });

  describe('stripSecretForPlayer', () => {
    it('hides opponent selectedCharacterId', () => {
      const room = makeRoom({
        phase: GamePhase.PLAYING,
      });
      room.players[0].selectedCharacterId = 'char-1';
      room.players[1].selectedCharacterId = 'char-2';
      room.players[0].eliminatedIds = ['char-3'];

      const stripped = stripSecretForPlayer(room, 'p1');

      // My own data visible
      expect(stripped.players[0].selectedCharacterId).toBe('char-1');
      expect(stripped.players[0].eliminatedIds).toEqual(['char-3']);

      // Opponent data hidden
      expect(stripped.players[1].selectedCharacterId).toBeNull();
      expect(stripped.players[1].eliminatedIds).toEqual([]);
    });

    it('does not mutate original room', () => {
      const room = makeRoom({ phase: GamePhase.PLAYING });
      room.players[1].selectedCharacterId = 'char-2';

      stripSecretForPlayer(room, 'p1');

      expect(room.players[1].selectedCharacterId).toBe('char-2');
    });
  });
});
