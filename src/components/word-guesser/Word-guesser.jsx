import { useEffect, useState } from "react";
import styles from "./Word-guesser.module.css";

function WordGuesser({
  players,
  currentSelector,
  setCurrentSelector,
  currentPlayer,
  setCurrentPlayer,
  word,
  setWord,
  guessedLetters,
  setGuessedLetters,
  turnDuration,
  score,
  setScore,
}) {
  let guessedLettersVar = [];

  const keys = [
    ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
    ["A", "S", "D", "F", "G", "H", "J", "K", "L"],
    ["Z", "X", "C", "V", "B", "N", "M"],
  ];

  const [time, setTime] = useState(turnDuration);

  function handleKeyClick(key) {
    if (!guessedLetters.includes(key)) {
      setGuessedLetters([...guessedLetters, key]);
      guessedLettersVar = [...guessedLetters, key];
      if (word.includes(key)) {
        if (word.every((letter) => guessedLettersVar.includes(letter))) {
          let newScore = score;
          newScore[currentPlayer] += 1;
          setScore(newScore);
          const newSelector = (currentSelector + 1) % players.length;
          setCurrentSelector(newSelector);
          setCurrentPlayer(newSelector);
          setWord([]);
          setGuessedLetters([]);
        } else {
          setTime(30);
        }
      } else {
        setTime(30);
        setCurrentPlayer((currentPlayer + 1) % players.length);
      }
    }
  }

  // Timer logic
  useEffect(() => {
    if (time <= 0) {
      // Handle the end of the timer
      setCurrentPlayer((currentPlayer + 1) % players.length);
      setTime(turnDuration); // Reset the timer
      return;
    }

    const timer = setInterval(() => {
      setTime((prevTime) => prevTime - 1);
    }, 1000);

    return () => clearInterval(timer); // Clean up the interval on unmount
  }, [time, currentPlayer, setCurrentPlayer, turnDuration]);

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
                onClick={() => handleKeyClick(key)}
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
