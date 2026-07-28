import { useCallback, useMemo, useRef, useState } from "react";
import { initState, reduce, maskForBroadcast } from "./../game/engine";

// Local pass-and-play has no real "whose device is this" question - one
// screen is trusted to act on behalf of whichever seat is relevant right
// now. So unlike the online/LAN adapters, mySeat here isn't a fixed
// identity - it's just "whichever seat the current phase needs to hear
// from", which is exactly who should be looking at the screen at that
// moment.
function currentActorSeat(state) {
  if (state.phase === "select") return state.selectorIndex;
  return state.guesserIndex; // pass, guess, judge (judge uses judgeDecide, not per-seat voting)
}

export function useLocalAdapter(playerNames, settings) {
  const trueStateRef = useRef(null);
  if (trueStateRef.current === null) trueStateRef.current = initState(playerNames.length, settings);
  const [, bump] = useState(0);

  const dispatch = useCallback(
    (action, extraMeta = {}) => {
      const { state: next, error } = reduce(trueStateRef.current, action, {
        seatIndex: null, playerCount: playerNames.length, bypassAuth: true, ...extraMeta,
      });
      trueStateRef.current = next;
      bump((n) => n + 1);
      return { ok: !error, error };
    },
    [playerNames.length]
  );

  const selectWord = useCallback((word) => dispatch({ type: "SELECT_WORD", word }), [dispatch]);
  const readyToGuess = useCallback(() => dispatch({ type: "READY_TO_GUESS" }), [dispatch]);
  const guessLetter = useCallback((letter) => dispatch({ type: "GUESS_LETTER", letter }), [dispatch]);
  // Local play keeps the original one-tap group verdict instead of a
  // per-seat vote - there's nobody to vote "separately", everyone's
  // looking at the same screen.
  const judgeDecide = useCallback((approve) => dispatch({ type: "JUDGE_DECIDE", approve }), [dispatch]);
  const nextRound = useCallback(() => dispatch({ type: "NEXT_ROUND" }), [dispatch]);
  const restart = useCallback(() => {
    trueStateRef.current = initState(playerNames.length, settings);
    bump((n) => n + 1);
  }, [playerNames.length, settings]);
  const sendAction = useCallback((action) => dispatch(action), [dispatch]);

  const maskedState = useMemo(() => maskForBroadcast(trueStateRef.current), [trueStateRef.current]);

  return {
    loading: false,
    mode: "local",
    isLocalMode: true,
    state: maskedState,
    playerNames,
    mySeat: currentActorSeat(maskedState),
    isHost: true,
    selectWord, readyToGuess, guessLetter, judgeDecide, judgeVote: judgeDecide, nextRound, restart, sendAction,
  };
}
