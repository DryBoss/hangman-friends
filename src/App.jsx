import { useEffect, useRef, useState } from "react";
import { App as CapacitorApp } from "@capacitor/app";
import Landing from "./components/landing/Landing";
import LocalSetup from "./components/local-setup/Local-setup";
import Gameplay from "./components/gameplay/Gameplay";
import CreateGame from "./components/create-game/Create-game";
import JoinGame from "./components/join-game/Join-game";
import Lobby from "./components/lobby/Lobby";
import LanHostSetup from "./components/lan-host/LanHostSetup";
import LanHostActive from "./components/lan-host/LanHostActive";
import LanJoinSetup from "./components/lan-join/LanJoinSetup";
import LanPeerActive from "./components/lan-join/LanPeerActive";
import { useLocalAdapter } from "./hooks/useLocalAdapter";
import { useOnlineAdapter } from "./hooks/useOnlineAdapter";
import { getOrCreatePlayerId, forgetPlayerId } from "./lib/playerIdentity";

const LAST_ROOM_KEY = "hangman-friends-last-room";

function readUrlJoinCode() {
  try {
    return new URLSearchParams(window.location.search).get("join")?.toUpperCase() || null;
  } catch {
    return null;
  }
}

function loadLastRoom() {
  try {
    return window.localStorage.getItem(LAST_ROOM_KEY);
  } catch {
    return null;
  }
}

// A thin wrapper so the local-play screen can call useLocalAdapter (a
// hook) - App.jsx itself can't call it conditionally, so this component
// exists purely to own that hook instance for the lifetime of a local game.
function LocalPlay({ playerNames, settings, onNewGame }) {
  const adapter = useLocalAdapter(playerNames, settings);
  return <Gameplay adapter={adapter} onNewGame={onNewGame} />;
}

function OnlinePlay({ roomCode, playerId, onNewGame }) {
  const adapter = useOnlineAdapter(roomCode, playerId);
  return <Gameplay adapter={adapter} onNewGame={onNewGame} />;
}

