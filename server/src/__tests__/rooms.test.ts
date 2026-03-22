import { describe, it, expect, beforeEach } from 'vitest';
import { createRoom, joinRoom, getRoom, deleteRoom, getRoomByPlayerId, updatePlayerIdInRoom } from '../rooms';
import { GamePhase, GameMode } from '@guess-who/shared';

describe('rooms', () => {
  // Clean up after each test by deleting created rooms
  const createdRooms: string[] = [];

  function createAndTrack(hostId: string, name: string) {
    const room = createRoom(hostId, name);
    createdRooms.push(room.roomCode);
    return room;
  }

  beforeEach(() => {
    for (const code of createdRooms) {
      deleteRoom(code);
    }
    createdRooms.length = 0;
  });

  describe('createRoom', () => {
    it('creates a room with correct initial state', () => {
      const room = createAndTrack('host-1', 'Alice');

      expect(room.roomCode).toHaveLength(4);
      expect(room.phase).toBe(GamePhase.LOBBY);
      expect(room.mode).toBe(GameMode.REMOTE);
      expect(room.category).toBeNull();
      expect(room.boardSize).toBe(24);
      expect(room.players).toHaveLength(1);
      expect(room.players[0].displayName).toBe('Alice');
      expect(room.players[0].isHost).toBe(true);
      expect(room.players[0].id).toBe('host-1');
      expect(room.players[0].wins).toBe(0);
      expect(room.players[0].seriesWins).toBe(0);
      expect(room.currentTurnPlayerId).toBeNull();
      expect(room.questions).toEqual([]);
      expect(room.roundNumber).toBe(1);
      expect(room.bestOf).toBe(1);
      expect(room.winnerId).toBeNull();
    });

    it('generates unique room codes', () => {
      const codes = new Set<string>();
      for (let i = 0; i < 20; i++) {
        const room = createAndTrack(`host-${i}`, `Player${i}`);
        codes.add(room.roomCode);
      }
      expect(codes.size).toBe(20);
    });

    it('room code is 4 characters alphanumeric', () => {
      const room = createAndTrack('host-1', 'Alice');
      expect(room.roomCode).toMatch(/^[A-Z0-9]{4}$/);
    });
  });

  describe('joinRoom', () => {
    it('allows a second player to join', () => {
      const room = createAndTrack('host-1', 'Alice');
      const updated = joinRoom(room.roomCode, 'player-2', 'Bob');

      expect(updated).not.toBeNull();
      expect(updated!.players).toHaveLength(2);
      expect(updated!.players[1].displayName).toBe('Bob');
      expect(updated!.players[1].isHost).toBe(false);
      expect(updated!.players[1].id).toBe('player-2');
    });

    it('returns null for non-existent room', () => {
      const result = joinRoom('ZZZZ', 'player-1', 'Alice');
      expect(result).toBeNull();
    });

    it('returns null when room is full', () => {
      const room = createAndTrack('host-1', 'Alice');
      joinRoom(room.roomCode, 'player-2', 'Bob');
      const result = joinRoom(room.roomCode, 'player-3', 'Charlie');
      expect(result).toBeNull();
    });

    it('returns null when room is not in lobby phase', () => {
      const room = createAndTrack('host-1', 'Alice');
      // Manually change phase
      room.phase = GamePhase.PLAYING;
      const result = joinRoom(room.roomCode, 'player-2', 'Bob');
      expect(result).toBeNull();
    });
  });

  describe('getRoom', () => {
    it('returns the room if it exists', () => {
      const room = createAndTrack('host-1', 'Alice');
      const found = getRoom(room.roomCode);
      expect(found).not.toBeNull();
      expect(found!.roomCode).toBe(room.roomCode);
    });

    it('returns null for non-existent room', () => {
      expect(getRoom('XXXX')).toBeNull();
    });
  });

  describe('deleteRoom', () => {
    it('removes the room', () => {
      const room = createAndTrack('host-1', 'Alice');
      deleteRoom(room.roomCode);
      expect(getRoom(room.roomCode)).toBeNull();
    });
  });

  describe('getRoomByPlayerId', () => {
    it('finds room by host id', () => {
      const room = createAndTrack('host-1', 'Alice');
      const found = getRoomByPlayerId('host-1');
      expect(found).not.toBeNull();
      expect(found!.roomCode).toBe(room.roomCode);
    });

    it('finds room by joined player id', () => {
      const room = createAndTrack('host-1', 'Alice');
      joinRoom(room.roomCode, 'player-2', 'Bob');
      const found = getRoomByPlayerId('player-2');
      expect(found).not.toBeNull();
      expect(found!.roomCode).toBe(room.roomCode);
    });

    it('returns null for unknown player', () => {
      expect(getRoomByPlayerId('unknown')).toBeNull();
    });
  });

  describe('updatePlayerIdInRoom', () => {
    it('updates player id successfully', () => {
      const room = createAndTrack('host-1', 'Alice');
      const result = updatePlayerIdInRoom(room.roomCode, 'host-1', 'host-new');
      expect(result).toBe(true);
      expect(room.players[0].id).toBe('host-new');
    });

    it('updates currentTurnPlayerId if it matches', () => {
      const room = createAndTrack('host-1', 'Alice');
      room.currentTurnPlayerId = 'host-1';
      updatePlayerIdInRoom(room.roomCode, 'host-1', 'host-new');
      expect(room.currentTurnPlayerId).toBe('host-new');
    });

    it('updates question askerIds', () => {
      const room = createAndTrack('host-1', 'Alice');
      room.questions.push({
        id: 'q1',
        askerId: 'host-1',
        text: 'Is it male?',
        answer: null,
        isSnipe: false,
        snipeCharacterId: null,
        snipeCorrect: null,
      });
      updatePlayerIdInRoom(room.roomCode, 'host-1', 'host-new');
      expect(room.questions[0].askerId).toBe('host-new');
    });

    it('returns false for non-existent room', () => {
      expect(updatePlayerIdInRoom('ZZZZ', 'a', 'b')).toBe(false);
    });

    it('returns false for non-existent player', () => {
      const room = createAndTrack('host-1', 'Alice');
      expect(updatePlayerIdInRoom(room.roomCode, 'unknown', 'new')).toBe(false);
    });
  });
});
