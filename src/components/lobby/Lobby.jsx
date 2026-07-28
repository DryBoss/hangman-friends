import { useEffect, useMemo, useState } from "react";
import styles from "./Lobby.module.css";
import Icon from "./../icon/Icon";
import { supabase } from "./../../lib/supabaseClient";
import { useRoomSync } from "./../../hooks/useRoomSync";
import { useGameActions } from "./../../hooks/useGameActions";

function shareLink(roomCode) {
  const url = new URL(window.location.href);
  url.search = `?join=${roomCode}`;
  return url.toString();
}

// Players show up in seat_index order once any have been assigned (the
// host has reordered), otherwise in join order - either way, everyone in
// the room sees the same sequence since it comes straight from the synced
// `players` rows.
function sortedPlayers(players) {
  const anySeated = players.some((p) => p.seat_index !== null);
  if (!anySeated) return [...players].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  return [...players].sort((a, b) => (a.seat_index ?? 999) - (b.seat_index ?? 999));
}

function Lobby({ roomCode, playerId, onGameStarted, onLeave }) {
  const { room, players, me, loading } = useRoomSync(roomCode, playerId);
  const { startGame, error } = useGameActions(roomCode, playerId);
  const [copied, setCopied] = useState(false);
  const [starting, setStarting] = useState(false);

  const ordered = useMemo(() => sortedPlayers(players), [players]);
  const isHost = me?.is_host ?? false;
  const gameStarted = room?.status === "playing" || room?.status === "finished";

  useEffect(() => {
    if (gameStarted) onGameStarted();
  }, [gameStarted, onGameStarted]);

  if (loading) {
    return <div className={styles.lobby}><p className={styles.loadingText}>Loading room…</p></div>;
  }
  if (!room) {
    return (
      <div className={styles.lobby}>
        <div className={`card ${styles.panel}`}>
          <p>That room no longer exists.</p>
          <button className="btnGhost" onClick={onLeave}>Back to start</button>
        </div>
      </div>
    );
  }
  if (gameStarted) return null;

  const link = shareLink(roomCode);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard API unavailable - the link is still selectable/visible
    }
  };

  const shareOrCopy = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: "Join my Hangman Friends game", url: link });
        return;
      } catch {
        // user cancelled the share sheet - fall through to copy
      }
    }
    copyLink();
  };

  const move = async (index, direction) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= ordered.length) return;
    const next = [...ordered];
    [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
    await Promise.all(next.map((p, i) => supabase.from("players").update({ seat_index: i }).eq("id", p.id)));
  };

  const handleStart = async () => {
    setStarting(true);
    await startGame();
    setStarting(false);
  };

  return (
    <div className={styles.lobby}>
      <div className={styles.hero}>
        <h1 className={styles.title}>Room Code</h1>
        <div className={styles.codeRow}>
          <span className={styles.code}>{roomCode}</span>
          <button type="button" className={styles.iconButton} onClick={copyLink} aria-label="Copy invite link">
            <Icon name="copy" size={20} />
          </button>
          <button type="button" className={styles.iconButton} onClick={shareOrCopy} aria-label="Share invite link">
            <Icon name="share" size={20} />
          </button>
        </div>
        {copied ? <p className={styles.copiedNote}>Link copied!</p> : null}
      </div>

      <div className={`card ${styles.panel}`}>
        <p className={styles.sectionLabel}>
          Players <span className={styles.playerCount}>({ordered.length})</span>
        </p>
        <p className={styles.hint}>
          {isHost
            ? "Reorder players with the arrows to set turn order, then start when everyone's in."
            : "Waiting for the host to start the game…"}
        </p>
        <div className={styles.playerList}>
          {ordered.map((player, index) => (
            <div className={styles.playerRow} key={player.id}>
              <span className={styles.playerName}>
                {player.name}
                {player.is_host ? <span className={styles.hostBadge}>Host</span> : null}
                {player.id === playerId ? <span className={styles.youBadge}>You</span> : null}
              </span>
              {isHost ? (
                <div className={styles.reorderButtons}>
                  <button
                    type="button"
                    className={styles.iconButton}
                    disabled={index === 0}
                    onClick={() => move(index, -1)}
                    aria-label={`Move ${player.name} up`}
                  >
                    <Icon name="arrowUp" size={16} />
                  </button>
                  <button
                    type="button"
                    className={styles.iconButton}
                    disabled={index === ordered.length - 1}
                    onClick={() => move(index, 1)}
                    aria-label={`Move ${player.name} down`}
                  >
                    <Icon name="arrowDown" size={16} />
                  </button>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </div>

      <div className={styles.errorSlot}>{error || "\u00A0"}</div>

      {isHost ? (
        <button className={styles.startButton} onClick={handleStart} disabled={ordered.length < 2 || starting}>
          {starting ? "Starting…" : ordered.length < 2 ? "Waiting for more players…" : "Start Game"}
        </button>
      ) : null}
      <button type="button" className="btnGhost" onClick={onLeave}>
        Leave Room
      </button>
    </div>
  );
}

export default Lobby;
