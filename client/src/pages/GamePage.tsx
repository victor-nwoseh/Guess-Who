import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import ScreenLayout from '../components/ui/ScreenLayout';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { useGameStore } from '../stores/gameStore';
import { getSocket } from '../services/socket';
import { GamePhase } from '@guess-who/shared';

export default function GamePage() {
  const navigate = useNavigate();
  const { gameState, myPlayerId, myEliminatedIds, eliminateCharacter, restoreCharacter } = useGameStore();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  const phase = gameState?.phase;
  const characters = gameState?.characters ?? [];
  const me = gameState?.players.find(p => p.id === myPlayerId);

  // Navigate to results when game is over
  useEffect(() => {
    if (phase === GamePhase.GAME_OVER || phase === GamePhase.ROUND_OVER) {
      navigate(`/results/${gameState?.roomCode}`);
    }
  }, [phase, gameState?.roomCode, navigate]);

  // If no game state, redirect home
  useEffect(() => {
    if (!gameState) {
      navigate('/');
    }
  }, [gameState, navigate]);

  function handleConfirmSelection() {
    if (!selectedId) return;
    const socket = getSocket();
    socket.emit('select-character', { characterId: selectedId });
    setConfirmed(true);
  }

  if (!gameState) return null;

  // CHARACTER_SELECT phase
  if (phase === GamePhase.CHARACTER_SELECT) {
    return (
      <ScreenLayout>
        <div className="flex flex-col gap-4 flex-1">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-white font-heading">
              Choose Your Secret Character
            </h1>
            <p className="text-neutral-400 text-sm mt-1">
              Your opponent will try to guess who you picked
            </p>
          </div>

          {confirmed ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-4">
              <LoadingSpinner size="lg" />
              <p className="text-neutral-300">Waiting for opponent to choose...</p>
              {selectedId && (
                <Badge variant="accent">
                  Your pick: {characters.find(c => c.id === selectedId)?.name}
                </Badge>
              )}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 overflow-y-auto flex-1">
                {characters.map(character => (
                  <motion.button
                    key={character.id}
                    onClick={() => setSelectedId(character.id)}
                    whileTap={{ scale: 0.95 }}
                    className={`flex flex-col items-center gap-1 p-2 rounded-xl cursor-pointer transition-all
                      ${selectedId === character.id
                        ? 'bg-accent/20 border-2 border-accent ring-2 ring-accent/50'
                        : 'bg-white/5 border-2 border-transparent hover:bg-white/10'
                      }`}
                  >
                    {character.imageUrl ? (
                      <img
                        src={character.imageUrl}
                        alt={character.name}
                        className="w-16 h-16 rounded-lg object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className={`w-16 h-16 rounded-lg flex items-center justify-center text-2xl
                        ${character.gender === 'female' ? 'bg-pink-500/20' : 'bg-blue-500/20'}`}>
                        {character.gender === 'female' ? '♀' : '♂'}
                      </div>
                    )}
                    <span className="text-white text-xs text-center leading-tight">
                      {character.name}
                    </span>
                  </motion.button>
                ))}
              </div>

              <Button
                onClick={handleConfirmSelection}
                disabled={!selectedId}
                className="w-full"
              >
                {selectedId
                  ? `Confirm: ${characters.find(c => c.id === selectedId)?.name}`
                  : 'Select a character'}
              </Button>
            </>
          )}
        </div>
      </ScreenLayout>
    );
  }

  // PLAYING phase
  const isMyTurn = gameState.currentTurnPlayerId === myPlayerId;
  const opponent = gameState.players.find(p => p.id !== myPlayerId);
  const myCharacter = characters.find(c => c.id === (me?.selectedCharacterId ?? selectedId));

  function handleToggleEliminate(characterId: string) {
    if (myEliminatedIds.includes(characterId)) {
      restoreCharacter(characterId);
    } else {
      eliminateCharacter(characterId);
    }
  }

  return (
    <ScreenLayout>
      <div className="flex flex-col gap-2 flex-1 min-h-0">
        {/* Top Bar */}
        <div className="flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-white font-medium text-sm">{opponent?.displayName}</span>
            <Badge variant="default">{opponent?.wins ?? 0} wins</Badge>
          </div>
          <Badge variant={isMyTurn ? 'accent' : 'default'}>
            {isMyTurn ? 'Your Turn' : "Opponent's Turn"}
          </Badge>
          {myCharacter && (
            <div className="flex items-center gap-1">
              {myCharacter.imageUrl ? (
                <img src={myCharacter.imageUrl} alt="" className="w-6 h-6 rounded" />
              ) : (
                <div className={`w-6 h-6 rounded flex items-center justify-center text-xs
                  ${myCharacter.gender === 'female' ? 'bg-pink-500/20' : 'bg-blue-500/20'}`}>
                  {myCharacter.gender === 'female' ? '♀' : '♂'}
                </div>
              )}
              <span className="text-neutral-400 text-xs">{myCharacter.name}</span>
            </div>
          )}
        </div>

        {/* Character Grid */}
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 overflow-y-auto flex-1 min-h-0 content-start">
          {characters.map(character => {
            const isEliminated = myEliminatedIds.includes(character.id);
            return (
              <motion.button
                key={character.id}
                onClick={() => handleToggleEliminate(character.id)}
                whileTap={{ scale: 0.95 }}
                className="relative flex flex-col items-center gap-1 p-2 rounded-xl cursor-pointer transition-colors bg-white/5"
              >
                <AnimatePresence mode="wait">
                  {isEliminated ? (
                    <motion.div
                      key="eliminated"
                      initial={{ rotateY: 0 }}
                      animate={{ rotateY: 180 }}
                      exit={{ rotateY: 0 }}
                      transition={{ duration: 0.3 }}
                      className="w-16 h-16 rounded-lg bg-white/5 flex items-center justify-center"
                      style={{ backfaceVisibility: 'hidden' }}
                    >
                      <span className="text-neutral-600 text-2xl" style={{ transform: 'rotateY(180deg)' }}>✕</span>
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
                      {character.imageUrl ? (
                        <img
                          src={character.imageUrl}
                          alt={character.name}
                          className="w-16 h-16 rounded-lg object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className={`w-16 h-16 rounded-lg flex items-center justify-center text-2xl
                          ${character.gender === 'female' ? 'bg-pink-500/20' : 'bg-blue-500/20'}`}>
                          {character.gender === 'female' ? '♀' : '♂'}
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
                <span className={`text-xs text-center leading-tight transition-colors
                  ${isEliminated ? 'text-neutral-600 line-through' : 'text-white'}`}>
                  {character.name}
                </span>
              </motion.button>
            );
          })}
        </div>

        {/* Bottom Action Area — built in Steps 3.6/3.7 */}
        <div className="shrink-0 pt-2 border-t border-white/10">
          <p className="text-neutral-500 text-sm text-center py-2">
            {isMyTurn ? 'Your turn — action area coming soon' : "Waiting for opponent..."}
          </p>
        </div>
      </div>
    </ScreenLayout>
  );
}
