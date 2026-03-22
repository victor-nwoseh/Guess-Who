import { describe, it, expect, beforeEach } from 'vitest';
import { addToQueue, removeFromQueue, getQueueSize } from '../matchmaking';

describe('matchmaking', () => {
  // Drain the queue before each test
  beforeEach(() => {
    // Remove any lingering entries by checking size
    while (getQueueSize() > 0) {
      // We can't easily drain without knowing IDs, so add two dummy entries to pair them off
      addToQueue('drain-a', 'a');
      addToQueue('drain-b', 'b');
    }
  });

  describe('addToQueue', () => {
    it('returns null when only one player is waiting', () => {
      const result = addToQueue('player-1', 'Alice');
      expect(result).toBeNull();
      expect(getQueueSize()).toBe(1);
      // Clean up
      removeFromQueue('player-1');
    });

    it('pairs two players and returns the match', () => {
      addToQueue('player-1', 'Alice');
      const match = addToQueue('player-2', 'Bob');

      expect(match).not.toBeNull();
      expect(match!.socketId).toBe('player-1');
      expect(match!.displayName).toBe('Alice');
      expect(getQueueSize()).toBe(0);
    });

    it('prevents duplicate queue entries', () => {
      addToQueue('player-1', 'Alice');
      const duplicate = addToQueue('player-1', 'Alice');
      expect(duplicate).toBeNull();
      expect(getQueueSize()).toBe(1);
      removeFromQueue('player-1');
    });

    it('pairs in FIFO order', () => {
      addToQueue('p1', 'Alice');
      addToQueue('p2', 'Bob'); // This pairs with p1

      // Queue should be empty now
      expect(getQueueSize()).toBe(0);

      // Add two more
      addToQueue('p3', 'Charlie');
      const match = addToQueue('p4', 'Diana');
      expect(match).not.toBeNull();
      expect(match!.socketId).toBe('p3');
    });
  });

  describe('removeFromQueue', () => {
    it('removes a player from the queue', () => {
      addToQueue('player-1', 'Alice');
      expect(getQueueSize()).toBe(1);
      removeFromQueue('player-1');
      expect(getQueueSize()).toBe(0);
    });

    it('does nothing for non-existent player', () => {
      removeFromQueue('unknown');
      expect(getQueueSize()).toBe(0);
    });

    it('prevents pairing after removal', () => {
      addToQueue('player-1', 'Alice');
      removeFromQueue('player-1');
      const result = addToQueue('player-2', 'Bob');
      expect(result).toBeNull();
      expect(getQueueSize()).toBe(1);
      removeFromQueue('player-2');
    });
  });

  describe('getQueueSize', () => {
    it('returns 0 for empty queue', () => {
      expect(getQueueSize()).toBe(0);
    });

    it('tracks queue size correctly', () => {
      addToQueue('p1', 'A');
      expect(getQueueSize()).toBe(1);
      addToQueue('p2', 'B'); // pairs with p1
      expect(getQueueSize()).toBe(0);
    });
  });
});
