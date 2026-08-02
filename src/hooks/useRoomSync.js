import { useEffect, useRef, useState } from "react";
import { supabase } from "./../lib/supabaseClient";
import { AUTO_ADVANCE_ACTION_FOR_PHASE, PRESENCE_STALE_MS } from "./../game/engine";

const HEARTBEAT_MS = 15_000;
// Re-exported for any UI that wants to show "X looks disconnected" using
// the same threshold the edge function actually acts on (see
// PRESENCE_STALE_MS in the shared engine) - not currently used for
// display anywhere, but kept as one source of truth rather than a second
// magic number.
export { PRESENCE_STALE_MS };

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

  // Presence heartbeat: other clients use how stale this gets (see
  // useTurnDeadlineWatchdog below) to detect a disconnected active player
  // and skip their turn early, without waiting for their full timer.
  useEffect(() => {
    if (!roomCode || !playerId) return;
    const beat = () =>
      supabase.from("players").update({ connected: true, last_seen: new Date().toISOString() })
        .eq("room_code", roomCode).eq("id", playerId);
    beat();
    const interval = setInterval(beat, HEARTBEAT_MS);
    return () => clearInterval(interval);
  }, [roomCode, playerId]);

  const me = players.find((p) => p.id === playerId) ?? null;

  return { room, players, gameState, me, loading };
}

// Watches turn_deadline and fires the matching AUTO_ADVANCE_* action once
// it passes - plus polls periodically before that, so a disconnected
// active player's turn can be skipped well before their full timer
// expires (see PRESENCE_STALE_MS in the shared engine: the edge function
// independently checks their real last-seen heartbeat and only honors an
// early request if they've actually gone quiet). Safe for every client to
// run this - most early polls get silently rejected, and there's no
// election of a single "responsible" client needed either way.
export function useTurnDeadlineWatchdog(roomCode, playerId, gameState, sendSystemAction) {
  const deadlineTimeoutRef = useRef(null);
  const earlyPollIntervalRef = useRef(null);

  useEffect(() => {
    clearTimeout(deadlineTimeoutRef.current);
    clearInterval(earlyPollIntervalRef.current);

    const state = gameState?.state;
    if (!state?.turnDeadline) return;
    const actionForPhase = AUTO_ADVANCE_ACTION_FOR_PHASE[state.phase];
    if (!actionForPhase) return;

    const fire = () => sendSystemAction({ type: actionForPhase });

    const msRemaining = state.turnDeadline - Date.now();
    // Small stagger so every connected client isn't racing to fire the
    // instant the deadline hits.
    const jitter = Math.random() * 1000;
    deadlineTimeoutRef.current = setTimeout(fire, Math.max(0, msRemaining) + jitter);

    // Every 8s until then, ask anyway - almost always rejected ("not timed
    // out yet"), but that same request is what lets the edge function spot
    // a disconnected active player and let it through early.
    earlyPollIntervalRef.current = setInterval(fire, 8000);

    return () => {
      clearTimeout(deadlineTimeoutRef.current);
      clearInterval(earlyPollIntervalRef.current);
    };
  }, [roomCode, playerId, gameState?.state?.turnDeadline, gameState?.state?.phase, sendSystemAction]);
}
