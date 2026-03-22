import { Howl } from 'howler';

const SOUNDS = {
  cardFlip: '/sounds/card-flip.mp3',
  buttonTap: '/sounds/button-tap.mp3',
  victory: '/sounds/victory.mp3',
  defeat: '/sounds/defeat.mp3',
  turnStart: '/sounds/turn-start.mp3',
  snipeAttempt: '/sounds/snipe-attempt.mp3',
  questionReceived: '/sounds/question-received.mp3',
  playerJoined: '/sounds/player-joined.mp3',
  matchFound: '/sounds/match-found.mp3',
} as const;

export type SoundName = keyof typeof SOUNDS;

let howls: Record<SoundName, Howl> | null = null;
let muted = localStorage.getItem('gw_muted') === 'true';
let preloaded = false;

function loadAll(): void {
  if (howls) return;
  const entries = Object.entries(SOUNDS) as [SoundName, string][];
  howls = {} as Record<SoundName, Howl>;
  for (const [name, src] of entries) {
    howls[name] = new Howl({
      src: [src],
      preload: true,
      volume: name === 'victory' || name === 'defeat' ? 0.6 : 0.4,
    });
  }
}

export function preloadSounds(): void {
  if (preloaded) return;
  preloaded = true;
  loadAll();
}

export function playSound(name: SoundName): void {
  if (muted) return;
  if (!howls) loadAll();
  howls![name].play();
}

export function isMuted(): boolean {
  return muted;
}

export function setMuted(value: boolean): void {
  muted = value;
  localStorage.setItem('gw_muted', String(value));
}
