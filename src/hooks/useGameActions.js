import { useCallback, useState } from "react";
import { supabase } from "./../lib/supabaseClient";

export function useGameActions(roomCode, playerId) {
  const [error, setError] = useState(null);
  const [pending, setPending] = useState(false);

  const invoke = useCallback(
    async (action) => {
      const { data, error: fnError } = await supabase.functions.invoke("apply-action", {
        body: { room_code: roomCode, player_id: playerId, action },
      });
      if (fnError) {
        setError(fnError.message);
        return { ok: false, error: fnError.message };
      }
      if (data?.error) {
        // Expected/benign most of the time - e.g. "not your turn" because
        // two devices raced, or a watchdog firing early. Surface it but
        // don't treat it as fatal.
        setError(data.error);
        return { ok: false, error: data.error };
      }
      setError(null);
      return { ok: true };
    },
    [roomCode, playerId]
  );

  // User-initiated: toggles `pending` so the UI can show a loading state
  // for the round trip to the edge function + the realtime update coming
  // back.
  const sendAction = useCallback(
    async (action) => {
      setPending(true);
      try {
        return await invoke(action);
      } finally {
        setPending(false);
      }
    },
    [invoke]
  );

  // Background/system-initiated (the turn-deadline watchdog polling for
  // an early disconnect-skip) - same request, but never touches `pending`.
  // The user didn't click anything, so nothing should visibly react, even
  // though most of these silently get rejected as "not timed out yet".
  const sendSystemAction = useCallback((action) => invoke(action), [invoke]);

  const selectWord = useCallback((word) => sendAction({ type: "SELECT_WORD", word }), [sendAction]);
  const readyToGuess = useCallback(() => sendAction({ type: "READY_TO_GUESS" }), [sendAction]);
  const guessLetter = useCallback((letter) => sendAction({ type: "GUESS_LETTER", letter }), [sendAction]);
  const judgeVote = useCallback((approve) => sendAction({ type: "JUDGE_VOTE", approve }), [sendAction]);
  const nextRound = useCallback(() => sendAction({ type: "NEXT_ROUND" }), [sendAction]);
  const startGame = useCallback(() => sendAction({ type: "START_GAME" }), [sendAction]);
  const restart = useCallback(() => sendAction({ type: "RESTART" }), [sendAction]);

  return {
    sendAction, sendSystemAction, selectWord, readyToGuess, guessLetter, judgeVote,
    nextRound, startGame, restart, error, pending,
  };
}
