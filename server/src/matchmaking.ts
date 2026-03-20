interface QueueEntry {
  socketId: string;
  displayName: string;
}

const queue: QueueEntry[] = [];

export function addToQueue(socketId: string, displayName: string): QueueEntry | null {
  // Check if already in queue
  if (queue.some(e => e.socketId === socketId)) return null;

  queue.push({ socketId, displayName });

  // If two players waiting, pair them
  if (queue.length >= 2) {
    const player1 = queue.shift()!;
    const player2 = queue.shift()!;
    // Return the other player to the caller
    // Caller is player2 (just added), so return player1
    if (player2.socketId === socketId) {
      return player1;
    }
    return player2;
  }

  return null;
}

export function removeFromQueue(socketId: string): void {
  const index = queue.findIndex(e => e.socketId === socketId);
  if (index !== -1) {
    queue.splice(index, 1);
  }
}

export function getQueueSize(): number {
  return queue.length;
}
