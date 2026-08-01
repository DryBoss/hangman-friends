// supabase/functions/apply-action/index.ts
//
// Thin transport layer around the shared engine (../_shared/engine.js).
// This function's only jobs are: figure out who's calling and whether
// they're allowed to do this, reassemble the true game state (the real
// word lives in `secret_words`, not in `game_state`, so it never appears
// in a Realtime broadcast to every subscriber), hand it to the engine,
// and persist + mask the result. All the actual game rules live in the
// engine, shared with the local and local-network modes.

import { createClient } from "npm:@supabase/supabase-js@2";
import { initState, reduce, maskForBroadcast } from "../_shared/engine.js";
import { corsHeaders } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

async function loadContext(supabase, roomCode, playerId) {
  const { data: room } = await supabase.from("rooms").select("*").eq("code", roomCode).single();
  const { data: players } = await supabase.from("players").select("*").eq("room_code", roomCode);
  const me = players?.find((p) => p.id === playerId);
  return {
    supabase, roomCode, playerId,
    seatIndex: me?.seat_index ?? null,
    isHost: room?.host_player_id === playerId,
    playerCount: players?.length ?? 0,
  };
}

async function getSecretWord(ctx) {
  const { data } = await ctx.supabase.from("secret_words").select("word").eq("room_code", ctx.roomCode).single();
  return data ? data.word.split("") : null;
}

async function setSecretWord(ctx, wordArray) {
  await ctx.supabase.from("secret_words").upsert({ room_code: ctx.roomCode, word: wordArray.join("") });
}

async function writeState(ctx, state) {
  // If a real word was just set this transition, persist it separately
  // before masking it out of what gets broadcast.
  if (state.word && (state.phase === "select" || state.phase === "pass" || state.phase === "guess")) {
    await setSecretWord(ctx, state.word);
  }
  const broadcastState = maskForBroadcast(state);
  await ctx.supabase.from("game_state").upsert({
    room_code: ctx.roomCode,
    state: broadcastState,
    turn_deadline: state.turnDeadline ? new Date(state.turnDeadline).toISOString() : null,
    updated_at: new Date().toISOString(),
  });
}

function ok(extra = {}) {
  return new Response(JSON.stringify({ ok: true, ...extra }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
function fail(message, status = 400) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  // The browser sends this before the real POST, to ask permission -
  // without a fast, headers-only reply here, the actual request never
  // gets sent at all.
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") return fail("Method not allowed", 405);

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
  const body = await req.json();
  const { room_code, player_id, action } = body ?? {};
  if (!room_code || !player_id || !action?.type) {
    return fail("room_code, player_id and action.type are required");
  }

  const ctx = await loadContext(supabase, room_code, player_id);

  if (action.type === "START_GAME" || action.type === "RESTART") {
    if (!ctx.isHost) return fail("Only the host can start the game", 403);
    const { data: players } = await supabase
      .from("players").select("*").eq("room_code", room_code).order("created_at", { ascending: true });
    if (!players || players.length < 2) return fail("Need at least 2 players");

    const alreadySeated = players.every((p) => p.seat_index !== null);
    const seated = alreadySeated
      ? [...players].sort((a, b) => (a.seat_index) - (b.seat_index))
      : players;
    await Promise.all(seated.map((p, i) => supabase.from("players").update({ seat_index: i }).eq("id", p.id)));

    const { data: room } = await supabase.from("rooms").select("settings").eq("code", room_code).single();
    const state = initState(seated.length, room.settings);
    await supabase.from("rooms").update({ status: "playing" }).eq("code", room_code);
    await writeState({ ...ctx, playerCount: seated.length }, state);
    return ok();
  }

  const { data: row } = await supabase.from("game_state").select("state").eq("room_code", room_code).single();
  if (!row) return fail("Game hasn't started");

  // Reconstitute the true state: the persisted row has the word masked
  // (or null pre-selection), so splice the real word back in from
  // secret_words before running it through the engine.
  let trueState = row.state;
  if (trueState.phase === "select" || trueState.phase === "pass" || trueState.phase === "guess") {
    const realWord = await getSecretWord(ctx);
    if (realWord) trueState = { ...trueState, word: realWord };
  }

  const { state: nextState, error } = reduce(trueState, action, {
    seatIndex: ctx.seatIndex, playerCount: ctx.playerCount,
  });
  if (error) return fail(error, error.includes("timed out") || error.includes("Not timed out") ? 409 : 403);

  await writeState(ctx, nextState);
  return ok();
});
