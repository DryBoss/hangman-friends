import styles from "./../turn-handoff/Turn-handoff.module.css";
import Icon from "./../icon/Icon";

function Waiting({ eyebrow, name, subtitle }) {
  return (
    <div className={styles.passDevice}>
      <div className={`card ${styles.panel}`}>
        <div className={styles.iconWrap}>
          <Icon name="arrowRight" size={32} color="var(--primary)" />
        </div>
        <p className={styles.eyebrow}>{eyebrow}</p>
        <h2 className={styles.name}>{name}</h2>
        {subtitle ? <p className={styles.subtitle}>{subtitle}</p> : null}
      </div>
    </div>
  );
}

export default Waiting;
