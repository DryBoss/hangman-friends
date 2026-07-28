import { useEffect, useState } from "react";
import QRCode from "qrcode";
import styles from "./../lobby/Lobby.module.css";
import Icon from "./../icon/Icon";
import Gameplay from "./../gameplay/Gameplay";
import { useLanHost } from "./../../hooks/useLanHost";

function joinUrl(ipAddress, port) {
  if (!ipAddress) return null;
  return `hangmanfriends://join?ip=${ipAddress}&port=${port}`;
}

function LanHostActive({ hostName, settings, onLeave }) {
  const hostPlayerId = useState(() => crypto.randomUUID())[0];
  const lan = useLanHost(hostPlayerId, hostName, settings);
  const [qrDataUrl, setQrDataUrl] = useState(null);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    const url = joinUrl(lan.ipAddress, lan.port);
    if (!url) {
      setQrDataUrl(null);
      return;
    }
    let cancelled = false;
    QRCode.toDataURL(url, { margin: 1, width: 220 })
      .then((dataUrl) => !cancelled && setQrDataUrl(dataUrl))
      .catch(() => !cancelled && setQrDataUrl(null));
    return () => {
      cancelled = true;
    };
  }, [lan.ipAddress, lan.port]);

  if (lan.roomStatus === "playing" || lan.roomStatus === "finished") {
    return <Gameplay adapter={lan} onNewGame={onLeave} />;
  }

  const connectString = lan.ipAddress ? `${lan.ipAddress}:${lan.port}` : null;

  return (
    <div className={styles.lobby}>
      <div className={styles.hero}>
        <h1 className={styles.title}>Local Game</h1>
        {connectString ? (
          <>
            <div className={styles.codeRow}>
              <span className={styles.code} style={{ fontSize: "1.4rem", letterSpacing: 0 }}>
                {connectString}
              </span>
            </div>
            <p className={styles.copiedNote} style={{ color: "var(--muted)" }}>
              Others: same WiFi, then "Join Local Game" and enter this
            </p>
          </>
        ) : lan.connectionError ? (
          <p className={styles.copiedNote} style={{ color: "var(--danger)" }}>{lan.connectionError}</p>
        ) : (
          <p className={styles.copiedNote} style={{ color: "var(--muted)" }}>Starting local server…</p>
        )}
      </div>

      {qrDataUrl ? (
        <div className={`card ${styles.panel}`} style={{ alignItems: "center" }}>
          <img src={qrDataUrl} alt="Scan to join" width={180} height={180} />
          <p className={styles.hint}>Or scan this from another phone's camera</p>
        </div>
      ) : null}

      <div className={`card ${styles.panel}`}>
        <p className={styles.sectionLabel}>
          Players <span className={styles.playerCount}>({lan.players.length})</span>
        </p>
        <p className={styles.hint}>Reorder with the arrows to set turn order, then start when everyone's in.</p>
        <div className={styles.playerList}>
          {lan.players.map((player, index) => (
            <div className={styles.playerRow} key={player.id}>
              <span className={styles.playerName}>
                {player.name}
                {player.isHost ? <span className={styles.hostBadge}>Host</span> : null}
                {!player.connected ? <span className={styles.youBadge}>Offline</span> : null}
              </span>
              <div className={styles.reorderButtons}>
                <button type="button" className={styles.iconButton} disabled={index === 0}
                  onClick={() => lan.movePlayer(index, -1)} aria-label={`Move ${player.name} up`}>
                  <Icon name="arrowUp" size={16} />
                </button>
                <button type="button" className={styles.iconButton} disabled={index === lan.players.length - 1}
                  onClick={() => lan.movePlayer(index, 1)} aria-label={`Move ${player.name} down`}>
                  <Icon name="arrowDown" size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <button
        className={styles.startButton}
        disabled={lan.players.length < 2 || starting}
        onClick={() => {
          setStarting(true);
          lan.startGame();
        }}
      >
        {lan.players.length < 2 ? "Waiting for more players…" : "Start Game"}
      </button>
      <button type="button" className="btnGhost" onClick={onLeave}>
        Stop Hosting
      </button>
    </div>
  );
}

export default LanHostActive;
