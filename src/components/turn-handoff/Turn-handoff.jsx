import styles from "./Turn-handoff.module.css";
import Icon from "./../icon/Icon";

// Used for the "pass" phase between word selection and guessing. Online,
// nobody's literally handing over a device - but the beat of "ok, get
// ready, here we go" is still worth keeping, so the player about to guess
// sees a "your turn" card with a ready button, and everyone else sees the
// same card without one, just waiting.
function TurnHandoff({ playerName, subtitle, isMe, onReady, pending = false }) {
  return (
    <div className={styles.passDevice}>
      <div className={`card ${styles.panel}`}>
        <div className={styles.iconWrap}>
          <Icon name="arrowRight" size={32} color="var(--primary)" />
        </div>
        <p className={styles.eyebrow}>{isMe ? "Your turn is up next" : "Up next"}</p>
        <h2 className={styles.name}>{playerName}</h2>
        {subtitle ? <p className={styles.subtitle}>{subtitle}</p> : null}
        {isMe ? (
          <button className={styles.readyButton} onClick={onReady} disabled={pending}>
            {pending ? "Sending…" : "I'm Ready"}
          </button>
        ) : (
          <p className={styles.subtitle}>Waiting for {playerName} to get ready…</p>
        )}
      </div>
    </div>
  );
}

export default TurnHandoff;
