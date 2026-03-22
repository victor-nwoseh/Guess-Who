import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import ScreenLayout from '../components/ui/ScreenLayout';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Toggle from '../components/ui/Toggle';
import { useGameStore, subscribeToServerEvents } from '../stores/gameStore';
import { connect, getSocket, storeSession } from '../services/socket';
import { GameMode, Category } from '@guess-who/shared';
import type { Character } from '@guess-who/shared';
import Input from '../components/ui/Input';
import MuteButton from '../components/ui/MuteButton';
import DisconnectModal from '../components/game/DisconnectModal';

const CATEGORY_LABELS: Record<Category, string> = {
  [Category.MUTUAL_FRIENDS]: 'Mutual Friends',
  [Category.DIGITAL_CREATORS]: 'Digital Creators & Reality TV',
  [Category.MUSIC_ARTISTS]: 'Music Artists',
  [Category.ACTORS]: 'Actors',
  [Category.ATHLETES]: 'Athletes',
  [Category.BIBLE_CHARACTERS]: 'Bible Characters',
  [Category.FAMOUS_FACES]: 'Famous Faces',
};

const CATEGORY_ICONS: Record<Category, string> = {
  [Category.MUTUAL_FRIENDS]: '👥',
  [Category.DIGITAL_CREATORS]: '🎬',
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

  // Mutual Friends state
  const [friends, setFriends] = useState<Character[]>([]);
  const [friendName, setFriendName] = useState('');
  const [friendGender, setFriendGender] = useState<'male' | 'female'>('male');

  const me = gameState?.players.find(p => p.id === myPlayerId);
  const isHost = me?.isHost ?? false;
  const playerCount = gameState?.players.length ?? 0;
  const isMutualFriends = category === Category.MUTUAL_FRIENDS;
  const canStart = playerCount === 2 && category !== null &&
    (!isMutualFriends || (friends.length >= 12 && friends.length <= 50));

  const [inviteName, setInviteName] = useState('');
  const [inviteError, setInviteError] = useState('');
  const isInviteJoin = !gameState && !!urlRoomCode;

  // If navigated directly via invite link with an existing displayName, auto-join
  useEffect(() => {
    if (!gameState && urlRoomCode && displayName) {
      joinRoomWithName(displayName);
    }
  }, []);  // eslint-disable-line react-hooks/exhaustive-deps

  function joinRoomWithName(name: string) {
    if (!urlRoomCode) return;
    const socket = connect();
    subscribeToServerEvents();

    socket.once('room-joined', ({ gameState: gs }) => {
      useGameStore.getState().setGameState(gs);
      useGameStore.getState().setMyPlayerId(socket.id!);
      useGameStore.getState().setDisplayName(name);
      storeSession(gs.roomCode, name);
    });

    socket.once('error', ({ message }) => {
      setInviteError(message);
    });

    socket.emit('join-room', { roomCode: urlRoomCode, displayName: name });
  }

  function handleInviteJoin() {
    const name = inviteName.trim();
    if (!name) return;
    setInviteError('');
    joinRoomWithName(name);
  }

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

  function handleAddFriend() {
    const name = friendName.trim();
    if (!name || friends.length >= 50) return;
    const newFriend: Character = {
      id: `mf-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name,
      imageUrl: '',
      gender: friendGender,
    };
    setFriends([...friends, newFriend]);
    setFriendName('');
  }

  function handleRemoveFriend(id: string) {
    setFriends(friends.filter(f => f.id !== id));
  }

  function handleStartGame() {
    if (!canStart || !category) return;
    const socket = getSocket();
    socket.emit('configure-game', {
      mode,
      category,
      boardSize: isMutualFriends ? friends.length : boardSize,
      bestOf,
      customCharacters: isMutualFriends ? friends : undefined,
    });
  }

  // Show name entry prompt for invite link visitors without a name
  if (isInviteJoin && !displayName) {
    return (
      <ScreenLayout className="items-center justify-center">
        <div className="w-full max-w-sm flex flex-col items-center gap-6">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-white font-heading tracking-tight">
              Guess Who<span className="text-accent">?</span>
            </h1>
            <p className="text-neutral-400 mt-2 text-sm">
              You've been invited to join a game
            </p>
          </div>

          <div className="w-full flex flex-col gap-3">
            <Input
              id="invite-name"
              placeholder="Enter your name"
              value={inviteName}
              onChange={(e) => setInviteName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleInviteJoin(); }}
              maxLength={20}
            />
            <Button onClick={handleInviteJoin} disabled={!inviteName.trim()} className="w-full">
              Join Game
            </Button>
          </div>

          {inviteError && (
            <p className="text-error text-sm text-center">{inviteError}</p>
          )}
        </div>
      </ScreenLayout>
    );
  }

  return (
    <ScreenLayout>
      <div className="absolute top-4 right-4">
        <MuteButton />
      </div>
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
            {gameState?.players.map((player, i) => (
              <motion.div
                key={player.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                className="flex items-center gap-3"
              >
                <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center">
                  <span className="text-accent text-sm font-bold">
                    {player.displayName.charAt(0).toUpperCase()}
                  </span>
                </div>
                <span className="text-white font-medium">{player.displayName}</span>
                {player.isHost && <Badge variant="accent">Host</Badge>}
                {player.id === myPlayerId && <Badge>You</Badge>}
              </motion.div>
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

          {/* Mutual Friends Entry */}
          {isHost && isMutualFriends && (
            <div>
              <p className="text-white text-sm font-medium mb-2">
                Add Friends ({friends.length}/50, min 12)
              </p>
              <div className="flex flex-col gap-2 mb-3">
                <Input
                  id="friend-name"
                  placeholder="Name"
                  value={friendName}
                  onChange={(e) => setFriendName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleAddFriend(); }}
                />
                <div className="flex gap-2">
                  <Toggle
                    options={['Male', 'Female']}
                    value={friendGender === 'male' ? 'Male' : 'Female'}
                    onChange={(v) => setFriendGender(v === 'Male' ? 'male' : 'female')}
                  />
                  <Button onClick={handleAddFriend} disabled={!friendName.trim() || friends.length >= 50} className="ml-auto">
                    Add
                  </Button>
                </div>
              </div>
              {friends.length > 0 && (
                <div className="max-h-48 overflow-y-auto flex flex-col gap-1.5">
                  {friends.map(friend => (
                    <div key={friend.id} className="flex items-center justify-between bg-white/5 rounded-lg px-3 py-2">
                      <div className="flex items-center gap-2">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs
                          ${friend.gender === 'male' ? 'bg-blue-500/20 text-blue-400' : 'bg-pink-500/20 text-pink-400'}`}>
                          {friend.gender === 'male' ? '♂' : '♀'}
                        </div>
                        <span className="text-white text-sm">{friend.name}</span>
                      </div>
                      <button
                        onClick={() => handleRemoveFriend(friend.id)}
                        className="text-neutral-400 hover:text-error text-sm cursor-pointer"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Board Size (hidden for Mutual Friends) */}
          {!isMutualFriends && (
            <div>
              <p className="text-white text-sm font-medium mb-2">
                Board Size: <span className="text-accent">{boardSize}</span>
              </p>
              {isHost ? (
                <input
                  type="range"
                  min={12}
                  max={50}
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

      <DisconnectModal />
    </ScreenLayout>
  );
}
