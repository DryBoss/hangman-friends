import { useCallback, useState } from "react";
import { supabase } from "./../lib/supabaseClient";

export function useGameActions(roomCode, playerId) {
  const [error, setError] = useState(null);

  const sendAction = useCallback(
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

  const selectWord = useCallback((word) => sendAction({ type: "SELECT_WORD", word }), [sendAction]);
  const readyToGuess = useCallback(() => sendAction({ type: "READY_TO_GUESS" }), [sendAction]);
  const guessLetter = useCallback((letter) => sendAction({ type: "GUESS_LETTER", letter }), [sendAction]);
  const judgeVote = useCallback((approve) => sendAction({ type: "JUDGE_VOTE", approve }), [sendAction]);
  const nextRound = useCallback(() => sendAction({ type: "NEXT_ROUND" }), [sendAction]);
  const startGame = useCallback(() => sendAction({ type: "START_GAME" }), [sendAction]);
  const restart = useCallback(() => sendAction({ type: "RESTART" }), [sendAction]);

  return { sendAction, selectWord, readyToGuess, guessLetter, judgeVote, nextRound, startGame, restart, error };
}
