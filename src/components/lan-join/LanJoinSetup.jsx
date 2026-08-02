import { useState } from "react";
import { BarcodeScanner } from "@capacitor-mlkit/barcode-scanning";
import styles from "./../join-game/Join-game.module.css";
import { parseConnectString } from "./../../lib/parseConnectString";

const NAME_STORAGE_KEY = "hangman-friends-host-name";

function loadSavedName() {
  try {
    return window.localStorage.getItem(NAME_STORAGE_KEY) || "";
  } catch {
    return "";
  }
}

function LanJoinSetup({ initialConnectString, onJoin, onBack }) {
  const [connectString, setConnectString] = useState(initialConnectString || "");
  const [name, setName] = useState(loadSavedName);
  const [error, setError] = useState("");
  const [scanning, setScanning] = useState(false);

  const handleScan = async () => {
    setError("");
    setScanning(true);
    try {
      const { camera } = await BarcodeScanner.requestPermissions();
      if (camera !== "granted" && camera !== "limited") {
        setError("Camera permission is needed to scan a QR code - you can still type the address in manually.");
        return;
      }
      const { barcodes } = await BarcodeScanner.scan();
      if (barcodes.length > 0) {
        setConnectString(parseConnectString(barcodes[0].rawValue));
      }
    } catch (err) {
      // Most commonly: running somewhere without a camera (a browser tab,
      // an emulator with no webcam passthrough) - the manual field below
      // still works fine either way.
      setError(err.message || "Couldn't open the camera - try entering the address manually instead.");
    } finally {
      setScanning(false);
    }
  };

  const handleJoin = () => {
    const trimmedName = name.trim();
    const [ip, portStr] = connectString.trim().split(":");
    const port = Number(portStr) || 8787;
    if (!ip) {
      setError("Enter the host's IP address (e.g. 192.168.1.42:8787).");
      return;
    }
    if (trimmedName.length === 0) {
      setError("Enter your name.");
      return;
    }
    try {
      window.localStorage.setItem(NAME_STORAGE_KEY, trimmedName);
    } catch {
      // persistence is a nice-to-have
    }
    onJoin(`ws://${ip}:${port}`, trimmedName);
  };

  return (
    <div className={styles.joinGame}>
      <div className={styles.hero}>
        <h1 className={styles.title}>Join Local Game</h1>
        <p className={styles.tagline}>Scan the host's QR code, or enter their address shown on screen - you'll need to be on the same WiFi.</p>
      </div>

      <button type="button" className={styles.joinButton} onClick={handleScan} disabled={scanning}>
        {scanning ? "Opening Camera…" : "Scan QR Code"}
      </button>

      <div className={`card ${styles.panel}`}>
        <p className={styles.sectionLabel}>Host Address</p>
        <input
          type="text"
          value={connectString}
          placeholder="e.g. 192.168.1.42:8787"
          className={styles.codeInput}
          style={{ textTransform: "none", letterSpacing: 0, fontSize: "1.1rem" }}
          onChange={(e) => {
            setConnectString(e.target.value);
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

      <button className="btnGhost" onClick={handleJoin} style={{ width: "100%" }}>
        Join
      </button>
      <button type="button" className="btnGhost" onClick={onBack}>
        Back
      </button>
    </div>
  );
}

export default LanJoinSetup;
