import { useEffect, useState } from "react";
import styles from "./../word-guesser/Word-guesser.module.css";

const keyRows = [
  ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
  ["A", "S", "D", "F", "G", "H", "J", "K", "L"],
  ["Z", "X", "C", "V", "B", "N", "M"],
];

function GuessSpectator({ guesserName, word, guessedLetters, turnDeadline }) {
  const [remaining, setRemaining] = useState(null);

  useEffect(() => {
    if (!turnDeadline) {
      setRemaining(null);
      return;
    }
    const tick = () =>
      setRemaining(Math.max(0, Math.round((new Date(turnDeadline).getTime() - Date.now()) / 1000)));
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [turnDeadline]);

  const lowOnTime = remaining != null && remaining <= 5;

  return (
    <div className={styles.wordGuesser}>
      <div className={styles.topBar}>
        <h3>{guesserName}'s turn</h3>
        <div className={`${styles.timer} ${lowOnTime ? styles.timerLow : ""}`}>
          {remaining == null ? "∞" : `${remaining}s`}
        </div>
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
          return <p key={index}>{letter ?? ""}</p>;
        })}
      </div>

      <div className={styles.valueHint}>Waiting for {guesserName} to guess a letter…</div>

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
                  disabled
                  className={`${styles.key} ${guessed ? (correct ? styles.yes : styles.no) : ""}`}
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

export default GuessSpectator;
