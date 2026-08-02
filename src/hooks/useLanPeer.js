import { useCallback, useEffect, useRef, useState } from "react";

// Peers don't need the native plugin at all - connecting *out* to a
// WebSocket server is plain browser API, only *accepting* connections
// (what the host does) needs native code. This hook never runs the
// engine itself; it just sends intents and renders whatever the host's
// last broadcast said, exactly like the online transport trusts Supabase.
export function useLanPeer(hostUrl, playerId, name) {
  const [connectionStatus, setConnectionStatus] = useState("connecting"); // connecting | connected | closed | error
  const [connectionError, setConnectionError] = useState(null);
  const [players, setPlayers] = useState([]);
  const [roomStatus, setRoomStatus] = useState("lobby");
  const [gameState, setGameState] = useState(null);
  const socketRef = useRef(null);
  const [retryToken, setRetryToken] = useState(0);

  useEffect(() => {
    setConnectionStatus("connecting");
    setConnectionError(null);
    const ws = new WebSocket(hostUrl);
    socketRef.current = ws;

    ws.onopen = () => {
      setConnectionStatus("connected");
      ws.send(JSON.stringify({ type: "HELLO", playerId, name }));
    };
    ws.onmessage = (event) => {
      let msg;
      try {
        msg = JSON.parse(event.data);
      } catch {
        return;
      }
      if (msg.type === "ROOM_STATE") {
        setRoomStatus(msg.status);
        setPlayers(msg.players);
      } else if (msg.type === "GAME_STATE") {
        setGameState(msg.state);
      }
    };
    ws.onerror = () => {
      setConnectionStatus("error");
      setConnectionError("Couldn't reach that host - check the IP/port and that you're on the same WiFi.");
    };
    ws.onclose = () => {
      setConnectionStatus((prev) => (prev === "error" ? prev : "closed"));
    };

    return () => ws.close();
  }, [hostUrl, playerId, name, retryToken]);

  const reconnect = useCallback(() => setRetryToken((t) => t + 1), []);
  const [pending, setPending] = useState(false);
  const pendingTimeoutRef = useRef(null);

  // Peers get no direct request/response for an action - just whatever the
  // host broadcasts next. So "pending" here is a best-effort signal: on,
  // the moment something's sent; off, the moment any new game state comes
  // in (or after a few seconds regardless, in case the action was quietly
  // rejected and never produced a new broadcast at all).
  useEffect(() => {
    setPending(false);
    clearTimeout(pendingTimeoutRef.current);
  }, [gameState]);

  const send = useCallback(
    (action) => {
      if (socketRef.current?.readyState !== WebSocket.OPEN) {
        return { ok: false, error: "Not connected to the host" };
      }
      setPending(true);
      clearTimeout(pendingTimeoutRef.current);
      pendingTimeoutRef.current = setTimeout(() => setPending(false), 4000);
      socketRef.current.send(JSON.stringify({ type: "ACTION", playerId, action }));
      return { ok: true };
    },
    [playerId]
  );

  const selectWord = useCallback((word) => send({ type: "SELECT_WORD", word }), [send]);
  const readyToGuess = useCallback(() => send({ type: "READY_TO_GUESS" }), [send]);
  const guessLetter = useCallback((letter) => send({ type: "GUESS_LETTER", letter }), [send]);
  const judgeVote = useCallback((approve) => send({ type: "JUDGE_VOTE", approve }), [send]);
  const nextRound = useCallback(() => send({ type: "NEXT_ROUND" }), [send]);
  const judgeDecide = useCallback(() => {}, []); // peers never use the local one-tap verdict

  const me = players.find((p) => p.id === playerId) ?? null;
  const seatedPlayers = [...players].filter((p) => p.seatIndex !== null).sort((a, b) => a.seatIndex - b.seatIndex);
  const playerNames = seatedPlayers.map((p) => p.name);

  return {
    // Lobby-facing
    connectionStatus, connectionError, players, roomStatus, reconnect,
    // Gameplay-adapter-facing
    loading: connectionStatus === "connecting" || !gameState,
    mode: "lan-peer",
    isLocalMode: false,
    state: gameState,
    playerNames,
    mySeat: me?.seatIndex ?? null,
    isHost: false,
    pending,
    selectWord, readyToGuess, guessLetter, judgeVote, judgeDecide, nextRound,
    restart: () => {}, // only the host can restart; peers just wait (see Scoreboard's isHost)
  };
}
