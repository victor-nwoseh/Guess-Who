import { describe, it, expect, beforeEach } from 'vitest';
import { useGameStore } from '../stores/gameStore';
import type { GameState, Question } from '@guess-who/shared';

function makeGameState(overrides?: Partial<GameState>): GameState {
  return {
    roomCode: 'TEST',
    phase: 'playing',
    mode: 'remote',
    category: 'actors',
    boardSize: 24,
    characters: [
      { id: 'c1', name: 'Alice', imageUrl: '/img/1.jpg', gender: 'female' },
      { id: 'c2', name: 'Bob', imageUrl: '/img/2.jpg', gender: 'male' },
    ],
    players: [
      { id: 'p1', displayName: 'Player1', isHost: true, selectedCharacterId: 'c1', eliminatedIds: [], wins: 0, seriesWins: 0 },
      { id: 'p2', displayName: 'Player2', isHost: false, selectedCharacterId: 'c2', eliminatedIds: [], wins: 0, seriesWins: 0 },
    ],
    currentTurnPlayerId: 'p1',
    questions: [],
    roundNumber: 1,
    bestOf: 1,
    winnerId: null,
    ...overrides,
  };
}

describe('gameStore', () => {
  beforeEach(() => {
    useGameStore.setState({
      roomCode: null,
      gameState: null,
      myPlayerId: null,
      myEliminatedIds: [],
      displayName: '',
      revealedCharacters: null,
      opponentDisconnected: false,
    });
  });

  describe('setGameState', () => {
    it('sets game state and room code', () => {
      const gs = makeGameState();
      useGameStore.getState().setGameState(gs);

      expect(useGameStore.getState().gameState).toEqual(gs);
      expect(useGameStore.getState().roomCode).toBe('TEST');
    });
  });

  describe('eliminateCharacter', () => {
    it('adds character to eliminated list', () => {
      useGameStore.getState().eliminateCharacter('c1');

      expect(useGameStore.getState().myEliminatedIds).toEqual(['c1']);
    });

    it('does not add duplicate', () => {
      useGameStore.getState().eliminateCharacter('c1');
      useGameStore.getState().eliminateCharacter('c1');

      expect(useGameStore.getState().myEliminatedIds).toEqual(['c1']);
    });

    it('persists to sessionStorage', () => {
      useGameStore.getState().eliminateCharacter('c1');

      const stored = JSON.parse(sessionStorage.getItem('gw_eliminatedIds') || '[]');
      expect(stored).toEqual(['c1']);
    });

    it('handles multiple eliminations', () => {
      useGameStore.getState().eliminateCharacter('c1');
      useGameStore.getState().eliminateCharacter('c2');
      useGameStore.getState().eliminateCharacter('c3');

      expect(useGameStore.getState().myEliminatedIds).toEqual(['c1', 'c2', 'c3']);
    });
  });

  describe('restoreCharacter', () => {
    it('removes character from eliminated list', () => {
      useGameStore.getState().eliminateCharacter('c1');
      useGameStore.getState().eliminateCharacter('c2');
      useGameStore.getState().restoreCharacter('c1');

      expect(useGameStore.getState().myEliminatedIds).toEqual(['c2']);
    });

    it('does nothing for non-eliminated character', () => {
      useGameStore.getState().eliminateCharacter('c1');
      useGameStore.getState().restoreCharacter('c99');

      expect(useGameStore.getState().myEliminatedIds).toEqual(['c1']);
    });

    it('persists removal to sessionStorage', () => {
      useGameStore.getState().eliminateCharacter('c1');
      useGameStore.getState().restoreCharacter('c1');

      const stored = JSON.parse(sessionStorage.getItem('gw_eliminatedIds') || '[]');
      expect(stored).toEqual([]);
    });
  });

  describe('addQuestion', () => {
    it('adds question to game state', () => {
      const gs = makeGameState();
      useGameStore.getState().setGameState(gs);

      const question: Question = {
        id: 'q1', askerId: 'p1', text: 'Is it male?', answer: null,
        isSnipe: false, snipeCharacterId: null, snipeCorrect: null,
      };
      useGameStore.getState().addQuestion(question);

      expect(useGameStore.getState().gameState!.questions).toHaveLength(1);
      expect(useGameStore.getState().gameState!.questions[0].id).toBe('q1');
    });

    it('deduplicates questions by id', () => {
      const gs = makeGameState();
      useGameStore.getState().setGameState(gs);

      const question: Question = {
        id: 'q1', askerId: 'p1', text: 'Is it male?', answer: null,
        isSnipe: false, snipeCharacterId: null, snipeCorrect: null,
      };
      useGameStore.getState().addQuestion(question);
      useGameStore.getState().addQuestion(question);

      expect(useGameStore.getState().gameState!.questions).toHaveLength(1);
    });

    it('does nothing without game state', () => {
      const question: Question = {
        id: 'q1', askerId: 'p1', text: 'Is it male?', answer: null,
        isSnipe: false, snipeCharacterId: null, snipeCorrect: null,
      };
      useGameStore.getState().addQuestion(question);

      expect(useGameStore.getState().gameState).toBeNull();
    });
  });

  describe('updateQuestion', () => {
    it('updates an existing question', () => {
      const gs = makeGameState({
        questions: [{
          id: 'q1', askerId: 'p1', text: 'Is it male?', answer: null,
          isSnipe: false, snipeCharacterId: null, snipeCorrect: null,
        }],
      });
      useGameStore.getState().setGameState(gs);

      const updated: Question = {
        id: 'q1', askerId: 'p1', text: 'Is it male?', answer: 'yes',
        isSnipe: false, snipeCharacterId: null, snipeCorrect: null,
      };
      useGameStore.getState().updateQuestion(updated);

      expect(useGameStore.getState().gameState!.questions[0].answer).toBe('yes');
    });
  });

  describe('setDisplayName', () => {
    it('sets name and persists to localStorage', () => {
      useGameStore.getState().setDisplayName('TestUser');

      expect(useGameStore.getState().displayName).toBe('TestUser');
      expect(localStorage.getItem('gw_displayName')).toBe('TestUser');
    });
  });

  describe('setOpponentDisconnected', () => {
    it('sets opponent disconnected state', () => {
      useGameStore.getState().setOpponentDisconnected(true);
      expect(useGameStore.getState().opponentDisconnected).toBe(true);

      useGameStore.getState().setOpponentDisconnected(false);
      expect(useGameStore.getState().opponentDisconnected).toBe(false);
    });
  });

  describe('reset', () => {
    it('resets all state except displayName', () => {
      useGameStore.getState().setGameState(makeGameState());
      useGameStore.getState().setMyPlayerId('p1');
      useGameStore.getState().setDisplayName('KeepThis');
      useGameStore.getState().eliminateCharacter('c1');
      useGameStore.getState().setOpponentDisconnected(true);

      useGameStore.getState().reset();

      const state = useGameStore.getState();
      expect(state.gameState).toBeNull();
      expect(state.roomCode).toBeNull();
      expect(state.myPlayerId).toBeNull();
      expect(state.myEliminatedIds).toEqual([]);
      expect(state.revealedCharacters).toBeNull();
      expect(state.opponentDisconnected).toBe(false);
      expect(state.displayName).toBe('KeepThis'); // Preserved
    });
  });

  describe('setPhase', () => {
    it('updates phase in game state', () => {
      useGameStore.getState().setGameState(makeGameState({ phase: 'playing' }));
      useGameStore.getState().setPhase('round_over' as any);

      expect(useGameStore.getState().gameState!.phase).toBe('round_over');
    });

    it('does nothing without game state', () => {
      useGameStore.getState().setPhase('playing' as any);
      expect(useGameStore.getState().gameState).toBeNull();
    });
  });

  describe('setCurrentTurn', () => {
    it('updates current turn player', () => {
      useGameStore.getState().setGameState(makeGameState({ currentTurnPlayerId: 'p1' }));
      useGameStore.getState().setCurrentTurn('p2');

      expect(useGameStore.getState().gameState!.currentTurnPlayerId).toBe('p2');
    });
  });

  describe('setWinner', () => {
    it('sets winner id', () => {
      useGameStore.getState().setGameState(makeGameState());
      useGameStore.getState().setWinner('p1');

      expect(useGameStore.getState().gameState!.winnerId).toBe('p1');
    });
  });

  describe('clearRevealedCharacters', () => {
    it('clears revealed characters', () => {
      useGameStore.setState({ revealedCharacters: [{ playerId: 'p1', characterId: 'c1' }] });
      useGameStore.getState().clearRevealedCharacters();

      expect(useGameStore.getState().revealedCharacters).toBeNull();
    });
  });
});
