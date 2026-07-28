import { useCallback, useEffect, useRef, useState } from "react";
import LanHost from "./../lib/lanHostPlugin";
import { initState, reduce, maskForBroadcast, AUTO_ADVANCE_ACTION_FOR_PHASE } from "./../game/engine";

const DEFAULT_PORT = 8787;

function seatedCount(players) {
  return players.filter((p) => p.seatIndex !== null).length;
}

// The host device is both "the server" and "a player" - there's no fourth
// piece of infrastructure. This hook starts the native WebSocket server,
// keeps the roster + the one true copy of the engine state in memory, and
// broadcasts a masked view to every connected peer after each change. It
// exposes the same field names as useOnlineAdapter/useLocalAdapter so
// Gameplay.jsx (and a Lobby-equivalent) can render it without caring that
// the transport underneath is different.
export function useLanHost(hostPlayerId, hostName, settings) {
  const [connectionError, setConnectionError] = useState(null);
  const [ipAddress, setIpAddress] = useState(null);
  const [port, setPort] = useState(DEFAULT_PORT);
  const [players, setPlayers] = useState([
    { id: hostPlayerId, name: hostName, seatIndex: null, isHost: true, connected: true },
  ]);
  const [roomStatus, setRoomStatus] = useState("lobby"); // lobby | playing | finished
  const [gameState, setGameState] = useState(null);

  const playersRef = useRef(players);
  playersRef.current = players;
  const trueStateRef = useRef(null);
  const clientIdToPlayerId = useRef(new Map());

  const broadcast = useCallback((payload) => {
    LanHost.send({ message: JSON.stringify(payload) }).catch(() => {});
  }, []);

  const applyState = useCallback(
    (nextState) => {
      trueStateRef.current = nextState;
      const masked = maskForBroadcast(nextState);
      setGameState(masked);
      broadcast({ type: "GAME_STATE", state: masked });
      if (nextState.phase === "finished") setRoomStatus("finished");
    },
    [broadcast]
  );

  const dispatch = useCallback(
    (seatIndex, action) => {
      if (!trueStateRef.current) return;
      const { state: next, error } = reduce(trueStateRef.current, action, {
        seatIndex, playerCount: seatedCount(playersRef.current),
      });
      if (!error) applyState(next);
      return { ok: !error, error };
    },
    [applyState]
  );

  // --- Native server lifecycle -------------------------------------
  useEffect(() => {
    let cancelled = false;
    LanHost.start({ port: DEFAULT_PORT })
      .then((res) => {
        if (cancelled) return;
        setIpAddress(res?.ipAddress ?? null);
        setPort(res?.port ?? DEFAULT_PORT);
      })
      .catch((err) => !cancelled && setConnectionError(err.message || "Couldn't start the local server"));

    const connectedSub = LanHost.addListener("clientConnected", () => {
      // Nothing to do yet - the roster only gets an entry once we hear a
      // HELLO with an actual name, below.
    });

    const disconnectedSub = LanHost.addListener("clientDisconnected", ({ clientId }) => {
      const playerId = clientIdToPlayerId.current.get(clientId);
      if (!playerId) return;
      clientIdToPlayerId.current.delete(clientId);
      setPlayers((prev) => prev.map((p) => (p.id === playerId ? { ...p, connected: false } : p)));
    });

    const messageSub = LanHost.addListener("clientMessage", ({ clientId, message }) => {
      let msg;
      try {
        msg = JSON.parse(message);
      } catch {
        return;
      }

      if (msg.type === "HELLO") {
        clientIdToPlayerId.current.set(clientId, msg.playerId);
        setPlayers((prev) => {
          const existing = prev.find((p) => p.id === msg.playerId);
          if (existing) {
            return prev.map((p) => (p.id === msg.playerId ? { ...p, connected: true, name: msg.name } : p));
          }
          return [...prev, { id: msg.playerId, name: msg.name, seatIndex: null, isHost: false, connected: true }];
        });
        return;
      }

      if (msg.type === "ACTION") {
        const player = playersRef.current.find((p) => p.id === msg.playerId);
        dispatch(player?.seatIndex ?? null, msg.action);
      }
    });

    return () => {
      cancelled = true;
      connectedSub.then((s) => s.remove());
      disconnectedSub.then((s) => s.remove());
      messageSub.then((s) => s.remove());
      LanHost.stop().catch(() => {});
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep every connected peer's lobby view in sync whenever the roster or
  // room status changes.
  useEffect(() => {
    broadcast({ type: "ROOM_STATE", status: roomStatus, players });
  }, [players, roomStatus, broadcast]);

  // Turn-deadline watchdog, same idea as the online transport's, just
  // running locally against the host's own state instead of over Realtime.
  useEffect(() => {
    if (!gameState?.turnDeadline) return;
    const actionType = AUTO_ADVANCE_ACTION_FOR_PHASE[gameState.phase];
    if (!actionType) return;
    const msRemaining = gameState.turnDeadline - Date.now();
    const timer = setTimeout(() => dispatch(null, { type: actionType }), Math.max(0, msRemaining));
    return () => clearTimeout(timer);
  }, [gameState?.turnDeadline, gameState?.phase, dispatch]);

  const movePlayer = useCallback((index, direction) => {
    setPlayers((prev) => {
      const target = index + direction;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }, []);

  const startGame = useCallback(() => {
    const seated = playersRef.current.map((p, i) => ({ ...p, seatIndex: i }));
    const initial = initState(seated.length, settings);
    setPlayers(seated);
    setRoomStatus("playing");
    applyState(initial);
  }, [applyState, settings]);

  const restart = useCallback(() => {
    const seated = playersRef.current;
    const initial = initState(seatedCount(seated), settings);
    setRoomStatus("playing");
    applyState(initial);
  }, [applyState, settings]);

  const hostSeat = players.find((p) => p.id === hostPlayerId)?.seatIndex ?? null;
  const playerNames = [...players].filter((p) => p.seatIndex !== null).sort((a, b) => a.seatIndex - b.seatIndex).map((p) => p.name);

  const selectWord = useCallback((word) => dispatch(hostSeat, { type: "SELECT_WORD", word }), [dispatch, hostSeat]);
  const readyToGuess = useCallback(() => dispatch(hostSeat, { type: "READY_TO_GUESS" }), [dispatch, hostSeat]);
  const guessLetter = useCallback((letter) => dispatch(hostSeat, { type: "GUESS_LETTER", letter }), [dispatch, hostSeat]);
  const judgeVote = useCallback((approve) => dispatch(hostSeat, { type: "JUDGE_VOTE", approve }), [dispatch, hostSeat]);
  const nextRound = useCallback(() => dispatch(hostSeat, { type: "NEXT_ROUND" }), [dispatch, hostSeat]);
  const judgeDecide = useCallback(() => {}, []); // host isn't in local mode - unused, kept for shape parity

  return {
    // Lobby-facing
    connectionError, ipAddress, port, players, roomStatus, movePlayer, startGame,
    // Gameplay-adapter-facing (same shape as the other transports)
    loading: false,
    mode: "lan-host",
    isLocalMode: false,
    state: gameState,
    playerNames,
    mySeat: hostSeat,
    isHost: true,
    selectWord, readyToGuess, guessLetter, judgeVote, judgeDecide, nextRound, restart,
  };
}
