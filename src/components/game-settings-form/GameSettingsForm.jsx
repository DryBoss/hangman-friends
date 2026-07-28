import Icon from "./../icon/Icon";
import styles from "./GameSettingsForm.module.css";

export const MIN_TURN_DURATION = 10;
export const MAX_TURN_DURATION = 120;
export const MIN_POINTS_TO_WIN = 5;
export const MAX_POINTS_TO_WIN = 500;
export const POINTS_STEP = 5;
export const DEFAULT_POINTS_TO_WIN = 100;
export const MIN_ROUNDS = 1;
export const MAX_ROUNDS = 30;
export const WORD_LENGTH_FLOOR = 2;
export const WORD_LENGTH_CEILING = 18;

export const DEFAULT_SETTINGS = {
  turnDuration: 30,
  noTimeLimit: false,
  gameMode: "points",
  pointsToWin: DEFAULT_POINTS_TO_WIN,
  roundsToPlay: 6,
  minWordLength: 3,
  maxWordLength: 10,
};

function isValidNumber(value, min, max) {
  return typeof value === "number" && Number.isFinite(value) && value >= min && value <= max;
}

// Validates every field independently against current bounds rather than
// trusting a saved blob wholesale - if a limit tightens later, or the
// value's just corrupted, that one field quietly falls back to default
// instead of breaking the whole settings load.
export function sanitizeSettings(parsed) {
  const settings = { ...DEFAULT_SETTINGS };
  if (!parsed || typeof parsed !== "object") return settings;

  if (typeof parsed.noTimeLimit === "boolean") settings.noTimeLimit = parsed.noTimeLimit;
  if (isValidNumber(parsed.turnDuration, MIN_TURN_DURATION, MAX_TURN_DURATION)) {
    settings.turnDuration = parsed.turnDuration;
  }
  if (parsed.gameMode === "points" || parsed.gameMode === "rounds") settings.gameMode = parsed.gameMode;
  if (isValidNumber(parsed.pointsToWin, MIN_POINTS_TO_WIN, MAX_POINTS_TO_WIN)) {
    settings.pointsToWin = parsed.pointsToWin;
  }
  if (isValidNumber(parsed.roundsToPlay, MIN_ROUNDS, MAX_ROUNDS)) settings.roundsToPlay = parsed.roundsToPlay;
  if (
    isValidNumber(parsed.minWordLength, WORD_LENGTH_FLOOR, WORD_LENGTH_CEILING) &&
    isValidNumber(parsed.maxWordLength, WORD_LENGTH_FLOOR, WORD_LENGTH_CEILING) &&
    parsed.minWordLength <= parsed.maxWordLength
  ) {
    settings.minWordLength = parsed.minWordLength;
    settings.maxWordLength = parsed.maxWordLength;
  }
  return settings;
}

