import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ScreenLayout from '../components/ui/ScreenLayout';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import Modal from '../components/ui/Modal';
import { useGameStore } from '../stores/gameStore';
import { connect, storeSession } from '../services/socket';
import { subscribeToServerEvents } from '../stores/gameStore';
import MuteButton from '../components/ui/MuteButton';
import { playSound } from '../services/audio';
import type { GameState } from '@guess-who/shared';

export default function HomePage() {
  const navigate = useNavigate();
  const { displayName, setDisplayName, setGameState, setMyPlayerId, setRoomCode } = useGameStore();

  const [showJoinInput, setShowJoinInput] = useState(false);
  const [roomCode, setRoomCodeInput] = useState('');
  const [isMatchmaking, setIsMatchmaking] = useState(false);
  const [error, setError] = useState('');
  const [showHowToPlay, setShowHowToPlay] = useState(false);

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
    playSound('buttonTap');
  }

  function handleJoinRoom() {
    if (!canAct || roomCode.trim().length === 0) return;
    const code = roomCode.trim().toUpperCase();
    if (code.length !== 4 || !/^[A-Z0-9]+$/.test(code)) {
      setError('Room code must be 4 characters (letters and numbers).');
      return;
    }
    setError('');
    const socket = setupSocketAndListeners();
    playSound('buttonTap');

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
      playSound('matchFound');
      navigate(`/lobby/${code}`);
      socket.off('room-joined', onJoined);
    };

    const onJoined = ({ gameState }: { gameState: GameState }) => {
      setIsMatchmaking(false);
      setGameState(gameState);
      setMyPlayerId(socket.id!);
      setRoomCode(gameState.roomCode);
      storeSession(gameState.roomCode, displayName);
      playSound('matchFound');
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
      <div className="absolute top-4 right-4">
        <MuteButton />
      </div>
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

        <button
          onClick={() => setShowHowToPlay(true)}
          className="text-neutral-400 text-sm underline underline-offset-2 hover:text-neutral-300 transition-colors cursor-pointer mt-2"
        >
          How to Play
        </button>
      </div>

      <Modal open={showHowToPlay} onClose={() => setShowHowToPlay(false)}>
        <div className="flex flex-col gap-5">
          <h2 className="text-xl font-bold text-white font-heading text-center">How to Play</h2>

          <div className="flex flex-col gap-4">
            <HowToPlayStep
              number={1}
              title="Set Up"
              description="Create a room or join one with a code. Pick a category and board size, then start the game."
            />
            <HowToPlayStep
              number={2}
              title="Pick Your Character"
              description="Both players secretly choose a character from the board. This is who your opponent will try to guess."
            />
            <HowToPlayStep
              number={3}
              title="Take Turns"
              description="On your turn, ask a yes/no question to narrow down who your opponent picked. Use their answer to eliminate characters on your board."
            />
            <HowToPlayStep
              number={4}
              title="Snipe to Win"
              description="When you think you know who it is, go for the snipe — guess their character. Get it right and you win. Get it wrong and you lose your turn."
            />
          </div>

          <div className="bg-white/5 rounded-xl p-3 flex flex-col gap-2">
            <p className="text-neutral-300 text-xs font-medium">Quick Tips</p>
            <ul className="text-neutral-400 text-xs flex flex-col gap-1.5">
              <li>Tap a character to eliminate them. Tap again to bring them back.</li>
              <li>Your eliminations are private — your opponent can't see them.</li>
              <li>In-Person mode lets you ask questions out loud instead of typing.</li>
              <li>Best-of-3 is available for longer sessions.</li>
            </ul>
          </div>

          <Button variant="secondary" onClick={() => setShowHowToPlay(false)} className="w-full">
            Got it
          </Button>
        </div>
      </Modal>
    </ScreenLayout>
  );
}

function HowToPlayStep({ number, title, description }: { number: number; title: string; description: string }) {
  return (
    <div className="flex gap-3">
      <div className="w-7 h-7 rounded-full bg-accent/20 flex items-center justify-center shrink-0 mt-0.5">
        <span className="text-accent text-sm font-bold">{number}</span>
      </div>
      <div>
        <p className="text-white text-sm font-medium">{title}</p>
        <p className="text-neutral-400 text-xs mt-0.5">{description}</p>
      </div>
    </div>
  );
}
