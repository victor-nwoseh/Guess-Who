import { useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Avatar from './Avatar';
import type { Character } from '@guess-who/shared';

export type CardState = 'normal' | 'eliminated' | 'selected' | 'guessing';

interface CharacterCardProps {
  character: Character;
  state?: CardState;
  size?: 'sm' | 'md';
  onTap?: () => void;
  onLongPress?: () => void;
}

const LONG_PRESS_MS = 500;

export default function CharacterCard({
  character,
  state = 'normal',
  size = 'md',
  onTap,
  onLongPress,
}: CharacterCardProps) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didLongPress = useRef(false);

  const imgSize = size === 'sm' ? 'w-14 h-14' : 'w-16 h-16';
  const avatarPx = size === 'sm' ? 56 : 64;
  const isEliminated = state === 'eliminated';
  const isSelected = state === 'selected';
  const isGuessing = state === 'guessing';
  const isMutualFriend = !character.imageUrl;

  const handlePointerDown = useCallback(() => {
    didLongPress.current = false;
    if (!onLongPress) return;
    timerRef.current = setTimeout(() => {
      didLongPress.current = true;
      onLongPress();
    }, LONG_PRESS_MS);
  }, [onLongPress]);

  const handlePointerUp = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (!didLongPress.current) {
      onTap?.();
    }
  }, [onTap]);

  const handlePointerLeave = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  return (
    <motion.button
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerLeave}
      whileTap={{ scale: 0.95 }}
      aria-label={`${character.name}${isEliminated ? ' (eliminated)' : ''}${isSelected ? ' (selected)' : ''}`}
      aria-pressed={isSelected || undefined}
      className={`relative flex flex-col items-center gap-1 p-2 rounded-xl cursor-pointer transition-all select-none
        ${isSelected
          ? 'bg-accent/20 border-2 border-accent ring-2 ring-accent/50'
          : 'bg-white/5 border-2 border-transparent'
        }
        ${!isSelected && !isEliminated ? 'hover:bg-white/10' : ''}
      `}
    >
      <AnimatePresence mode="wait">
        {isEliminated ? (
          <motion.div
            key="eliminated"
            initial={{ rotateY: 0 }}
            animate={{ rotateY: 180 }}
            exit={{ rotateY: 0 }}
            transition={{ duration: 0.3 }}
            className={`${imgSize} rounded-lg bg-white/5 flex items-center justify-center`}
            style={{ backfaceVisibility: 'hidden' }}
          >
            <span
              className="text-neutral-600 text-2xl"
              style={{ transform: 'rotateY(180deg)' }}
            >
              ✕
            </span>
          </motion.div>
        ) : (
          <motion.div
            key="active"
            initial={{ rotateY: 180 }}
            animate={{ rotateY: 0 }}
            exit={{ rotateY: 180 }}
            transition={{ duration: 0.3 }}
            style={{ backfaceVisibility: 'hidden' }}
          >
            {isMutualFriend ? (
              <Avatar
                name=""
                gender={character.gender}
                size={avatarPx}
              />
            ) : (
              <picture>
                <source srcSet={character.imageUrl!.replace('.jpg', '.webp')} type="image/webp" />
                <img
                  src={character.imageUrl}
                  alt={character.name}
                  className={`${imgSize} rounded-lg object-cover`}
                  loading="lazy"
                />
              </picture>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Guessing pulse ring */}
      {isGuessing && (
        <motion.div
          className={`absolute top-2 left-2 right-2 ${imgSize} rounded-lg border-2 border-accent`}
          animate={{ opacity: [1, 0.3, 1] }}
          transition={{ duration: 1.2, repeat: Infinity }}
        />
      )}

      <span
        className={`text-xs text-center leading-tight transition-colors
          ${isEliminated ? 'text-neutral-600 line-through' : 'text-white'}`}
      >
        {character.name}
      </span>
    </motion.button>
  );
}
