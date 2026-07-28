import { useEffect, useRef, useState } from "react";
import { supabase } from "./../lib/supabaseClient";
import { AUTO_ADVANCE_ACTION_FOR_PHASE } from "./../game/engine";

const HEARTBEAT_MS = 15_000;
// If we haven't heard a heartbeat from a player in this long, the lobby /
// spectator views show them as disconnected (informational only for v1 -
// the actual turn-skip logic lives in the turn_deadline watchdog, not here).
export const STALE_AFTER_MS = 40_000;

export function useRoomSync(roomCode, playerId) {
  const [room, setRoom] = useState(null);
  const [players, setPlayers] = useState([]);
  const [gameState, setGameState] = useState(null); // { state, turn_deadline }
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!roomCode) return;
    let cancelled = false;

    async function loadInitial() {
      const [{ data: roomRow }, { data: playerRows }, { data: stateRow }] = await Promise.all([
        supabase.from("rooms").select("*").eq("code", roomCode).single(),
        supabase.from("players").select("*").eq("room_code", roomCode).order("created_at"),
        supabase.from("game_state").select("*").eq("room_code", roomCode).maybeSingle(),
      ]);
      if (cancelled) return;
      setRoom(roomRow ?? null);
      setPlayers(playerRows ?? []);
      setGameState(stateRow ?? null);
      setLoading(false);
    }
    loadInitial();

    const channel = supabase
      .channel(`room:${roomCode}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "rooms", filter: `code=eq.${roomCode}` },
        (payload) => setRoom(payload.new ?? null))
      .on("postgres_changes", { event: "*", schema: "public", table: "players", filter: `room_code=eq.${roomCode}` },
        () => {
          // Simplest correct approach: re-fetch the full roster on any
          // change (join/leave/seat update/heartbeat) rather than trying
          // to patch individual rows into local state by hand.
          supabase.from("players").select("*").eq("room_code", roomCode).order("created_at")
            .then(({ data }) => !cancelled && setPlayers(data ?? []));
        })
      .on("postgres_changes", { event: "*", schema: "public", table: "game_state", filter: `room_code=eq.${roomCode}` },
        (payload) => setGameState(payload.new ?? null))
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [roomCode]);

  // Presence heartbeat: lets other clients show "X is offline" and gives
  // the host a signal for who's actually around.
  useEffect(() => {
    if (!roomCode || !playerId) return;
    const beat = () =>
      supabase.from("players").update({ connected: true, last_seen: new Date().toISOString() })
        .eq("room_code", roomCode).eq("id", playerId);
    beat();
    const interval = setInterval(beat, HEARTBEAT_MS);
    const markOffline = () => {
      navigator.sendBeacon?.(
        `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/players?room_code=eq.${roomCode}&id=eq.${playerId}`
      );
    };
    window.addEventListener("beforeunload", markOffline);
    return () => {
      clearInterval(interval);
      window.removeEventListener("beforeunload", markOffline);
    };
  }, [roomCode, playerId]);

  const me = players.find((p) => p.id === playerId) ?? null;

  return { room, players, gameState, me, loading };
}

// Watches turn_deadline and fires the matching AUTO_ADVANCE_* action once
// it passes. Safe for every client to run this (the Edge Function
// re-checks the deadline server-side before applying), so no election of
// a single "responsible" client is needed - whichever client's timer
// fires first wins, the rest are harmless no-ops.
export function useTurnDeadlineWatchdog(roomCode, playerId, gameState, sendAction) {
  const timeoutRef = useRef(null);

  useEffect(() => {
    clearTimeout(timeoutRef.current);
    const state = gameState?.state;
    if (!state?.turnDeadline) return;
    const actionForPhase = AUTO_ADVANCE_ACTION_FOR_PHASE[state.phase];
    if (!actionForPhase) return;

    const msRemaining = state.turnDeadline - Date.now();
    // Small stagger so every connected client isn't racing to fire the
    // instant the deadline hits.
    const jitter = Math.random() * 1000;
    timeoutRef.current = setTimeout(() => {
      sendAction({ type: actionForPhase });
    }, Math.max(0, msRemaining) + jitter);

    return () => clearTimeout(timeoutRef.current);
  }, [roomCode, playerId, gameState?.state?.turnDeadline, gameState?.state?.phase, sendAction]);
}
