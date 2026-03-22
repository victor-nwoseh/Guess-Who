import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import SnipeModal from '../components/game/SnipeModal';
import type { Character } from '@guess-who/shared';

const characters: Character[] = [
  { id: 'c1', name: 'Alice', imageUrl: '/img/1.jpg', gender: 'female' },
  { id: 'c2', name: 'Bob', imageUrl: '/img/2.jpg', gender: 'male' },
  { id: 'c3', name: 'Charlie', imageUrl: '/img/3.jpg', gender: 'male' },
];

describe('SnipeModal', () => {
  const onClose = vi.fn();
  const onConfirm = vi.fn();

  beforeEach(() => {
    onClose.mockClear();
    onConfirm.mockClear();
  });

  it('does not render when closed', () => {
    render(
      <SnipeModal
        open={false}
        onClose={onClose}
        characters={characters}
        eliminatedIds={[]}
        onConfirm={onConfirm}
      />
    );

    expect(screen.queryByText('Guess Opponent\'s Character')).not.toBeInTheDocument();
  });

  it('renders all characters when open', () => {
    render(
      <SnipeModal
        open={true}
        onClose={onClose}
        characters={characters}
        eliminatedIds={[]}
        onConfirm={onConfirm}
      />
    );

    expect(screen.getByText("Guess Opponent's Character")).toBeInTheDocument();
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
    expect(screen.getByText('Charlie')).toBeInTheDocument();
  });

  it('shows confirmation after selecting a character', () => {
    render(
      <SnipeModal
        open={true}
        onClose={onClose}
        characters={characters}
        eliminatedIds={[]}
        onConfirm={onConfirm}
      />
    );

    // Tap Alice's card
    const aliceButton = screen.getByLabelText('Alice');
    fireEvent.pointerDown(aliceButton);
    fireEvent.pointerUp(aliceButton);

    // Should show confirmation
    expect(screen.getByText('Confirm Guess')).toBeInTheDocument();
    expect(screen.getByText(/Are you sure you want to guess/)).toBeInTheDocument();
    expect(screen.getByText('Guess!')).toBeInTheDocument();
    expect(screen.getByText('Back')).toBeInTheDocument();
  });

  it('calls onConfirm when guess is confirmed', () => {
    render(
      <SnipeModal
        open={true}
        onClose={onClose}
        characters={characters}
        eliminatedIds={[]}
        onConfirm={onConfirm}
      />
    );

    // Select Alice
    const aliceButton = screen.getByLabelText('Alice');
    fireEvent.pointerDown(aliceButton);
    fireEvent.pointerUp(aliceButton);

    // Confirm
    fireEvent.click(screen.getByText('Guess!'));
    expect(onConfirm).toHaveBeenCalledWith('c1');
  });

  it('goes back from confirmation to character list', () => {
    render(
      <SnipeModal
        open={true}
        onClose={onClose}
        characters={characters}
        eliminatedIds={[]}
        onConfirm={onConfirm}
      />
    );

    // Select Bob
    const bobButton = screen.getByLabelText('Bob');
    fireEvent.pointerDown(bobButton);
    fireEvent.pointerUp(bobButton);

    // Go back
    fireEvent.click(screen.getByText('Back'));
    expect(screen.getByText("Guess Opponent's Character")).toBeInTheDocument();
  });

  it('dims eliminated characters', () => {
    render(
      <SnipeModal
        open={true}
        onClose={onClose}
        characters={characters}
        eliminatedIds={['c2']}
        onConfirm={onConfirm}
      />
    );

    // Bob's wrapper should have opacity-40 class
    const bobButton = screen.getByLabelText('Bob (eliminated)');
    const wrapper = bobButton.closest('.opacity-40');
    expect(wrapper).not.toBeNull();
  });
});
