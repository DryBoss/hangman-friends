import { useCallback } from "react";
import { useRoomSync, useTurnDeadlineWatchdog } from "./useRoomSync";
import { useGameActions } from "./useGameActions";

function seatedPlayers(players) {
  return [...players].filter((p) => p.seat_index !== null).sort((a, b) => a.seat_index - b.seat_index);
}

export function useOnlineAdapter(roomCode, playerId) {
  const { players, gameState, me, loading } = useRoomSync(roomCode, playerId);
  const { selectWord, readyToGuess, guessLetter, judgeVote, nextRound, restart, sendAction } =
    useGameActions(roomCode, playerId);
  useTurnDeadlineWatchdog(roomCode, playerId, gameState, sendAction);

  const seated = seatedPlayers(players);
  const playerNames = seated.map((p) => p.name);

  // Not used online (judging is a real per-seat vote there), but every
  // adapter exposes the same field names so Gameplay doesn't need to
  // know which transport it's talking to.
  const judgeDecide = useCallback(() => {}, []);

  return {
    loading: loading || !gameState?.state,
    mode: "online",
    isLocalMode: false,
    state: gameState?.state ?? null,
    playerNames,
    mySeat: me?.seat_index ?? null,
    isHost: me?.is_host ?? false,
    selectWord, readyToGuess, guessLetter, judgeVote, judgeDecide, nextRound, restart, sendAction,
  };
}
