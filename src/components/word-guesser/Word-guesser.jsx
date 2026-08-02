import { useEffect, useRef, useState } from "react";
import styles from "./Word-guesser.module.css";

const keyRows = [
  ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
  ["A", "S", "D", "F", "G", "H", "J", "K", "L"],
  ["Z", "X", "C", "V", "B", "N", "M"],
];

function WordGuesser({
  guesserName,
  word,
  guessedLetters,
  turnDuration, // null/undefined means no time limit
  turnSeq,
  onGuess,
  onTimeUp,
  pending = false,
}) {
  const timerEnabled = turnDuration != null;
  const [time, setTime] = useState(timerEnabled ? turnDuration : null);
  const onTimeUpRef = useRef(onTimeUp);
  onTimeUpRef.current = onTimeUp;

  // Reset the clock every time a turn restarts - a new letter guessed,
  // or a same-player timeout/wrong-guess that didn't change the guesser.
  useEffect(() => {
    if (!timerEnabled) return;
    setTime(turnDuration);
  }, [turnSeq, turnDuration, timerEnabled]);

  // Tick every second; report exactly once when it hits zero.
  useEffect(() => {
    if (!timerEnabled) return;
    if (time <= 0) {
      onTimeUpRef.current();
      return;
    }
    const timer = setInterval(() => {
      setTime((t) => t - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [time, timerEnabled]);

  // Let players use a physical keyboard too.
  useEffect(() => {
    function handleKeyDown(e) {
      if (pending) return;
      const letter = e.key.toUpperCase();
      if (/^[A-Z]$/.test(letter)) onGuess(letter);
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onGuess, pending]);

  const lowOnTime = timerEnabled && time <= 5;

  return (
    <div className={styles.wordGuesser}>
      <div className={styles.topBar}>
        <h3>{guesserName}'s turn</h3>
        {timerEnabled ? (
          <div className={`${styles.timer} ${lowOnTime ? styles.timerLow : ""}`}>
            {time}s
          </div>
        ) : (
          <div className={styles.timer}>∞</div>
        )}
      </div>

      <div className={styles.word}>
        {word.map((letter, index) => {
          if (letter === " ") {
            return <span key={index} className={styles.wordGap} aria-hidden="true" />;
          }
          if (letter === "-") {
            return (
              <p key={index} className={styles.wordSeparator}>
                -
              </p>
            );
          }
          return <p key={index}>{guessedLetters.includes(letter) ? letter : ""}</p>;
        })}
      </div>

      <div className={styles.valueHint}>
        {pending ? (
          "Sending…"
        ) : (
          <>
            Each correct letter is worth <strong>1 point</strong>, plus a{" "}
            <strong>+2 bonus</strong> for finishing the word - nothing lost if wrong,
            but running out the clock costs <strong>-1</strong>
          </>
        )}
      </div>

      <div className={styles.keyboard}>
        {keyRows.map((row, rowIndex) => (
          <div className={styles.keyRow} key={rowIndex}>
            {row.map((key) => {
              const guessed = guessedLetters.includes(key);
              const correct = guessed && word.includes(key);
              return (
                <button
                  type="button"
                  key={key}
                  disabled={guessed || pending}
                  className={`${styles.key} ${
                    guessed ? (correct ? styles.yes : styles.no) : ""
                  }`}
                  onClick={() => onGuess(key)}
                >
                  {key}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

export default WordGuesser;
