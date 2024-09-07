import { useState } from "react";
import styles from "./Word-guesser.module.css";

function WordGuesser({
  players,
  currentPlayer,
  setCurrentPlayer,
  word,
  guessedLetters,
  turnDuration,
}) {
  const keys = [
    ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
    ["A", "S", "D", "F", "G", "H", "J", "K", "L"],
    ["Z", "X", "C", "V", "B", "N", "M"],
  ];

  const [time, setTIme] = useState(turnDuration);
  let timer = setInterval(() => {
    setTIme(time - 1);
  }, 1000);

  function handleKeyClick(key) {}

  return (
    <div className={styles.wordGuesser}>
      <p>{time}</p>
      <h3>{players[currentPlayer]}</h3>
      <div className={styles.word}>
        {word.map((letter, index) => (
          <p className={styles.letter} key={index}>
            {guessedLetters.includes(letter) ? letter : ""}
          </p>
        ))}
      </div>
      <div className={styles.keyboard}>
        {keys.map((keysRow, index) => (
          <div className={styles.keyRows} key={index}>
            {keysRow.map((key, index) => (
              <p
                className={`${styles.key} ${
                  word.includes(key) ? styles.yes : styles.no
                }`}
                key={index}
                onClick={() => handleKeyClick({ key })}
              >
                {key}
              </p>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export default WordGuesser;