// Controlled component: `settings` in, `onChange(nextSettings)` out. The
// caller owns persistence (localStorage, room creation payload, etc).
function GameSettingsForm({ settings, onChange }) {
  const {
    turnDuration, noTimeLimit, gameMode, pointsToWin, roundsToPlay, minWordLength, maxWordLength,
  } = settings;

  const patch = (fields) => onChange({ ...settings, ...fields });

  const clampTurnDuration = (val) => Math.min(MAX_TURN_DURATION, Math.max(MIN_TURN_DURATION, val));
  const clampPoints = (val) => Math.min(MAX_POINTS_TO_WIN, Math.max(MIN_POINTS_TO_WIN, val));
  const clampRounds = (val) => Math.min(MAX_ROUNDS, Math.max(MIN_ROUNDS, val));

  const handleMinWordLength = (delta) => {
    const next = Math.min(WORD_LENGTH_CEILING, Math.max(WORD_LENGTH_FLOOR, minWordLength + delta));
    patch({ minWordLength: next, maxWordLength: Math.max(next, maxWordLength) });
  };
  const handleMaxWordLength = (delta) => {
    const next = Math.min(WORD_LENGTH_CEILING, Math.max(WORD_LENGTH_FLOOR, maxWordLength + delta));
    patch({ maxWordLength: next, minWordLength: Math.min(next, minWordLength) });
  };

  return (
    <div className={styles.settingsGrid}>
      <div className={styles.gameRange}>
        <span className={styles.rangeLabel}>Turn Duration</span>
        {noTimeLimit ? (
          <div className={styles.rangeValue}>No limit</div>
        ) : (
          <div className={styles.rangeControl}>
            <button type="button" className={`${styles.stepper} btnGhost`}
              onClick={() => patch({ turnDuration: clampTurnDuration(turnDuration - 5) })}
              aria-label="Decrease turn duration">
              <Icon name="minus" size={18} />
            </button>
            <span className={styles.rangeValue}>{turnDuration}s</span>
            <button type="button" className={`${styles.stepper} btnGhost`}
              onClick={() => patch({ turnDuration: clampTurnDuration(turnDuration + 5) })}
              aria-label="Increase turn duration">
              <Icon name="plus" size={18} />
            </button>
          </div>
        )}
        <button type="button" className={`${styles.toggle} ${noTimeLimit ? "" : "btnGhost"}`}
          onClick={() => patch({ noTimeLimit: !noTimeLimit })}>
          {noTimeLimit ? "✓ No Time Limit" : "Enable No Time Limit"}
        </button>
      </div>

      <div className={styles.gameRange}>
        <span className={styles.rangeLabel}>Game Length</span>
        <div className={styles.modeSwitch}>
          <button type="button" className={gameMode === "points" ? "" : "btnGhost"}
            onClick={() => patch({ gameMode: "points" })}>
            Points
          </button>
          <button type="button" className={gameMode === "rounds" ? "" : "btnGhost"}
            onClick={() => patch({ gameMode: "rounds" })}>
            Rounds
          </button>
        </div>

        {gameMode === "points" ? (
          <>
            <div className={styles.rangeControl}>
              <button type="button" className={`${styles.stepper} btnGhost`}
                onClick={() => patch({ pointsToWin: clampPoints(pointsToWin - POINTS_STEP) })}
                aria-label="Decrease points to win">
                <Icon name="minus" size={18} />
              </button>
              <span className={styles.rangeValue}>{pointsToWin}</span>
              <button type="button" className={`${styles.stepper} btnGhost`}
                onClick={() => patch({ pointsToWin: clampPoints(pointsToWin + POINTS_STEP) })}
                aria-label="Increase points to win">
                <Icon name="plus" size={18} />
              </button>
            </div>
            <p className={styles.rangeCaption}>First to reach this score wins the game.</p>
          </>
        ) : (
          <>
            <div className={styles.rangeControl}>
              <button type="button" className={`${styles.stepper} btnGhost`}
                onClick={() => patch({ roundsToPlay: clampRounds(roundsToPlay - 1) })}
                aria-label="Decrease number of rounds">
                <Icon name="minus" size={18} />
              </button>
              <span className={styles.rangeValue}>{roundsToPlay}</span>
              <button type="button" className={`${styles.stepper} btnGhost`}
                onClick={() => patch({ roundsToPlay: clampRounds(roundsToPlay + 1) })}
                aria-label="Increase number of rounds">
                <Icon name="plus" size={18} />
              </button>
            </div>
            <p className={styles.rangeCaption}>
              Game ends after {roundsToPlay} word{roundsToPlay === 1 ? "" : "s"} - highest score wins.
            </p>
          </>
        )}
      </div>

      <div className={styles.gameRange}>
        <span className={styles.rangeLabel}>Word Length</span>
        <div className={styles.wordLengthRow}>
          <div className={styles.wordLengthField}>
            <span className={styles.wordLengthCaption}>Min</span>
            <div className={styles.rangeControl}>
              <button type="button" className={`${styles.stepper} btnGhost`}
                onClick={() => handleMinWordLength(-1)} aria-label="Decrease minimum word length">
                <Icon name="minus" size={18} />
              </button>
              <span className={styles.rangeValue}>{minWordLength}</span>
              <button type="button" className={`${styles.stepper} btnGhost`}
                onClick={() => handleMinWordLength(1)} aria-label="Increase minimum word length">
                <Icon name="plus" size={18} />
              </button>
            </div>
          </div>
          <div className={styles.wordLengthField}>
            <span className={styles.wordLengthCaption}>Max</span>
            <div className={styles.rangeControl}>
              <button type="button" className={`${styles.stepper} btnGhost`}
                onClick={() => handleMaxWordLength(-1)} aria-label="Decrease maximum word length">
                <Icon name="minus" size={18} />
              </button>
              <span className={styles.rangeValue}>{maxWordLength}</span>
              <button type="button" className={`${styles.stepper} btnGhost`}
                onClick={() => handleMaxWordLength(1)} aria-label="Increase maximum word length">
                <Icon name="plus" size={18} />
              </button>
            </div>
          </div>
        </div>
        <p className={styles.rangeCaption}>
          Secret words must be {minWordLength}
          {maxWordLength > minWordLength ? `-${maxWordLength}` : ""} letters.
        </p>
      </div>
    </div>
  );
}

export default GameSettingsForm;
