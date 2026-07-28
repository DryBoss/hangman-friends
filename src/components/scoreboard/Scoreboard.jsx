import styles from "./Scoreboard.module.css";
import Icon from "./../icon/Icon";
import Leaderboard from "./../leaderboard/Leaderboard";

function Scoreboard({ players, score, winnerIndex, onPlayAgain, onNewGame, isHost = true }) {
  return (
    <div className={styles.scoreboard}>
      <div className={`card ${styles.panel}`}>
        <div className={styles.starWrap}>
          <Icon name="star" size={40} color="var(--gold)" />
        </div>
        <h1 className={styles.title}>{players[winnerIndex]} Wins!</h1>
        <Leaderboard players={players} score={score} highlightIndex={winnerIndex} />
        <div className={styles.actions}>
          {isHost ? (
            <button onClick={onPlayAgain}>Play Again</button>
          ) : (
            <p className={styles.waitingNote}>Waiting for the host to start a new game…</p>
          )}
          <button className="btnGhost" onClick={onNewGame}>
            Leave Room
          </button>
        </div>
      </div>
    </div>
  );
}

export default Scoreboard;
