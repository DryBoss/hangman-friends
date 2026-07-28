import Leaderboard from "./../leaderboard/Leaderboard";
import Icon from "./../icon/Icon";
import styles from "./LeaderboardDialog.module.css";

// Mid-game standings, shown on demand instead of a strip pinned to the top
// of the screen - keeps the actual word/guessing UI from ever competing
// with score chips for space (and the scroll that caused).
function LeaderboardDialog({ players, score, progressLabel, highlightIndex, onClose }) {
  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={`card ${styles.dialog}`} onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          className={styles.closeButton}
          aria-label="Close standings"
          onClick={onClose}
        >
          <Icon name="plus" size={18} className={styles.closeIcon} />
        </button>
        <h3 className={styles.heading}>Standings</h3>
        {progressLabel ? <p className={styles.progress}>{progressLabel}</p> : null}
        <Leaderboard players={players} score={score} highlightIndex={highlightIndex} />
      </div>
    </div>
  );
}

export default LeaderboardDialog;
