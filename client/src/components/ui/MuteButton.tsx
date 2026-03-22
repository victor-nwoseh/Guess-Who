import { useState } from 'react';
import { isMuted, setMuted, preloadSounds } from '../../services/audio';

export default function MuteButton() {
  const [muted, setMutedState] = useState(isMuted);

  function toggle() {
    preloadSounds();
    const next = !muted;
    setMuted(next);
    setMutedState(next);
  }

  return (
    <button
      onClick={toggle}
      className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"
      aria-label={muted ? 'Unmute' : 'Mute'}
    >
      <span className="text-lg">{muted ? '🔇' : '🔊'}</span>
    </button>
  );
}
