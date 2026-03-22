import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import confetti from 'canvas-confetti';
import ScreenLayout from '../components/ui/ScreenLayout';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import MuteButton from '../components/ui/MuteButton';
import DisconnectModal from '../components/game/DisconnectModal';
import { useGameStore } from '../stores/gameStore';
import { getSocket, disconnect, clearSession } from '../services/socket';
import { playSound } from '../services/audio';

type RematchState = 'idle' | 'requesting' | 'received' | 'declined';

export default function ResultsPage() {
  const navigate = useNavigate();
  const { gameState, myPlayerId, reset } = useGameStore();
  const [rematchState, setRematchState] = useState<RematchState>('idle');

  const players = gameState?.players ?? [];
  const me = players.find(p => p.id === myPlayerId);
  const opponent = players.find(p => p.id !== myPlayerId);
  const winnerId = gameState?.winnerId;
  const iWon = winnerId === myPlayerId;
  const winner = players.find(p => p.id === winnerId);
  const isBestOf3 = (gameState?.bestOf ?? 1) === 3;

  // Fire confetti for the winner
  useEffect(() => {
    if (iWon) {
      const end = Date.now() + 2000;
      const frame = () => {
        confetti({
          particleCount: 3,
          angle: 60,
          spread: 55,
          origin: { x: 0, y: 0.7 },
          colors: ['#F5A623', '#FFFFFF', '#8B5CF6'],
        });
        confetti({
          particleCount: 3,
          angle: 120,
          spread: 55,
          origin: { x: 1, y: 0.7 },
          colors: ['#F5A623', '#FFFFFF', '#8B5CF6'],
        });
        if (Date.now() < end) requestAnimationFrame(frame);
      };
      frame();
    }
  }, [iWon]);

  // Listen for rematch events
  useEffect(() => {
    const socket = getSocket();

    const onRematchRequested = () => {
      setRematchState('received');
      playSound('questionReceived');
    };

    const onRematchDeclined = () => {
      setRematchState('declined');
      setTimeout(() => setRematchState('idle'), 3000);
    };

    const onRematchStarted = () => {
      // Store handles game state update; navigate to game
      navigate(`/game/${gameState?.roomCode}`);
    };

    socket.on('rematch-requested', onRematchRequested);
    socket.on('rematch-declined', onRematchDeclined);
    socket.on('rematch-started', onRematchStarted);

    return () => {
      socket.off('rematch-requested', onRematchRequested);
      socket.off('rematch-declined', onRematchDeclined);
      socket.off('rematch-started', onRematchStarted);
    };
  }, [navigate, gameState?.roomCode]);

  const handleRematch = useCallback(() => {
    const socket = getSocket();
    socket.emit('request-rematch');
    setRematchState('requesting');
    playSound('buttonTap');
  }, []);

  const handleAcceptRematch = useCallback(() => {
    const socket = getSocket();
    socket.emit('accept-rematch');
    playSound('buttonTap');
  }, []);

  const handleDeclineRematch = useCallback(() => {
    const socket = getSocket();
    socket.emit('decline-rematch');
    setRematchState('idle');
    playSound('buttonTap');
  }, []);

  const handleHome = useCallback(() => {
    playSound('buttonTap');
    disconnect();
    clearSession();
    sessionStorage.removeItem('gw_eliminatedIds');
    sessionStorage.removeItem('gw_selectedCharId');
    sessionStorage.removeItem('gw_questions');
    reset();
    navigate('/');
  }, [navigate, reset]);

  // Redirect home if no game state
  useEffect(() => {
    if (!gameState) {
      navigate('/');
    }
  }, [gameState, navigate]);

  if (!gameState) return null;

  return (
    <ScreenLayout className="items-center justify-center">
      <div className="absolute top-4 right-4">
        <MuteButton />
      </div>

      <div className="w-full max-w-sm flex flex-col items-center gap-6">
        {/* Winner announcement */}
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', damping: 15, stiffness: 200 }}
          className="text-center"
        >
          <p className={`text-4xl font-bold font-heading ${iWon ? 'text-accent' : 'text-red-400'}`}>
            {iWon ? 'Victory!' : 'Defeat'}
          </p>
          <p className="text-neutral-400 text-sm mt-1">
            {winner?.displayName} wins the match
          </p>
        </motion.div>

        {/* Series score (best-of-3 only) */}
        {isBestOf3 && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="flex flex-col items-center gap-1"
          >
            <p className="text-neutral-400 text-xs uppercase tracking-wide">Series Score</p>
            <div className="flex items-center gap-4">
              <div className="flex flex-col items-center gap-0.5">
                <span className={`text-2xl font-bold font-heading ${
                  me?.id === winnerId ? 'text-accent' : 'text-white'
                }`}>
                  {me?.wins ?? 0}
                </span>
                <span className="text-neutral-400 text-xs">{me?.displayName}</span>
              </div>
              <span className="text-neutral-500 text-lg font-bold">—</span>
              <div className="flex flex-col items-center gap-0.5">
                <span className={`text-2xl font-bold font-heading ${
                  opponent?.id === winnerId ? 'text-accent' : 'text-white'
                }`}>
                  {opponent?.wins ?? 0}
                </span>
                <span className="text-neutral-400 text-xs">{opponent?.displayName}</span>
              </div>
            </div>
          </motion.div>
        )}

        {/* Overall score */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: isBestOf3 ? 0.3 : 0.2 }}
          className="flex flex-col items-center gap-1"
        >
          {isBestOf3 && (
            <p className="text-neutral-400 text-xs uppercase tracking-wide">Overall</p>
          )}
          <div className="flex items-center gap-6">
            <div className="flex flex-col items-center gap-1">
              <span className={`text-3xl font-bold font-heading ${
                me?.id === winnerId ? 'text-accent' : 'text-white'
              }`}>
                {me?.seriesWins ?? 0}
              </span>
              <span className="text-neutral-400 text-sm">{me?.displayName}</span>
              {me?.id === winnerId && <Badge variant="accent">Winner</Badge>}
            </div>

            <span className="text-neutral-500 text-2xl font-bold">—</span>

            <div className="flex flex-col items-center gap-1">
              <span className={`text-3xl font-bold font-heading ${
                opponent?.id === winnerId ? 'text-accent' : 'text-white'
              }`}>
                {opponent?.seriesWins ?? 0}
              </span>
              <span className="text-neutral-400 text-sm">{opponent?.displayName}</span>
              {opponent?.id === winnerId && <Badge variant="accent">Winner</Badge>}
            </div>
          </div>
        </motion.div>

        {/* Action buttons */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.35 }}
          className="w-full flex flex-col gap-3"
        >
          {rematchState === 'requesting' ? (
            <Button disabled className="w-full">
              Waiting for opponent...
            </Button>
          ) : rematchState === 'declined' ? (
            <Button disabled className="w-full">
              Rematch declined
            </Button>
          ) : (
            <Button onClick={handleRematch} className="w-full">
              Rematch (Same Category)
            </Button>
          )}
          <Button variant="secondary" onClick={handleHome} className="w-full">
            Home
          </Button>
        </motion.div>
      </div>

      {/* Rematch request modal */}
      <Modal open={rematchState === 'received'} onClose={handleDeclineRematch}>
        <div className="flex flex-col items-center gap-4">
          <p className="text-white text-lg font-bold font-heading">
            {opponent?.displayName} wants a rematch!
          </p>
          <div className="flex gap-3 w-full">
            <Button onClick={handleAcceptRematch} className="flex-1">
              Accept
            </Button>
            <Button variant="secondary" onClick={handleDeclineRematch} className="flex-1">
              Decline
            </Button>
          </div>
        </div>
      </Modal>

      <DisconnectModal />
    </ScreenLayout>
  );
}
