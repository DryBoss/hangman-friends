import styles from "./Word-selection.module.css";

function WordSelection({
  players,
  currentSelector,
  setWord,
  currentPlayer,
  setCurrentPlayer,
}) {
  return (
    <div className={styles.wordSelection}>
      <h3>{players[currentSelector]}</h3>
      <input
        type="text"
        onChange={(e) => setWord(e.target.value.toUpperCase().split(""))}
      />
      <button
        onClick={() => {
          setCurrentPlayer((currentPlayer + 1) % players.length);
        }}
      >
        Select
      </button>
    </div>
  );
}

export default WordSelection;
