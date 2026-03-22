import { useState } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import CharacterCard from './CharacterCard';
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
          <CharacterCard character={selectedCharacter} state="guessing" />
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
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-[50vh] overflow-y-auto">
            {characters.map(character => (
              <div key={character.id} className={eliminatedIds.includes(character.id) ? 'opacity-40' : ''}>
                <CharacterCard
                  character={character}
                  state={eliminatedIds.includes(character.id) ? 'eliminated' : 'normal'}
                  size="sm"
                  onTap={() => handleSelect(character.id)}
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </Modal>
  );
}
