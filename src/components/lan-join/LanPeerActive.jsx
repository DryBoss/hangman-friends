import styles from "./../lobby/Lobby.module.css";
import Gameplay from "./../gameplay/Gameplay";
import { useLanPeer } from "./../../hooks/useLanPeer";
import { getOrCreatePlayerId } from "./../../lib/playerIdentity";
import { useState } from "react";

function LanPeerActive({ hostUrl, name, onLeave }) {
  const playerId = useState(() => getOrCreatePlayerId(`lan-peer-${hostUrl}`))[0];
  const lan = useLanPeer(hostUrl, playerId, name);

  if (lan.connectionStatus === "error" || lan.connectionStatus === "closed") {
    return (
      <div className={styles.lobby}>
        <div className={`card ${styles.panel}`}>
          <p>{lan.connectionError || "Lost connection to the host."}</p>
          <button onClick={lan.reconnect}>Try Again</button>
          <button type="button" className="btnGhost" onClick={onLeave}>
            Back
          </button>
        </div>
      </div>
    );
  }

  if (lan.roomStatus === "playing" || lan.roomStatus === "finished") {
    return <Gameplay adapter={lan} onNewGame={onLeave} />;
  }

  return (
    <div className={styles.lobby}>
      <div className={styles.hero}>
        <h1 className={styles.title}>Local Game</h1>
      </div>
      <div className={`card ${styles.panel}`}>
        <p className={styles.sectionLabel}>
          Players <span className={styles.playerCount}>({lan.players.length})</span>
        </p>
        <p className={styles.hint}>Waiting for the host to start the game…</p>
        <div className={styles.playerList}>
          {lan.players.map((player) => (
            <div className={styles.playerRow} key={player.id}>
              <span className={styles.playerName}>
                {player.name}
                {player.isHost ? <span className={styles.hostBadge}>Host</span> : null}
                {player.id === playerId ? <span className={styles.youBadge}>You</span> : null}
              </span>
            </div>
          ))}
        </div>
      </div>
      <button type="button" className="btnGhost" onClick={onLeave}>
        Leave
      </button>
    </div>
  );
}

export default LanPeerActive;
