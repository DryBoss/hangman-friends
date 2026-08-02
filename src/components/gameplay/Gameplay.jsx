import { useState } from "react";
import WordGuesser from "./../word-guesser/Word-guesser";
import GuessSpectator from "./GuessSpectator";
import WordSelection from "./../word-selection/Word-selection";
import Waiting from "./Waiting";
import Scoreboard from "./../scoreboard/Scoreboard";
import TurnHandoff from "./../turn-handoff/Turn-handoff";
import RoundJudge from "./../round-judge/Round-judge";
import Leaderboard from "./../leaderboard/Leaderboard";
import LeaderboardDialog from "./../leaderboard-dialog/LeaderboardDialog";
import Icon from "./../icon/Icon";
import styles from "./Gameplay.module.css";

// Transport-agnostic: `adapter` comes from useLocalAdapter, useOnlineAdapter,
// or useLanAdapter, all of which expose the same shape (see any of those
// hooks for the contract). This component doesn't know or care which one
// it got - local play, an online room, and a LAN room all render through
// this exact same UI.
function Gameplay({ adapter, onNewGame }) {
  const {
    loading, state, playerNames, mySeat, isHost, isLocalMode, pending,
    selectWord, readyToGuess, guessLetter, judgeVote, judgeDecide, nextRound, restart,
  } = adapter;

  const [showLeaderboard, setShowLeaderboard] = useState(false);

  if (loading || !state) {
    return (
      <div className={styles.loading}>
        <p>Loading game…</p>
      </div>
    );
  }

  const {
    score, selectorIndex, guesserIndex, word, guessedLetters, roundDelta, roundVoided,
    turnSeq, wordsPlayed, phase, winnerIndex, judgeVotes, turnDuration, gameMode,
    roundsToPlay, minWordLength, maxWordLength, turnDeadline,
  } = state;

  const progressLabel =
    gameMode === "rounds" ? `Round ${Math.min(wordsPlayed + 1, roundsToPlay)} of ${roundsToPlay}` : null;

  const leaderboardButton = (
    <button type="button" className={styles.leaderboardButton} onClick={() => setShowLeaderboard(true)}>
      <Icon name="star" size={16} />
      Standings
    </button>
  );

  const leaderboardDialog = showLeaderboard ? (
    <LeaderboardDialog
      players={playerNames}
      score={score}
      progressLabel={progressLabel}
      onClose={() => setShowLeaderboard(false)}
    />
  ) : null;

  if (phase === "finished") {
    return (
      <Scoreboard
        players={playerNames}
        score={score}
        winnerIndex={winnerIndex}
        isHost={isLocalMode || isHost}
        onPlayAgain={restart}
        onNewGame={onNewGame}
      />
    );
  }

  if (phase === "select") {
    if (mySeat === selectorIndex) {
      return (
        <>
          {leaderboardButton}
          <WordSelection
            players={playerNames}
            selectorIndex={selectorIndex}
            minLength={minWordLength}
            maxLength={maxWordLength}
            onSelectWord={selectWord}
            pending={pending}
          />
          {leaderboardDialog}
        </>
      );
    }
    return (
      <>
        {leaderboardButton}
        <Waiting
          eyebrow="Picking a secret word"
          name={playerNames[selectorIndex]}
          subtitle="Hang tight while they choose a word or phrase."
        />
        {leaderboardDialog}
      </>
    );
  }

  if (phase === "pass") {
    const isFirstGuesser = guessedLetters.length === 0;
    return (
      <TurnHandoff
        playerName={playerNames[guesserIndex]}
        isMe={mySeat === guesserIndex}
        subtitle={
          isFirstGuesser ? "You'll be the first to guess this word." : "Your turn to guess a letter."
        }
        onReady={readyToGuess}
        pending={pending}
      />
    );
  }

  if (phase === "guess") {
    const isMyGuess = mySeat === guesserIndex;
    return (
      <>
        {leaderboardButton}
        {isMyGuess ? (
          <WordGuesser
            guesserName={playerNames[guesserIndex]}
            word={word}
            guessedLetters={guessedLetters}
            turnDuration={turnDuration}
            turnSeq={turnSeq}
            onGuess={guessLetter}
            onTimeUp={() => {}} // the turn-deadline watchdog handles the timeout, not the client component
            pending={pending}
          />
        ) : (
          <GuessSpectator
            guesserName={playerNames[guesserIndex]}
            word={word}
            guessedLetters={guessedLetters}
            turnDeadline={turnDeadline}
          />
        )}
        {leaderboardDialog}
      </>
    );
  }

  if (phase === "judge") {
    return (
      <RoundJudge
        word={word}
        players={playerNames}
        roundDelta={roundDelta}
        votes={judgeVotes}
        eligibleVoters={playerNames.length - 1}
        isGuesser={mySeat === guesserIndex}
        myVote={mySeat != null ? judgeVotes[mySeat] ?? null : null}
        onVote={isLocalMode ? judgeDecide : judgeVote}
        isLocalMode={isLocalMode}
        pending={pending}
      />
    );
  }

  // roundSummary: what just happened, plus the standings so far.
  const breakdown = playerNames
    .map((name, index) => ({ name, index, delta: roundDelta[index] }))
    .filter((entry) => entry.delta !== 0)
    .sort((a, b) => b.delta - a.delta);

  return (
    <div className={styles.reveal}>
      <div className={`card ${styles.panel}`}>
        {roundVoided ? (
          <h2 className={styles.revealTitle}>Word Rejected</h2>
        ) : (
          <h2 className={styles.revealTitle}>
            <Icon name="star" size={26} color="var(--gold)" />
            Solved!
          </h2>
        )}
        <p className={styles.revealWord}>{word.join("")}</p>
        {roundVoided ? <p className={styles.voidedNote}>No points were awarded this round.</p> : null}

        {!roundVoided && breakdown.length > 0 ? (
          <div className={styles.breakdown}>
            {breakdown.map((entry) => (
              <div key={entry.index} className={styles.breakdownRow}>
                <span>{entry.name}</span>
                <span className={entry.delta > 0 ? styles.gain : styles.loss}>
                  {entry.delta > 0 ? "+" : ""}
                  {entry.delta}
                </span>
              </div>
            ))}
          </div>
        ) : null}

        <p className={styles.leaderboardLabel}>Standings</p>
        <Leaderboard players={playerNames} score={score} />

        <button className={styles.continueButton} onClick={nextRound} disabled={pending}>
          {pending ? "Sending…" : "Continue"}
        </button>
      </div>
    </div>
  );
}

export default Gameplay;
