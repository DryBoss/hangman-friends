import styles from "./Word-guesser.module.css";

function WordGuesser({ word, guessedLetters }) {
  return (
    <div className={styles.wordGuesser}>
      <div className={styles.word}>
        {word.map((letter, index) => (
          <p className={styles.letter} key={index}>
            {guessedLetters.includes(letter) ? letter : ""}
          </p>
        ))}
      </div>
    </div>
  );
}

export default WordGuesser;
