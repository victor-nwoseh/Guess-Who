import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { useGameStore } from '../../stores/gameStore';
import { disconnect, clearSession } from '../../services/socket';
import { playSound } from '../../services/audio';

const TIMEOUT_SECONDS = 30;

export default function DisconnectModal() {
  const navigate = useNavigate();
  const { opponentDisconnected, reset } = useGameStore();
  const [secondsLeft, setSecondsLeft] = useState(TIMEOUT_SECONDS);

  // Reset timer when modal opens
  useEffect(() => {
    if (opponentDisconnected) {
      setSecondsLeft(TIMEOUT_SECONDS);
    }
  }, [opponentDisconnected]);

  // Countdown
  useEffect(() => {
    if (!opponentDisconnected) return;

    const interval = setInterval(() => {
      setSecondsLeft(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [opponentDisconnected]);

  // Auto-leave when timer hits 0
  useEffect(() => {
    if (opponentDisconnected && secondsLeft === 0) {
      handleLeave();
    }
  }, [secondsLeft, opponentDisconnected]);

  const handleLeave = useCallback(() => {
    playSound('buttonTap');
    disconnect();
    clearSession();
    sessionStorage.removeItem('gw_eliminatedIds');
    sessionStorage.removeItem('gw_selectedCharId');
    sessionStorage.removeItem('gw_questions');
    reset();
    navigate('/');
  }, [navigate, reset]);

  return (
    <Modal open={opponentDisconnected} onClose={() => {}} ariaLabel="Opponent disconnected">
      <div className="flex flex-col items-center gap-4">
        <p className="text-white text-lg font-bold font-heading">
          Opponent Disconnected
        </p>
        <p className="text-neutral-400 text-sm text-center">
          Waiting for them to reconnect...
        </p>
        <div className="text-accent text-3xl font-bold font-heading">
          {secondsLeft}s
        </div>
        <div className="flex gap-3 w-full">
          <Button variant="secondary" onClick={handleLeave} className="flex-1">
            Leave
          </Button>
        </div>
      </div>
    </Modal>
  );
}
