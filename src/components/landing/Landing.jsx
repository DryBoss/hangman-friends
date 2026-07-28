import styles from "./Landing.module.css";
import Icon from "./../icon/Icon";

function Landing({ onSelectMode }) {
  return (
    <div className={styles.landing}>
      <div className={styles.hero}>
        <h1 className={styles.title}>Hangman Friends</h1>
        <p className={styles.tagline}>Pick how you want to play.</p>
      </div>

      <div className={styles.modeList}>
        <button type="button" className={`card ${styles.modeCard}`} onClick={() => onSelectMode("local")}>
          <Icon name="arrowRight" size={26} color="var(--primary)" />
          <span className={styles.modeTitle}>Play on This Device</span>
          <span className={styles.modeDesc}>Pass the phone around - one screen, everyone takes turns.</span>
        </button>

        <button type="button" className={`card ${styles.modeCard}`} onClick={() => onSelectMode("online")}>
          <Icon name="share" size={26} color="var(--primary)" />
          <span className={styles.modeTitle}>Online (Room Code)</span>
          <span className={styles.modeDesc}>Everyone plays from their own phone, anywhere with internet.</span>
        </button>

        <button type="button" className={`card ${styles.modeCard}`} onClick={() => onSelectMode("lan")}>
          <Icon name="grip" size={26} color="var(--primary)" />
          <span className={styles.modeTitle}>Local Network (WiFi)</span>
          <span className={styles.modeDesc}>Own phones, same WiFi/hotspot, no internet required.</span>
        </button>
      </div>
    </div>
  );
}

export default Landing;
