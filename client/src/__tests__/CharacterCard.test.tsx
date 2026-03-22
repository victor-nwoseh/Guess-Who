import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import CharacterCard from '../components/game/CharacterCard';
import type { Character } from '@guess-who/shared';

const mockCharacter: Character = {
  id: 'c1',
  name: 'Alice Johnson',
  imageUrl: '/img/alice.jpg',
  gender: 'female',
};

const mutualFriendCharacter: Character = {
  id: 'mf1',
  name: 'Bob',
  imageUrl: '',
  gender: 'male',
};

describe('CharacterCard', () => {
  it('renders character name', () => {
    render(<CharacterCard character={mockCharacter} />);
    expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
  });

  it('renders with normal state by default', () => {
    render(<CharacterCard character={mockCharacter} />);
    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('aria-label', 'Alice Johnson');
  });

  it('renders eliminated state with aria label', () => {
    render(<CharacterCard character={mockCharacter} state="eliminated" />);
    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('aria-label', 'Alice Johnson (eliminated)');
  });

  it('renders selected state with aria-pressed', () => {
    render(<CharacterCard character={mockCharacter} state="selected" />);
    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('aria-label', 'Alice Johnson (selected)');
    expect(button).toHaveAttribute('aria-pressed', 'true');
  });

  it('calls onTap on quick tap', () => {
    const onTap = vi.fn();
    render(<CharacterCard character={mockCharacter} onTap={onTap} />);

    const button = screen.getByRole('button');
    fireEvent.pointerDown(button);
    fireEvent.pointerUp(button);

    expect(onTap).toHaveBeenCalledOnce();
  });

  it('renders avatar for mutual friend (no imageUrl)', () => {
    render(<CharacterCard character={mutualFriendCharacter} />);
    // Should render SVG avatar instead of img
    expect(screen.queryByRole('img')).toBeInTheDocument(); // SVG with role="img"
    expect(screen.getByText('Bob')).toBeInTheDocument();
  });

  it('applies eliminated styling with strikethrough text', () => {
    render(<CharacterCard character={mockCharacter} state="eliminated" />);
    const name = screen.getByText('Alice Johnson');
    expect(name.className).toContain('line-through');
  });
});
