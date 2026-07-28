import { useState } from "react";
import styles from "./Word-selection.module.css";

// Letters, plus single spaces/hyphens *between* letter groups - never at the
// start, the end, or doubled up (a group of one-or-more letters, repeated,
// each joined by exactly one separator).
const WORD_PATTERN = /^[a-zA-Z]+([ -][a-zA-Z]+)*$/;

function validate(value, minLength, maxLength) {
  if (value.length === 0) return null;
  if (!WORD_PATTERN.test(value)) {
    return "Letters only - spaces or hyphens allowed, but not at the start, end, or doubled up.";
  }
  const letterCount = value.replace(/[ -]/g, "").length;
  if (letterCount < minLength) return `At least ${minLength} letters.`;
  if (letterCount > maxLength) return `${maxLength} letters max.`;
  return null;
}

function WordSelection({ players, selectorIndex, minLength, maxLength, onSelectWord }) {
  const [value, setValue] = useState("");
  const [touched, setTouched] = useState(false);

  const error = validate(value, minLength, maxLength);
  const canSubmit = value.length > 0 && !error;

  const submit = () => {
    if (!canSubmit) {
      setTouched(true);
      return;
    }
    onSelectWord(value);
  };

  const lengthHint =
    minLength === maxLength ? `exactly ${minLength}` : `${minLength}-${maxLength}`;

  return (
    <div className={styles.wordSelection}>
      <div className={`card ${styles.panel}`}>
        <h3 className={styles.heading}>
          {players[selectorIndex]}, enter a secret word
        </h3>
        <p className={styles.hint}>
          {lengthHint} letters. Spaces or hyphens allowed in the middle (e.g.
          "well-known"). Make sure no one else can see your screen!
        </p>
        <input
          type="text"
          autoFocus
          value={value}
          maxLength={maxLength * 2}
          placeholder="secret word or phrase"
          className={styles.wordInput}
          onChange={(e) => {
            setValue(e.target.value.replace(/[^a-zA-Z -]/g, ""));
            setTouched(false);
          }}
          onKeyDown={(e) => e.key === "Enter" && submit()}
        />
        <div className={styles.errorSlot}>
          {touched && error ? error : "\u00A0"}
        </div>
        <button
          className={styles.selectButton}
          disabled={!canSubmit}
          onClick={submit}
        >
          Lock It In
        </button>
      </div>
    </div>
  );
}

export default WordSelection;
