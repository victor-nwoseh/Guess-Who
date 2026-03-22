import { motion } from 'framer-motion';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import Avatar from './Avatar';
import type { Player, Character } from '@guess-who/shared';

interface RoundOverModalProps {
  open: boolean;
  winnerId: string;
  myPlayerId: string;
  players: Player[];
  characters: Character[];
  revealedCharacters: { playerId: string; characterId: string }[];
  isGameOver: boolean;
  onContinue: () => void;
}

export default function RoundOverModal({
  open,
  winnerId,
  myPlayerId,
  players,
  characters,
  revealedCharacters,
  isGameOver,
  onContinue,
}: RoundOverModalProps) {
  const iWon = winnerId === myPlayerId;
  const winner = players.find(p => p.id === winnerId);
  const me = players.find(p => p.id === myPlayerId);
  const opponent = players.find(p => p.id !== myPlayerId);

  function getCharacter(playerId: string): Character | undefined {
    const revealed = revealedCharacters.find(r => r.playerId === playerId);
    if (!revealed) return undefined;
    return characters.find(c => c.id === revealed.characterId);
  }

  const myChar = getCharacter(myPlayerId);
  const opponentChar = opponent ? getCharacter(opponent.id) : undefined;

  return (
    <Modal open={open} onClose={() => {}}>
      <div className="flex flex-col items-center gap-5">
        {/* Winner announcement */}
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', damping: 15, stiffness: 200 }}
          className="text-center"
        >
          <p className={`text-3xl font-bold font-heading ${iWon ? 'text-accent' : 'text-red-400'}`}>
            {iWon ? 'You Win!' : 'You Lose!'}
          </p>
          <p className="text-neutral-400 text-sm mt-1">
            {winner?.displayName} guessed correctly
          </p>
        </motion.div>

        {/* Revealed characters */}
        <div className="flex items-center gap-6 w-full justify-center">
          {/* My character */}
          <div className="flex flex-col items-center gap-1.5">
            <p className="text-neutral-400 text-xs">Your pick</p>
            {myChar?.imageUrl ? (
              <img src={myChar.imageUrl} alt={myChar.name} className="w-16 h-16 rounded-xl object-cover" />
            ) : myChar ? (
              <Avatar name="" gender={myChar.gender} size={64} />
            ) : (
              <div className="w-16 h-16 rounded-xl bg-white/10" />
            )}
            <p className="text-white text-xs font-medium">{myChar?.name ?? '?'}</p>
          </div>

          <span className="text-neutral-500 text-lg font-bold">vs</span>

          {/* Opponent's character */}
          <div className="flex flex-col items-center gap-1.5">
            <p className="text-neutral-400 text-xs">{opponent?.displayName}'s pick</p>
            {opponentChar?.imageUrl ? (
              <img src={opponentChar.imageUrl} alt={opponentChar.name} className="w-16 h-16 rounded-xl object-cover" />
            ) : opponentChar ? (
              <Avatar name="" gender={opponentChar.gender} size={64} />
            ) : (
              <div className="w-16 h-16 rounded-xl bg-white/10" />
            )}
            <p className="text-white text-xs font-medium">{opponentChar?.name ?? '?'}</p>
          </div>
        </div>

        {/* Scores */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="text-white text-sm font-medium">{me?.displayName}</span>
            <Badge variant="accent">{me?.wins ?? 0}</Badge>
          </div>
          <span className="text-neutral-500 text-xs">—</span>
          <div className="flex items-center gap-1.5">
            <span className="text-neutral-300 text-sm font-medium">{opponent?.displayName}</span>
            <Badge variant="default">{opponent?.wins ?? 0}</Badge>
          </div>
        </div>

        {/* Continue button */}
        <Button onClick={onContinue} className="w-full">
          {isGameOver ? 'See Results' : 'Next Round'}
        </Button>
      </div>
    </Modal>
  );
}
