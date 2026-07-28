import { useRef, useState } from "react";
import styles from "./Local-setup.module.css";
import Icon from "./../icon/Icon";
import GameSettingsForm, { DEFAULT_SETTINGS, sanitizeSettings } from "./../game-settings-form/GameSettingsForm";

const SETTINGS_STORAGE_KEY = "hangman-friends-local-settings";
const NAMES_STORAGE_KEY = "hangman-friends-local-names";
const MIN_PLAYERS = 2;
const MAX_PLAYERS = 10;

function loadSavedSettings() {
  try {
    const raw = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
    return sanitizeSettings(raw ? JSON.parse(raw) : null);
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

function loadSavedNames() {
  try {
    const raw = window.localStorage.getItem(NAMES_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    if (Array.isArray(parsed) && parsed.every((n) => typeof n === "string")) return parsed;
  } catch {
    // fall through to default
  }
  return ["", ""];
}

function LocalSetup({ onStart, onBack }) {
  const savedSettingsRef = useRef(null);
  if (savedSettingsRef.current === null) savedSettingsRef.current = loadSavedSettings();

  const [names, setNames] = useState(loadSavedNames);
  const [settings, setSettings] = useState(savedSettingsRef.current);
  const [error, setError] = useState("");

  const updateName = (index, value) => {
    setNames((prev) => prev.map((n, i) => (i === index ? value : n)));
    setError("");
  };

  const addPlayer = () => {
    if (names.length >= MAX_PLAYERS) return;
    setNames((prev) => [...prev, ""]);
  };

  const removePlayer = (index) => {
    if (names.length <= MIN_PLAYERS) return;
    setNames((prev) => prev.filter((_, i) => i !== index));
  };

  const move = (index, direction) => {
    const target = index + direction;
    if (target < 0 || target >= names.length) return;
    setNames((prev) => {
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const handleStart = () => {
    const trimmed = names.map((n) => n.trim());
    if (trimmed.some((n) => n.length === 0)) {
      setError("Every player needs a name.");
      return;
    }
    try {
      window.localStorage.setItem(NAMES_STORAGE_KEY, JSON.stringify(trimmed));
      window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    } catch {
      // persistence is a nice-to-have
    }
    onStart(trimmed, settings);
  };

  return (
    <div className={styles.localSetup}>
      <div className={styles.hero}>
        <h1 className={styles.title}>Play on This Device</h1>
        <p className={styles.tagline}>Pass the phone around - everyone plays from the same screen.</p>
      </div>

      <div className={`card ${styles.panel}`}>
        <p className={styles.sectionLabel}>
          Players <span className={styles.playerCount}>({names.length})</span>
        </p>
        <div className={styles.playerList}>
          {names.map((name, index) => (
            <div className={styles.playerRow} key={index}>
              <input
                type="text"
                value={name}
                maxLength={16}
                placeholder={`Player ${index + 1}`}
                onChange={(e) => updateName(index, e.target.value)}
              />
              <button type="button" className={styles.iconButton} disabled={index === 0}
                onClick={() => move(index, -1)} aria-label={`Move player ${index + 1} up`}>
                <Icon name="arrowUp" size={16} />
              </button>
              <button type="button" className={styles.iconButton} disabled={index === names.length - 1}
                onClick={() => move(index, 1)} aria-label={`Move player ${index + 1} down`}>
                <Icon name="arrowDown" size={16} />
              </button>
              <button type="button" className={styles.deleteButton} disabled={names.length <= MIN_PLAYERS}
                onClick={() => removePlayer(index)} aria-label={`Remove player ${index + 1}`}>
                <Icon name="trash" size={18} />
              </button>
            </div>
          ))}
        </div>
        <button type="button" className="btnGhost" onClick={addPlayer} disabled={names.length >= MAX_PLAYERS}>
          <Icon name="plus" size={16} /> Add Player
        </button>

        <p className={styles.sectionLabel}>Settings</p>
        <GameSettingsForm settings={settings} onChange={setSettings} />
      </div>

      <div className={styles.errorSlot}>{error || "\u00A0"}</div>

      <button className={styles.startGame} onClick={handleStart}>
        Start Game
      </button>
      <button type="button" className="btnGhost" onClick={onBack}>
        Back
      </button>
    </div>
  );
}

export default LocalSetup;
