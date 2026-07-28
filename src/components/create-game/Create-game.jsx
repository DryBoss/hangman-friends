import { useRef, useState } from "react";
import styles from "./Create-game.module.css";
import { supabase } from "./../../lib/supabaseClient";
import { generateRoomCode, getOrCreatePlayerId } from "./../../lib/playerIdentity";
import GameSettingsForm, { DEFAULT_SETTINGS, sanitizeSettings } from "./../game-settings-form/GameSettingsForm";

const NAME_STORAGE_KEY = "hangman-friends-host-name";
const SETTINGS_STORAGE_KEY = "hangman-friends-online-settings";

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

// Host creates the room row + settings, then joins it as the first player.
// Everyone else joins later from the Lobby via JoinGame - there's no local
// player list to fill in here, since players show up on their own devices.
async function createRoom(hostName, settings) {
  const trimmedSettings = {
    turnDuration: settings.noTimeLimit ? null : settings.turnDuration,
    gameMode: settings.gameMode,
    pointsToWin: settings.pointsToWin,
    roundsToPlay: settings.roundsToPlay,
    minWordLength: settings.minWordLength,
    maxWordLength: settings.maxWordLength,
  };

  // Retry a couple of times on the rare chance a generated code collides
  // with an existing room.
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateRoomCode();
    const playerId = getOrCreatePlayerId(code);
    const { error: roomError } = await supabase
      .from("rooms")
      .insert({ code, host_player_id: playerId, settings: trimmedSettings, status: "lobby" });
    if (roomError) {
      if (roomError.code === "23505") continue; // code collision - try another
      throw roomError;
    }
    const { error: playerError } = await supabase
      .from("players")
      .insert({ id: playerId, room_code: code, name: hostName, is_host: true });
    if (playerError) throw playerError;
    return code;
  }
  throw new Error("Couldn't generate a free room code - please try again.");
}

function CreateGame({ onRoomCreated, onShowJoin, onBack }) {
  const savedSettingsRef = useRef(null);
  if (savedSettingsRef.current === null) savedSettingsRef.current = loadSavedSettings();

  const [hostName, setHostName] = useState(loadSavedName);
  const [settings, setSettings] = useState(savedSettingsRef.current);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);

  const handleCreateRoom = async () => {
    const trimmedName = hostName.trim();
    if (trimmedName.length === 0) {
      setError("Enter your name.");
      return;
    }
    setError("");
    setCreating(true);
    try {
      try {
        window.localStorage.setItem(NAME_STORAGE_KEY, trimmedName);
        window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
      } catch {
        // persistence is a nice-to-have, not required for the game to start
      }
      const code = await createRoom(trimmedName, settings);
      onRoomCreated(code);
    } catch (err) {
      setError(err.message || "Couldn't create the room - check your connection and try again.");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className={styles.createGame}>
      <div className={styles.hero}>
        <h1 className={styles.title}>Host Online Room</h1>
        <p className={styles.tagline}>Get a room code, share it, and play from separate phones anywhere.</p>
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

      <button className={styles.startGame} onClick={handleCreateRoom} disabled={creating}>
        {creating ? "Creating Room…" : "Create Room"}
      </button>
      <button type="button" className="btnGhost" onClick={onShowJoin}>
        Have a room code instead? Join a game
      </button>
      <button type="button" className="btnGhost" onClick={onBack}>
        Back
      </button>
    </div>
  );
}

export default CreateGame;
