import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import ScreenLayout from '../components/ui/ScreenLayout';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import Input from '../components/ui/Input';
import SnipeModal from '../components/game/SnipeModal';
import { useGameStore, subscribeToServerEvents } from '../stores/gameStore';
import { getSocket, connect, getStoredSession } from '../services/socket';
import { GamePhase, GameMode } from '@guess-who/shared';

export default function GamePage() {
  const navigate = useNavigate();
  const { gameState, myPlayerId, myEliminatedIds, eliminateCharacter, restoreCharacter } = useGameStore();

  const [selectedId, setSelectedId] = useState<string | null>(
    () => sessionStorage.getItem('gw_selectedCharId')
  );
  const [confirmed, setConfirmed] = useState(false);
  const [questionText, setQuestionText] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [showSnipeModal, setShowSnipeModal] = useState(false);
  const [snipeResult, setSnipeResult] = useState<{
    sniperName: string;
    characterName: string;
    correct: boolean;
  } | null>(null);

  const phase = gameState?.phase;
  const characters = gameState?.characters ?? [];
  const me = gameState?.players.find(p => p.id === myPlayerId);

  // Listen for snipe results
  useEffect(() => {
    const socket = getSocket();
    const handleSnipeResult = (data: {
      sniperId: string;
      characterName: string;
      correct: boolean;
    }) => {
      const gs = useGameStore.getState().gameState;
      const sniper = gs?.players.find(p => p.id === data.sniperId);
      setSnipeResult({
        sniperName: sniper?.displayName ?? 'Unknown',
        characterName: data.characterName,
        correct: data.correct,
      });
      setShowSnipeModal(false);

      // Auto-dismiss after 3 seconds if wrong guess
      if (!data.correct) {
        setTimeout(() => setSnipeResult(null), 3000);
      }
    };
    socket.on('snipe-result', handleSnipeResult);
    return () => { socket.off('snipe-result', handleSnipeResult); };
  }, []);

  // Navigate to results when game is over
  useEffect(() => {
    if (phase === GamePhase.GAME_OVER || phase === GamePhase.ROUND_OVER) {
      navigate(`/results/${gameState?.roomCode}`);
    }
  }, [phase, gameState?.roomCode, navigate]);

  // If no game state, attempt reconnection before redirecting home
  useEffect(() => {
    if (!gameState) {
      const session = getStoredSession();
      if (session.socketId && session.roomCode) {
        // Attempt reconnection — socket.ts handles emitting reconnect-session on connect
        const socket = connect();
        subscribeToServerEvents();

        // Give reconnection a chance, then redirect if still no state
        const timeout = setTimeout(() => {
          if (!useGameStore.getState().gameState) {
            navigate('/');
          }
        }, 3000);
        return () => clearTimeout(timeout);
      } else {
        navigate('/');
      }
    }
  }, [gameState, navigate]);

  function handleConfirmSelection() {
    if (!selectedId) return;
    const socket = getSocket();
    socket.emit('select-character', { characterId: selectedId });
    sessionStorage.setItem('gw_selectedCharId', selectedId);
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

  function handleSnipe(characterId: string) {
    const socket = getSocket();
    socket.emit('snipe', { characterId });
  }

  return (
    <ScreenLayout>
      <div className="flex flex-col gap-2 flex-1 min-h-0">
        {/* Top Bar */}
        <div className="flex flex-col gap-1.5 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span className="text-white font-medium text-sm">{me?.displayName}</span>
                <Badge variant="accent">{me?.wins ?? 0}</Badge>
              </div>
              <span className="text-neutral-500 text-xs">vs</span>
              <div className="flex items-center gap-1.5">
                <span className="text-neutral-300 font-medium text-sm">{opponent?.displayName}</span>
                <Badge variant="default">{opponent?.wins ?? 0}</Badge>
              </div>
            </div>
            <Badge variant={isMyTurn ? 'accent' : 'default'}>
              {isMyTurn ? 'Your Turn' : "Opponent's Turn"}
            </Badge>
          </div>
          {myCharacter && (
            <div className="flex items-center gap-1.5">
              <span className="text-neutral-500 text-xs">Your character:</span>
              {myCharacter.imageUrl ? (
                <img src={myCharacter.imageUrl} alt="" className="w-5 h-5 rounded" />
              ) : (
                <div className={`w-5 h-5 rounded flex items-center justify-center text-xs
                  ${myCharacter.gender === 'female' ? 'bg-pink-500/20' : 'bg-blue-500/20'}`}>
                  {myCharacter.gender === 'female' ? '♀' : '♂'}
                </div>
              )}
              <span className="text-neutral-400 text-xs font-medium">{myCharacter.name}</span>
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

        {/* Bottom Action Area */}
        <div className="shrink-0 pt-2 border-t border-white/10 flex flex-col gap-2">
          {gameState.mode === GameMode.REMOTE ? (
            <RemoteActions
              isMyTurn={isMyTurn}
              questions={gameState.questions}
              questionText={questionText}
              setQuestionText={setQuestionText}
              showHistory={showHistory}
              setShowHistory={setShowHistory}
              myPlayerId={myPlayerId!}
              opponentName={opponent?.displayName ?? 'Opponent'}
              onSnipe={() => setShowSnipeModal(true)}
            />
          ) : (
            /* In-Person mode */
            <InPersonActions
              isMyTurn={isMyTurn}
              opponentName={opponent?.displayName ?? 'Opponent'}
              onSnipe={() => setShowSnipeModal(true)}
            />
          )}
        </div>
      </div>

      {/* Snipe Modal */}
      <SnipeModal
        open={showSnipeModal}
        onClose={() => setShowSnipeModal(false)}
        characters={characters}
        eliminatedIds={myEliminatedIds}
        onConfirm={handleSnipe}
      />

      {/* Snipe Result Overlay */}
      <AnimatePresence>
        {snipeResult && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
            onClick={() => !snipeResult.correct && setSnipeResult(null)}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="bg-primary-light rounded-2xl p-6 mx-4 text-center max-w-sm"
            >
              <p className="text-lg font-bold text-white mb-2">
                {snipeResult.sniperName} guessed {snipeResult.characterName}
              </p>
              <p className={`text-2xl font-bold font-heading ${
                snipeResult.correct ? 'text-green-400' : 'text-red-400'
              }`}>
                {snipeResult.correct ? 'Correct!' : 'Wrong!'}
              </p>
              {!snipeResult.correct && (
                <p className="text-neutral-400 text-sm mt-2">Tap to dismiss</p>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </ScreenLayout>
  );
}

// --- Remote Mode Action Area ---

import type { Question } from '@guess-who/shared';

interface RemoteActionsProps {
  isMyTurn: boolean;
  questions: Question[];
  questionText: string;
  setQuestionText: (text: string) => void;
  showHistory: boolean;
  setShowHistory: (show: boolean) => void;
  myPlayerId: string;
  opponentName: string;
  onSnipe: () => void;
}

function RemoteActions({
  isMyTurn,
  questions,
  questionText,
  setQuestionText,
  showHistory,
  setShowHistory,
  myPlayerId,
  opponentName,
  onSnipe,
}: RemoteActionsProps) {
  const socket = getSocket();

  // Find the latest unanswered question asked by opponent (for answering)
  const pendingQuestion = questions.find(
    q => q.askerId !== myPlayerId && q.answer === null && !q.isSnipe
  );

  // Check if I asked a question that hasn't been answered yet
  const myPendingQuestion = questions.find(
    q => q.askerId === myPlayerId && q.answer === null && !q.isSnipe
  );

  function handleAskQuestion() {
    const text = questionText.trim();
    if (!text) return;
    socket.emit('ask-question', { text });
    setQuestionText('');
  }

  function handleAnswer(answer: 'yes' | 'no') {
    if (!pendingQuestion) return;
    socket.emit('answer-question', { questionId: pendingQuestion.id, answer });
  }

  // Answered questions for history — only show questions I asked
  const answeredQuestions = questions.filter(q => q.askerId === myPlayerId && q.answer !== null && !q.isSnipe);

  return (
    <>
      {/* Question History (collapsible) */}
      {answeredQuestions.length > 0 && (
        <div>
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="text-neutral-400 text-xs flex items-center gap-1 cursor-pointer hover:text-neutral-300 transition-colors"
          >
            <span className={`transition-transform ${showHistory ? 'rotate-90' : ''}`}>&#9654;</span>
            Question history ({answeredQuestions.length})
          </button>
          <AnimatePresence>
            {showHistory && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="flex flex-col gap-1.5 mt-2 max-h-32 overflow-y-auto">
                  {answeredQuestions.map(q => (
                    <div
                      key={q.id}
                      className="rounded-lg px-3 py-1.5 text-xs bg-white/5 text-neutral-200"
                    >
                      <p>{q.text}</p>
                      <span className={`font-medium ${q.answer === 'yes' ? 'text-green-400' : 'text-red-400'}`}>
                        {q.answer === 'yes' ? 'Yes' : 'No'}
                      </span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Action Area */}
      {isMyTurn ? (
        myPendingQuestion ? (
          /* Asked a question, waiting for opponent to answer */
          <div className="bg-white/5 rounded-xl px-4 py-3">
            <p className="text-neutral-400 text-xs mb-1">You asked:</p>
            <p className="text-white text-sm">{myPendingQuestion.text}</p>
            <p className="text-neutral-500 text-xs mt-1">Waiting for {opponentName} to answer...</p>
          </div>
        ) : (
          /* Your turn — ask a question or snipe */
          <div className="flex flex-col gap-2">
            <div className="flex gap-2">
              <Input
                id="question-input"
                placeholder="Ask a yes/no question..."
                value={questionText}
                onChange={(e) => setQuestionText(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleAskQuestion(); }}
                className="flex-1"
              />
              <Button onClick={handleAskQuestion} disabled={!questionText.trim()}>
                Send
              </Button>
            </div>
            <Button variant="secondary" onClick={onSnipe} className="w-full">
              Guess (Snipe)
            </Button>
          </div>
        )
      ) : pendingQuestion ? (
        /* Opponent asked a question — show it and answer */
        <div className="flex flex-col gap-2">
          <div className="bg-white/5 rounded-xl px-4 py-3">
            <p className="text-neutral-400 text-xs mb-1">{opponentName} asks:</p>
            <p className="text-white text-sm">{pendingQuestion.text}</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => handleAnswer('yes')} className="flex-1">
              Yes
            </Button>
            <Button onClick={() => handleAnswer('no')} variant="secondary" className="flex-1">
              No
            </Button>
          </div>
        </div>
      ) : (
        /* Waiting for opponent to ask */
        <p className="text-neutral-400 text-sm text-center py-2">
          Waiting for {opponentName} to ask a question...
        </p>
      )}
    </>
  );
}

// --- In-Person Mode Action Area ---

interface InPersonActionsProps {
  isMyTurn: boolean;
  opponentName: string;
  onSnipe: () => void;
}

function InPersonActions({ isMyTurn, opponentName, onSnipe }: InPersonActionsProps) {
  const socket = getSocket();

  function handleEndTurn() {
    socket.emit('end-turn');
  }

  return isMyTurn ? (
    <div className="flex flex-col gap-2">
      <p className="text-white text-sm text-center font-medium py-1">
        Ask your question out loud!
      </p>
      <Button onClick={handleEndTurn} className="w-full">
        End Turn
      </Button>
      <Button variant="secondary" onClick={onSnipe} className="w-full">
        Guess (Snipe)
      </Button>
    </div>
  ) : (
    <p className="text-neutral-400 text-sm text-center py-2">
      Waiting for {opponentName}...
    </p>
  );
}