function App() {
  const urlJoinCode = useRef(readUrlJoinCode()).current;
  const [screen, setScreen] = useState(urlJoinCode ? "online-join" : "landing");
  const [roomCode, setRoomCode] = useState(() => (urlJoinCode ? null : loadLastRoom()));
  const [localGame, setLocalGame] = useState(null); // { playerNames, settings }
  const [lanHostConfig, setLanHostConfig] = useState(null); // { hostName, settings }
  const [lanJoinConfig, setLanJoinConfig] = useState(null); // { hostUrl, name }
  const [lanJoinPrefill, setLanJoinPrefill] = useState(null);

  useEffect(() => {
    // Rejoining a remembered online room (not arriving via a fresh join
    // link) - jump straight to the lobby; the room's own `status` sorts
    // out whether that means a lobby or a game already in progress.
    if (!urlJoinCode && roomCode) setScreen("online-lobby");
  }, [urlJoinCode, roomCode]);

  const playerId = roomCode ? getOrCreatePlayerId(roomCode) : null;

  const persistRoom = (code) => {
    try {
      window.localStorage.setItem(LAST_ROOM_KEY, code);
    } catch {
      // not required for the game to function
    }
  };

  const goLanding = () => {
    window.history.replaceState({}, "", window.location.pathname);
    setScreen("landing");
    setLocalGame(null);
    setLanHostConfig(null);
    setLanJoinConfig(null);
  };

  const handleLeaveOnlineRoom = () => {
    if (roomCode) forgetPlayerId(roomCode);
    try {
      window.localStorage.removeItem(LAST_ROOM_KEY);
    } catch {
      // not required
    }
    window.history.replaceState({}, "", window.location.pathname);
    setRoomCode(null);
    setScreen("landing");
  };

  // Android hardware back button + deep-link handling for LAN join QR codes
  // (hangmanfriends://join?ip=...&port=...). Both no-op harmlessly outside
  // the native Android WebView.
  const screenRef = useRef(screen);
  screenRef.current = screen;

  useEffect(() => {
    const backListenerPromise = CapacitorApp.addListener("backButton", () => {
      if (screenRef.current === "landing") {
        CapacitorApp.exitApp();
      } else if (screenRef.current === "online-lobby" || screenRef.current === "online-play") {
        handleLeaveOnlineRoom();
      } else {
        goLanding();
      }
    });

    const urlListenerPromise = CapacitorApp.addListener("appUrlOpen", (data) => {
      try {
        const url = new URL(data.url);
        if (url.protocol === "hangmanfriends:" && url.hostname === "join") {
          const ip = url.searchParams.get("ip");
          const port = url.searchParams.get("port") || "8787";
          if (ip) {
            setLanJoinPrefill(`${ip}:${port}`);
            setScreen("lan-join-setup");
          }
        }
      } catch {
        // malformed/unexpected URL - ignore
      }
    });

    return () => {
      backListenerPromise.then((l) => l.remove());
      urlListenerPromise.then((l) => l.remove());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- Local same-device -------------------------------------------
  if (screen === "local-setup") {
    return (
      <LocalSetup
        onStart={(playerNames, settings) => {
          setLocalGame({ playerNames, settings });
          setScreen("local-play");
        }}
        onBack={goLanding}
      />
    );
  }
  if (screen === "local-play" && localGame) {
    return (
      <LocalPlay
        playerNames={localGame.playerNames}
        settings={localGame.settings}
        onNewGame={() => {
          setLocalGame(null);
          goLanding();
        }}
      />
    );
  }

  // --- Online (Supabase, room code) ---------------------------------
  if (screen === "online-join") {
    return (
      <JoinGame
        initialCode={urlJoinCode}
        onJoined={(code) => {
          persistRoom(code);
          setRoomCode(code);
          setScreen("online-lobby");
        }}
        onBack={goLanding}
      />
    );
  }
  if (screen === "online-lobby" && roomCode) {
    return (
      <Lobby
        roomCode={roomCode}
        playerId={playerId}
        onGameStarted={() => setScreen("online-play")}
        onLeave={handleLeaveOnlineRoom}
      />
    );
  }
  if (screen === "online-play" && roomCode) {
    return <OnlinePlay roomCode={roomCode} playerId={playerId} onNewGame={handleLeaveOnlineRoom} />;
  }
  if (screen === "online-host") {
    return (
      <CreateGame
        onRoomCreated={(code) => {
          persistRoom(code);
          setRoomCode(code);
          setScreen("online-lobby");
        }}
        onShowJoin={() => setScreen("online-join")}
        onBack={goLanding}
      />
    );
  }

  // --- Local network (WiFi/hotspot, no internet) ---------------------
  if (screen === "lan-host-setup") {
    return (
      <LanHostSetup
        onStart={(hostName, settings) => {
          setLanHostConfig({ hostName, settings });
          setScreen("lan-host-active");
        }}
        onShowJoin={() => setScreen("lan-join-setup")}
        onBack={goLanding}
      />
    );
  }
  if (screen === "lan-host-active" && lanHostConfig) {
    return (
      <LanHostActive
        hostName={lanHostConfig.hostName}
        settings={lanHostConfig.settings}
        onLeave={goLanding}
      />
    );
  }
  if (screen === "lan-join-setup") {
    return (
      <LanJoinSetup
        initialConnectString={lanJoinPrefill}
        onJoin={(hostUrl, name) => {
          setLanJoinConfig({ hostUrl, name });
          setLanJoinPrefill(null);
          setScreen("lan-join-active");
        }}
        onBack={goLanding}
      />
    );
  }
  if (screen === "lan-join-active" && lanJoinConfig) {
    return <LanPeerActive hostUrl={lanJoinConfig.hostUrl} name={lanJoinConfig.name} onLeave={goLanding} />;
  }

  return (
    <Landing
      onSelectMode={(mode) => {
        if (mode === "local") setScreen("local-setup");
        else if (mode === "online") setScreen("online-host");
        else if (mode === "lan") setScreen("lan-host-setup");
      }}
    />
  );
}

export default App;
