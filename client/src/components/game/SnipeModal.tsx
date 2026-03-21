import { useState } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import type { Character } from '@guess-who/shared';

interface SnipeModalProps {
  open: boolean;
  onClose: () => void;
  characters: Character[];
  eliminatedIds: string[];
  onConfirm: (characterId: string) => void;
}

export default function SnipeModal({
  open,
  onClose,
  characters,
  eliminatedIds,
  onConfirm,
}: SnipeModalProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  const selectedCharacter = characters.find(c => c.id === selectedId);

  function handleSelect(id: string) {
    setSelectedId(id);
    setConfirming(true);
  }

  function handleConfirm() {
    if (!selectedId) return;
    onConfirm(selectedId);
    setSelectedId(null);
    setConfirming(false);
  }

  function handleBack() {
    setSelectedId(null);
    setConfirming(false);
  }

  function handleClose() {
    setSelectedId(null);
    setConfirming(false);
    onClose();
  }

  return (
    <Modal open={open} onClose={handleClose}>
      {confirming && selectedCharacter ? (
        <div className="flex flex-col items-center gap-4">
          <h2 className="text-lg font-bold text-white font-heading">Confirm Guess</h2>
          <div className="flex flex-col items-center gap-2">
            {selectedCharacter.imageUrl ? (
              <img
                src={selectedCharacter.imageUrl}
                alt={selectedCharacter.name}
                className="w-20 h-20 rounded-xl object-cover"
              />
            ) : (
              <div className={`w-20 h-20 rounded-xl flex items-center justify-center text-3xl
                ${selectedCharacter.gender === 'female' ? 'bg-pink-500/20' : 'bg-blue-500/20'}`}>
                {selectedCharacter.gender === 'female' ? '♀' : '♂'}
              </div>
            )}
            <span className="text-white font-medium">{selectedCharacter.name}</span>
          </div>
          <p className="text-neutral-300 text-sm text-center">
            Are you sure you want to guess <strong>{selectedCharacter.name}</strong>?
          </p>
          <p className="text-neutral-500 text-xs text-center">
            If wrong, your turn is over.
          </p>
          <div className="flex gap-2 w-full">
            <Button variant="secondary" onClick={handleBack} className="flex-1">
              Back
            </Button>
            <Button onClick={handleConfirm} className="flex-1">
              Guess!
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white font-heading">Guess Opponent's Character</h2>
            <button onClick={handleClose} className="text-neutral-400 hover:text-white text-xl cursor-pointer">
              ✕
            </button>
          </div>
          <p className="text-neutral-400 text-sm">
            Tap a character to guess. Non-eliminated characters are highlighted.
          </p>
          <div className="grid grid-cols-3 gap-2 max-h-[50vh] overflow-y-auto">
            {characters.map(character => {
              const isEliminated = eliminatedIds.includes(character.id);
              return (
                <button
                  key={character.id}
                  onClick={() => handleSelect(character.id)}
                  className={`flex flex-col items-center gap-1 p-2 rounded-xl cursor-pointer transition-all
                    ${isEliminated
                      ? 'bg-white/5 opacity-40'
                      : 'bg-white/10 hover:bg-accent/20 hover:ring-1 hover:ring-accent/50'
                    }`}
                >
                  {character.imageUrl ? (
                    <img
                      src={character.imageUrl}
                      alt={character.name}
                      className="w-14 h-14 rounded-lg object-cover"
                    />
                  ) : (
                    <div className={`w-14 h-14 rounded-lg flex items-center justify-center text-xl
                      ${character.gender === 'female' ? 'bg-pink-500/20' : 'bg-blue-500/20'}`}>
                      {character.gender === 'female' ? '♀' : '♂'}
                    </div>
                  )}
                  <span className={`text-xs text-center leading-tight
                    ${isEliminated ? 'text-neutral-600 line-through' : 'text-white'}`}>
                    {character.name}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </Modal>
  );
}
