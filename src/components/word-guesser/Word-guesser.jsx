import { useState } from "react";
import styles from "./Word-guesser.module.css";

function WordGuesser({
  players,
  currentPlayer,
  setCurrentPlayer,
  word,
  guessedLetters,
  setGuessedLetters,
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
    if (time == 0) {
      setCurrentPlayer((currentPlayer + 1) % players.length);
      time = 30;
    }
  }, 1000);

  function handleKeyClick(key) {
    if (!guessedLetters.includes(key)) {
      if (word.includes(key)) {
        if (word.every((letter) => guessedLetters.includes(letter))) {
        } else {
          time = 30;
          setGuessedLetters(...guessedLetters, key);
        }
      } else {
      }
    }
  }

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
                  guessedLetters.includes(key)
                    ? word.includes(key)
                      ? styles.yes
                      : styles.no
                    : ""
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
