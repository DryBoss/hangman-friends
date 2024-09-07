import styles from "./Scoreboard.module.css";

function ScoreBoard({ players, score }) {
  return (
    <div className={styles.scoreboard}>
      <h3>Scoreboard</h3>
      {players.map((player, index) => (
        <p key={index}>
          {player} - {score[index]}
        </p>
      ))}
    </div>
  );
}

export default ScoreBoard;
