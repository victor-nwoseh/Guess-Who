import { io, Socket } from 'socket.io-client';
import type { ClientEvents, ServerEvents } from '@guess-who/shared';

type TypedSocket = Socket<ServerEvents, ClientEvents>;

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';

let socket: TypedSocket | null = null;

export function getSocket(): TypedSocket {
  if (!socket) {
    socket = io(SERVER_URL, {
      autoConnect: false,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    }) as TypedSocket;

    // On successful connection, attempt reconnection to previous room
    socket.on('connect', () => {
      const oldSocketId = sessionStorage.getItem('gw_socketId');
      const roomCode = sessionStorage.getItem('gw_roomCode');
      const displayName = sessionStorage.getItem('gw_displayName');

      // Store new socket ID
      if (socket?.id) {
        sessionStorage.setItem('gw_socketId', socket.id);
      }

      // If we had a previous session, attempt to re-join
      if (oldSocketId && roomCode && displayName && socket?.id !== oldSocketId) {
        socket?.emit('join-room', { roomCode, displayName });
      }
    });
  }

  return socket;
}

export function connect(): TypedSocket {
  const s = getSocket();
  if (!s.connected) {
    s.connect();
  }
  return s;
}

export function disconnect(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

// Session storage helpers
export function storeSession(roomCode: string, displayName: string): void {
  if (socket?.id) {
    sessionStorage.setItem('gw_socketId', socket.id);
  }
  sessionStorage.setItem('gw_roomCode', roomCode);
  sessionStorage.setItem('gw_displayName', displayName);
}

export function clearSession(): void {
  sessionStorage.removeItem('gw_socketId');
  sessionStorage.removeItem('gw_roomCode');
  sessionStorage.removeItem('gw_displayName');
}

export function getStoredSession(): { socketId: string | null; roomCode: string | null; displayName: string | null } {
  return {
    socketId: sessionStorage.getItem('gw_socketId'),
    roomCode: sessionStorage.getItem('gw_roomCode'),
    displayName: sessionStorage.getItem('gw_displayName'),
  };
}
