import { useState } from "react";
import styles from "./Join-game.module.css";
import { supabase } from "./../../lib/supabaseClient";
import { getOrCreatePlayerId } from "./../../lib/playerIdentity";

const NAME_STORAGE_KEY = "hangman-friends-host-name";

function loadSavedName() {
  try {
    return window.localStorage.getItem(NAME_STORAGE_KEY) || "";
  } catch {
    return "";
  }
}

async function joinRoom(rawCode, name) {
  const code = rawCode.trim().toUpperCase();
  const { data: room, error: roomError } = await supabase
    .from("rooms")
    .select("code, status")
    .eq("code", code)
    .maybeSingle();
  if (roomError) throw roomError;
  if (!room) throw new Error("No room found with that code - double check it with the host.");
  if (room.status !== "lobby") {
    throw new Error("That game has already started. Ask the host for a fresh room code.");
  }

  const playerId = getOrCreatePlayerId(code);
  // Upsert so reloading the join screen with the same identity (e.g. after
  // a refresh) doesn't create a duplicate player row.
  const { error: playerError } = await supabase
    .from("players")
    .upsert({ id: playerId, room_code: code, name, is_host: false }, { onConflict: "id" });
  if (playerError) throw playerError;
  return code;
}

function JoinGame({ initialCode, onJoined, onBack }) {
  const [code, setCode] = useState(initialCode || "");
  const [name, setName] = useState(loadSavedName);
  const [error, setError] = useState("");
  const [joining, setJoining] = useState(false);

  const handleJoin = async () => {
    const trimmedName = name.trim();
    if (code.trim().length === 0) {
      setError("Enter the room code.");
      return;
    }
    if (trimmedName.length === 0) {
      setError("Enter your name.");
      return;
    }
    setError("");
    setJoining(true);
    try {
      try {
        window.localStorage.setItem(NAME_STORAGE_KEY, trimmedName);
      } catch {
        // persistence is a nice-to-have
      }
      const joinedCode = await joinRoom(code, trimmedName);
      onJoined(joinedCode);
    } catch (err) {
      setError(err.message || "Couldn't join that room - check your connection and try again.");
    } finally {
      setJoining(false);
    }
  };

  return (
    <div className={styles.joinGame}>
      <div className={styles.hero}>
        <h1 className={styles.title}>Join a Game</h1>
        <p className={styles.tagline}>Enter the room code your host shared with you.</p>
      </div>

      <div className={`card ${styles.panel}`}>
        <p className={styles.sectionLabel}>Room Code</p>
        <input
          type="text"
          value={code}
          maxLength={6}
          autoCapitalize="characters"
          placeholder="e.g. BLTX9K"
          className={styles.codeInput}
          onChange={(e) => {
            setCode(e.target.value.toUpperCase());
            setError("");
          }}
        />

        <p className={styles.sectionLabel}>Your Name</p>
        <input
          type="text"
          value={name}
          maxLength={16}
          placeholder="e.g. Alex"
          className={styles.nameInput}
          onChange={(e) => {
            setName(e.target.value);
            setError("");
          }}
        />
      </div>

      <div className={styles.errorSlot}>{error || "\u00A0"}</div>

      <button className={styles.joinButton} onClick={handleJoin} disabled={joining}>
        {joining ? "Joining…" : "Join Room"}
      </button>
      <button type="button" className="btnGhost" onClick={onBack}>
        Back
      </button>
    </div>
  );
}

export default JoinGame;
