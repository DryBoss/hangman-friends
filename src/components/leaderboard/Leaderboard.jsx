import styles from "./Leaderboard.module.css";

function Leaderboard({ players, score, highlightIndex }) {
  const ranking = players
    .map((name, index) => ({ name, points: score[index], index }))
    .sort((a, b) => b.points - a.points);

  return (
    <div className={styles.list}>
      {ranking.map((entry, rank) => (
        <div
          key={entry.index}
          className={`${styles.row} ${
            entry.index === highlightIndex ? styles.highlightRow : ""
          }`}
        >
          <span className={styles.rank}>#{rank + 1}</span>
          <span className={styles.name}>{entry.name}</span>
          <span className={styles.points}>{entry.points} pts</span>
        </div>
      ))}
    </div>
  );
}

export default Leaderboard;
