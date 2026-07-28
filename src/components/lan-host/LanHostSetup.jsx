import { useRef, useState } from "react";
import styles from "./../create-game/Create-game.module.css";
import GameSettingsForm, { DEFAULT_SETTINGS, sanitizeSettings } from "./../game-settings-form/GameSettingsForm";

const NAME_STORAGE_KEY = "hangman-friends-host-name";
const SETTINGS_STORAGE_KEY = "hangman-friends-lan-settings";

function loadSavedSettings() {
  try {
    const raw = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
    return sanitizeSettings(raw ? JSON.parse(raw) : null);
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

function loadSavedName() {
  try {
    return window.localStorage.getItem(NAME_STORAGE_KEY) || "";
  } catch {
    return "";
  }
}

function LanHostSetup({ onStart, onShowJoin, onBack }) {
  const savedSettingsRef = useRef(null);
  if (savedSettingsRef.current === null) savedSettingsRef.current = loadSavedSettings();

  const [hostName, setHostName] = useState(loadSavedName);
  const [settings, setSettings] = useState(savedSettingsRef.current);
  const [error, setError] = useState("");

  const handleStart = () => {
    const trimmed = hostName.trim();
    if (trimmed.length === 0) {
      setError("Enter your name.");
      return;
    }
    try {
      window.localStorage.setItem(NAME_STORAGE_KEY, trimmed);
      window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    } catch {
      // persistence is a nice-to-have
    }
    onStart(trimmed, settings);
  };

  return (
    <div className={styles.createGame}>
      <div className={styles.hero}>
        <h1 className={styles.title}>Host Local Game</h1>
        <p className={styles.tagline}>
          Everyone joins over the same WiFi - no internet needed once you're all connected.
        </p>
      </div>

      <div className={`card ${styles.panel}`}>
        <p className={styles.sectionLabel}>Your Name</p>
        <input
          type="text"
          value={hostName}
          maxLength={16}
          placeholder="e.g. Alex"
          className={styles.nameInput}
          onChange={(e) => {
            setHostName(e.target.value);
            setError("");
          }}
        />

        <p className={styles.sectionLabel}>Settings</p>
        <GameSettingsForm settings={settings} onChange={setSettings} />
      </div>

      <div className={styles.errorSlot}>{error || "\u00A0"}</div>

      <button className={styles.startGame} onClick={handleStart}>
        Start Hosting
      </button>
      <button type="button" className="btnGhost" onClick={onShowJoin}>
        Joining someone else's game instead? Enter their address
      </button>
      <button type="button" className="btnGhost" onClick={onBack}>
        Back
      </button>
    </div>
  );
}

export default LanHostSetup;
