import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ScreenLayout from '../components/ui/ScreenLayout';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { useGameStore } from '../stores/gameStore';
import { connect, storeSession } from '../services/socket';
import { subscribeToServerEvents } from '../stores/gameStore';
import type { GameState } from '@guess-who/shared';

export default function HomePage() {
  const navigate = useNavigate();
  const { displayName, setDisplayName, setGameState, setMyPlayerId, setRoomCode } = useGameStore();

  const [showJoinInput, setShowJoinInput] = useState(false);
  const [roomCode, setRoomCodeInput] = useState('');
  const [isMatchmaking, setIsMatchmaking] = useState(false);
  const [error, setError] = useState('');

  const canAct = displayName.trim().length > 0;

  function setupSocketAndListeners() {
    const socket = connect();
    subscribeToServerEvents();
    return socket;
  }

  function handleCreateRoom() {
    if (!canAct) return;
    setError('');
    const socket = setupSocketAndListeners();

    socket.once('room-created', ({ roomCode: code, gameState }) => {
      setGameState(gameState);
      setMyPlayerId(socket.id!);
      setRoomCode(code);
      storeSession(code, displayName);
      navigate(`/lobby/${code}`);
    });

    socket.once('error', ({ message }) => {
      setError(message);
    });

    socket.emit('create-room', { displayName: displayName.trim() });
  }

  function handleJoinRoom() {
    if (!canAct || roomCode.trim().length === 0) return;
    setError('');
    const socket = setupSocketAndListeners();

    socket.once('room-joined', ({ gameState }: { gameState: GameState }) => {
      setGameState(gameState);
      setMyPlayerId(socket.id!);
      setRoomCode(gameState.roomCode);
      storeSession(gameState.roomCode, displayName);
      navigate(`/lobby/${gameState.roomCode}`);
    });

    socket.once('error', ({ message }) => {
      setError(message);
    });

    socket.emit('join-room', { roomCode: roomCode.trim().toUpperCase(), displayName: displayName.trim() });
  }

  function handleQuickMatch() {
    if (!canAct) return;
    setError('');
    setIsMatchmaking(true);
    const socket = setupSocketAndListeners();

    const onMatched = ({ roomCode: code, gameState }: { roomCode: string; gameState: GameState }) => {
      setIsMatchmaking(false);
      setGameState(gameState);
      setMyPlayerId(socket.id!);
      setRoomCode(code);
      storeSession(code, displayName);
      navigate(`/lobby/${code}`);
      socket.off('room-joined', onJoined);
    };

    const onJoined = ({ gameState }: { gameState: GameState }) => {
      setIsMatchmaking(false);
      setGameState(gameState);
      setMyPlayerId(socket.id!);
      setRoomCode(gameState.roomCode);
      storeSession(gameState.roomCode, displayName);
      navigate(`/lobby/${gameState.roomCode}`);
      socket.off('room-created', onMatched);
    };

    socket.once('room-created', onMatched);
    socket.once('room-joined', onJoined);

    socket.once('error', ({ message }) => {
      setIsMatchmaking(false);
      setError(message);
    });

    socket.emit('join-matchmaking', { displayName: displayName.trim() });
  }

  return (
    <ScreenLayout className="items-center justify-center">
      <div className="w-full max-w-sm flex flex-col items-center gap-8">
        {/* Logo / Title */}
        <div className="text-center">
          <h1 className="text-5xl font-bold text-white font-heading tracking-tight">
            Guess Who<span className="text-accent">?</span>
          </h1>
          <p className="text-neutral-400 mt-2 text-sm">The classic guessing game, online</p>
        </div>

        {/* Name Input */}
        <div className="w-full">
          <Input
            id="display-name"
            placeholder="Enter your name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            maxLength={20}
          />
        </div>

        {/* Error */}
        {error && (
          <p className="text-error text-sm text-center">{error}</p>
        )}

        {/* Matchmaking spinner */}
        {isMatchmaking ? (
          <div className="flex flex-col items-center gap-3">
            <LoadingSpinner size="lg" />
            <p className="text-neutral-300 text-sm">Finding an opponent...</p>
          </div>
        ) : (
          <div className="w-full flex flex-col gap-3">
            {/* Create Room */}
            <Button onClick={handleCreateRoom} disabled={!canAct} className="w-full">
              Create Room
            </Button>

            {/* Join Room */}
            {showJoinInput ? (
              <div className="flex gap-2">
                <Input
                  id="room-code"
                  placeholder="Room code"
                  value={roomCode}
                  onChange={(e) => setRoomCodeInput(e.target.value.toUpperCase())}
                  maxLength={4}
                  className="flex-1 text-center tracking-widest uppercase"
                />
                <Button onClick={handleJoinRoom} disabled={!canAct || roomCode.trim().length === 0}>
                  Join
                </Button>
              </div>
            ) : (
              <Button variant="secondary" onClick={() => setShowJoinInput(true)} disabled={!canAct} className="w-full">
                Join Room
              </Button>
            )}

            {/* Quick Match */}
            <Button variant="ghost" onClick={handleQuickMatch} disabled={!canAct} className="w-full">
              Quick Match
            </Button>
          </div>
        )}
      </div>
    </ScreenLayout>
  );
}
