import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ScreenLayout from '../components/ui/ScreenLayout';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Toggle from '../components/ui/Toggle';
import { useGameStore, subscribeToServerEvents } from '../stores/gameStore';
import { connect, getSocket, storeSession } from '../services/socket';
import { GameMode, Category } from '@guess-who/shared';

const CATEGORY_LABELS: Record<Category, string> = {
  [Category.MUTUAL_FRIENDS]: 'Mutual Friends',
  [Category.YOUTUBERS]: 'YouTubers',
  [Category.MUSIC_ARTISTS]: 'Music Artists',
  [Category.ACTORS]: 'Actors',
  [Category.ATHLETES]: 'Athletes',
  [Category.BIBLE_CHARACTERS]: 'Bible Characters',
  [Category.FAMOUS_FACES]: 'Famous Faces',
};

const CATEGORY_ICONS: Record<Category, string> = {
  [Category.MUTUAL_FRIENDS]: '👥',
  [Category.YOUTUBERS]: '🎬',
  [Category.MUSIC_ARTISTS]: '🎵',
  [Category.ACTORS]: '🎭',
  [Category.ATHLETES]: '⚽',
  [Category.BIBLE_CHARACTERS]: '📖',
  [Category.FAMOUS_FACES]: '⭐',
};

export default function LobbyPage() {
  const { roomCode: urlRoomCode } = useParams();
  const navigate = useNavigate();
  const { gameState, myPlayerId, displayName } = useGameStore();

  const [mode, setMode] = useState<GameMode>(GameMode.REMOTE);
  const [category, setCategory] = useState<Category | null>(null);
  const [boardSize, setBoardSize] = useState(24);
  const [bestOf, setBestOf] = useState<1 | 3>(1);
  const [copied, setCopied] = useState(false);

  const me = gameState?.players.find(p => p.id === myPlayerId);
  const isHost = me?.isHost ?? false;
  const playerCount = gameState?.players.length ?? 0;
  const canStart = playerCount === 2 && category !== null;

  // If navigated directly via invite link without a session, connect and join
  useEffect(() => {
    if (!gameState && urlRoomCode && displayName) {
      const socket = connect();
      subscribeToServerEvents();

      socket.once('room-joined', ({ gameState: gs }) => {
        useGameStore.getState().setGameState(gs);
        useGameStore.getState().setMyPlayerId(socket.id!);
        storeSession(gs.roomCode, displayName);
      });

      socket.once('error', ({ message }) => {
        console.error(message);
        navigate('/');
      });

      socket.emit('join-room', { roomCode: urlRoomCode, displayName });
    }
  }, [gameState, urlRoomCode, displayName, navigate]);

  // Listen for game-configured to transition to game
  useEffect(() => {
    if (gameState?.phase === 'character_select') {
      navigate(`/game/${gameState.roomCode}`);
    }
  }, [gameState?.phase, gameState?.roomCode, navigate]);

  function handleCopyCode() {
    if (!urlRoomCode) return;
    navigator.clipboard.writeText(urlRoomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleShare() {
    const url = `${window.location.origin}/lobby/${urlRoomCode}`;
    if (navigator.share) {
      navigator.share({
        title: 'Guess Who?',
        text: `Join my Guess Who? game!`,
        url,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  function handleStartGame() {
    if (!canStart || !category) return;
    const socket = getSocket();
    socket.emit('configure-game', {
      mode,
      category,
      boardSize: category === Category.MUTUAL_FRIENDS ? boardSize : boardSize,
      bestOf,
    });
  }

  return (
    <ScreenLayout>
      <div className="flex flex-col gap-6 w-full max-w-md mx-auto flex-1">
        {/* Room Code Header */}
        <div className="text-center">
          <p className="text-neutral-400 text-sm mb-1">Room Code</p>
          <button
            onClick={handleCopyCode}
            className="text-4xl font-bold text-accent font-heading tracking-[0.3em] cursor-pointer
              hover:text-accent-light transition-colors"
          >
            {urlRoomCode}
          </button>
          {copied && <p className="text-success text-xs mt-1">Copied!</p>}
        </div>

        {/* Share Button */}
        <Button variant="ghost" onClick={handleShare} className="mx-auto">
          Share Invite Link
        </Button>

        {/* Players */}
        <div className="bg-white/5 rounded-xl p-4">
          <p className="text-neutral-400 text-sm mb-3">
            Players ({playerCount}/2)
          </p>
          <div className="flex flex-col gap-2">
            {gameState?.players.map(player => (
              <div key={player.id} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center">
                  <span className="text-accent text-sm font-bold">
                    {player.displayName.charAt(0).toUpperCase()}
                  </span>
                </div>
                <span className="text-white font-medium">{player.displayName}</span>
                {player.isHost && <Badge variant="accent">Host</Badge>}
                {player.id === myPlayerId && <Badge>You</Badge>}
              </div>
            ))}
            {playerCount < 2 && (
              <div className="flex items-center gap-3 opacity-40">
                <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                  <span className="text-neutral-400 text-sm">?</span>
                </div>
                <span className="text-neutral-400">Waiting for player...</span>
              </div>
            )}
          </div>
        </div>

        {/* Game Settings */}
        <div className="bg-white/5 rounded-xl p-4 flex flex-col gap-5">
          <p className="text-neutral-400 text-sm">Game Settings</p>

          {/* Game Mode */}
          <div>
            <p className="text-white text-sm font-medium mb-2">Game Mode</p>
            {isHost ? (
              <Toggle
                options={['Remote', 'In-Person']}
                value={mode === GameMode.REMOTE ? 'Remote' : 'In-Person'}
                onChange={(v) => setMode(v === 'Remote' ? GameMode.REMOTE : GameMode.IN_PERSON)}
              />
            ) : (
              <p className="text-neutral-300">
                {gameState?.mode === GameMode.REMOTE ? 'Remote' : 'In-Person'}
              </p>
            )}
          </div>

          {/* Category */}
          <div>
            <p className="text-white text-sm font-medium mb-2">Category</p>
            {isHost ? (
              <div className="grid grid-cols-2 gap-2">
                {Object.values(Category).map(cat => (
                  <button
                    key={cat}
                    onClick={() => setCategory(cat)}
                    className={`p-3 rounded-xl text-left text-sm transition-all cursor-pointer
                      ${category === cat
                        ? 'bg-accent/20 border-2 border-accent text-white'
                        : 'bg-white/5 border-2 border-transparent text-neutral-300 hover:bg-white/10'
                      }`}
                  >
                    <span className="mr-2">{CATEGORY_ICONS[cat]}</span>
                    {CATEGORY_LABELS[cat]}
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-neutral-300">
                {gameState?.category ? CATEGORY_LABELS[gameState.category] : 'Not selected'}
              </p>
            )}
          </div>

          {/* Board Size (hidden for Mutual Friends — handled in Step 3.3) */}
          {category !== Category.MUTUAL_FRIENDS && (
            <div>
              <p className="text-white text-sm font-medium mb-2">
                Board Size: <span className="text-accent">{boardSize}</span>
              </p>
              {isHost ? (
                <input
                  type="range"
                  min={12}
                  max={28}
                  value={boardSize}
                  onChange={(e) => setBoardSize(Number(e.target.value))}
                  className="w-full accent-accent"
                />
              ) : (
                <p className="text-neutral-300">{gameState?.boardSize ?? 24}</p>
              )}
            </div>
          )}

          {/* Best Of */}
          <div>
            <p className="text-white text-sm font-medium mb-2">Best Of</p>
            {isHost ? (
              <Toggle
                options={['1', '3']}
                value={String(bestOf)}
                onChange={(v) => setBestOf(v === '1' ? 1 : 3)}
              />
            ) : (
              <p className="text-neutral-300">{gameState?.bestOf ?? 1}</p>
            )}
          </div>
        </div>

        {/* Start Button (host only) */}
        {isHost && (
          <Button
            onClick={handleStartGame}
            disabled={!canStart}
            className="w-full"
          >
            {playerCount < 2 ? 'Waiting for opponent...' : 'Start Game'}
          </Button>
        )}

        {/* Non-host waiting message */}
        {!isHost && (
          <p className="text-neutral-400 text-sm text-center">
            Waiting for host to start the game...
          </p>
        )}
      </div>
    </ScreenLayout>
  );
}
