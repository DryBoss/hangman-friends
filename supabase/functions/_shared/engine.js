// The single source of truth for Hangman Friends' rules. This file has
// zero knowledge of Supabase, WebSockets, or React - it's pure functions
// operating on plain objects, so the exact same logic runs:
//   - in the browser, for local same-device pass-and-play
//   - inside the apply-action Edge Function, for online rooms
//   - on the "host" device's browser, for local-network (WiFi/hotspot) rooms
//
// That last point is worth dwelling on: for local-network mode, the host
// device runs this engine directly (imported into the app itself, no
// separate server process) and just relays the results over a local
// WebSocket - so "host" and "server" are the same phone, not a fourth
// piece of infrastructure.
//
// A deliberate simplification this design leans on: masking the secret
// word is phase-based, not viewer-based (nobody's synced state ever
// contains the plaintext while it's still live, not even the selector's -
// they already know it from having just typed it). That means one
// masked broadcast works for every recipient, on every transport,
// without needing per-viewer payloads.

export const CORRECT_GUESS_POINTS = 1;
export const FINISHER_BONUS_POINTS = 2;
export const TIME_UP_PENALTY = 1;

export const SELECT_DEADLINE_MS = 60_000;
export const PASS_DEADLINE_MS = 8_000;
export const JUDGE_DEADLINE_MS = 45_000;

export const FALLBACK_WORDS = [
  "PANCAKE", "GALAXY", "UMBRELLA", "PUZZLE", "HARBOR", "WHISPER",
  "LANTERN", "CACTUS", "MERMAID", "THUNDER", "PRETZEL", "COMPASS",
];

const isSeparator = (ch) => ch === " " || ch === "-";

function nextGuesser(guesserIndex, selectorIndex, playerCount) {
  let next = (guesserIndex + 1) % playerCount;
  if (next === selectorIndex) next = (next + 1) % playerCount;
  return next;
}

function deadlineFor(phase, turnDurationSec) {
  const now = Date.now();
  if (phase === "select") return now + SELECT_DEADLINE_MS;
  if (phase === "pass") return now + PASS_DEADLINE_MS;
  if (phase === "guess") return turnDurationSec ? now + turnDurationSec * 1000 : null;
  if (phase === "judge") return now + JUDGE_DEADLINE_MS;
  return null;
}

export function initState(playerCount, settings) {
  const { turnDuration = null, gameMode, pointsToWin, roundsToPlay } = settings;
  const firstGuesser = nextGuesser(0, 0, playerCount);
  return {
    turnDuration, gameMode, pointsToWin, roundsToPlay,
    score: Array(playerCount).fill(0),
    selectorIndex: 0,
    guesserIndex: firstGuesser,
    word: null,
    guessedLetters: [],
    wrongGuessCount: 0,
    roundDelta: Array(playerCount).fill(0),
    roundVoided: false,
    judgeVotes: {},
    turnSeq: 0,
    wordsPlayed: 0,
    phase: "select",
    winnerIndex: null,
    turnDeadline: deadlineFor("select", turnDuration),
  };
}

// Strips the real word out of a state before it's shown/sent anywhere,
// for as long as it needs to stay secret. Safe to call on every state,
// every time - it's a no-op once the round reaches judge/roundSummary/
// finished.
export function maskForBroadcast(state) {
  if (!state.word) return state;
  const stillSecret = state.phase === "select" || state.phase === "pass" || state.phase === "guess";
  if (!stillSecret) return state;
  const masked = state.word.map((ch) => (isSeparator(ch) || state.guessedLetters.includes(ch) ? ch : null));
  return { ...state, word: masked };
}

// action: { type, ...payload }
// meta: { seatIndex, playerCount, bypassAuth }
//   bypassAuth is only ever true for local same-device play, where one
//   shared screen legitimately acts on behalf of whichever seat is
//   relevant - there's no one to cheat against.
// Returns { state, error } - state is unchanged (same reference) and
// error is set for anything from "not your turn" to a stale/duplicate
// click, so callers can decide how noisy to be about it.
export function reduce(state, action, meta) {
  const { seatIndex, playerCount, bypassAuth = false } = meta;
  const authorized = (requiredSeat) => bypassAuth || seatIndex === requiredSeat;

  switch (action.type) {
    case "SELECT_WORD": {
      if (state.phase !== "select") return { state, error: null };
      if (!authorized(state.selectorIndex)) return { state, error: "It's not your turn to pick a word" };
      const word = String(action.word).toUpperCase().split("");
      return {
        state: {
          ...state, word, guessedLetters: [], wrongGuessCount: 0,
          roundDelta: Array(playerCount).fill(0), roundVoided: false, judgeVotes: {},
          turnSeq: state.turnSeq + 1, phase: "pass",
          turnDeadline: deadlineFor("pass", state.turnDuration),
        },
        error: null,
      };
    }

    case "READY_TO_GUESS": {
      if (state.phase !== "pass") return { state, error: null };
      if (!authorized(state.guesserIndex)) return { state, error: "Only the incoming guesser can confirm ready" };
      return {
        state: {
          ...state, phase: "guess", turnSeq: state.turnSeq + 1,
          turnDeadline: deadlineFor("guess", state.turnDuration),
        },
        error: null,
      };
    }

    case "GUESS_LETTER": {
      if (state.phase !== "guess") return { state, error: null };
      if (!authorized(state.guesserIndex)) return { state, error: "It's not your turn to guess" };
      const letter = String(action.letter).toUpperCase();
      if (state.guessedLetters.includes(letter)) return { state, error: null };

      const isCorrect = state.word.includes(letter);
      const guessedLetters = [...state.guessedLetters, letter];

      if (!isCorrect) {
        const newGuesserIndex = nextGuesser(state.guesserIndex, state.selectorIndex, playerCount);
        const samePlayer = newGuesserIndex === state.guesserIndex;
        const phase = samePlayer ? "guess" : "pass";
        return {
          state: {
            ...state, guessedLetters, wrongGuessCount: state.wrongGuessCount + 1,
            guesserIndex: newGuesserIndex, turnSeq: state.turnSeq + 1, phase,
            turnDeadline: deadlineFor(phase, state.turnDuration),
          },
          error: null,
        };
      }

      const score = [...state.score];
      const roundDelta = [...state.roundDelta];
      score[state.guesserIndex] += CORRECT_GUESS_POINTS;
      roundDelta[state.guesserIndex] += CORRECT_GUESS_POINTS;
      const solved = state.word.every((l) => isSeparator(l) || guessedLetters.includes(l));

      if (solved) {
        const bonus = state.wrongGuessCount;
        if (bonus > 0) {
          score[state.selectorIndex] += bonus;
          roundDelta[state.selectorIndex] += bonus;
        }
        score[state.guesserIndex] += FINISHER_BONUS_POINTS;
        roundDelta[state.guesserIndex] += FINISHER_BONUS_POINTS;
        return {
          state: {
            ...state, guessedLetters, score, roundDelta, phase: "judge", judgeVotes: {},
            turnDeadline: deadlineFor("judge", state.turnDuration),
          },
          error: null,
        };
      }

      return {
        state: {
          ...state, guessedLetters, score, roundDelta, turnSeq: state.turnSeq + 1,
          turnDeadline: deadlineFor("guess", state.turnDuration),
        },
        error: null,
      };
    }

    case "TIME_UP": {
      if (state.phase !== "guess") return { state, error: null };
      if (!bypassAuth && state.turnDeadline && Date.now() < state.turnDeadline) {
        return { state, error: "Turn hasn't timed out yet" };
      }
      const score = [...state.score];
      const roundDelta = [...state.roundDelta];
      score[state.guesserIndex] -= TIME_UP_PENALTY;
      roundDelta[state.guesserIndex] -= TIME_UP_PENALTY;
      const newGuesserIndex = nextGuesser(state.guesserIndex, state.selectorIndex, playerCount);
      const samePlayer = newGuesserIndex === state.guesserIndex;
      const phase = samePlayer ? "guess" : "pass";
      return {
        state: {
          ...state, score, roundDelta, guesserIndex: newGuesserIndex,
          turnSeq: state.turnSeq + 1, phase, turnDeadline: deadlineFor(phase, state.turnDuration),
        },
        error: null,
      };
    }

    case "AUTO_ADVANCE_SELECT": {
      if (state.phase !== "select") return { state, error: null };
      if (!bypassAuth && state.turnDeadline && Date.now() < state.turnDeadline) {
        return { state, error: "Not timed out yet" };
      }
      const word = FALLBACK_WORDS[Math.floor(Math.random() * FALLBACK_WORDS.length)].split("");
      return {
        state: {
          ...state, word, guessedLetters: [], wrongGuessCount: 0,
          roundDelta: Array(playerCount).fill(0), roundVoided: false, judgeVotes: {},
          turnSeq: state.turnSeq + 1, phase: "pass", turnDeadline: deadlineFor("pass", state.turnDuration),
        },
        error: null,
      };
    }

    case "AUTO_ADVANCE_PASS": {
      if (state.phase !== "pass") return { state, error: null };
      if (!bypassAuth && state.turnDeadline && Date.now() < state.turnDeadline) {
        return { state, error: "Not timed out yet" };
      }
      return {
        state: {
          ...state, phase: "guess", turnSeq: state.turnSeq + 1,
          turnDeadline: deadlineFor("guess", state.turnDuration),
        },
        error: null,
      };
    }

    case "JUDGE_VOTE": {
      if (state.phase !== "judge") return { state, error: null };
      if (seatIndex === state.guesserIndex && !bypassAuth) {
        return { state, error: "The guesser doesn't vote on their own solve" };
      }
      const voterSeat = bypassAuth ? action.voterSeat : seatIndex;
      if (voterSeat == null) return { state, error: "Unknown seat" };
      const judgeVotes = { ...state.judgeVotes, [voterSeat]: Boolean(action.approve) };
      const eligibleVoters = playerCount - 1;
      const votesIn = Object.keys(judgeVotes).length;

      if (votesIn >= eligibleVoters) {
        const approveCount = Object.values(judgeVotes).filter(Boolean).length;
        const approved = approveCount * 2 >= eligibleVoters;
        return { state: resolveJudge({ ...state, judgeVotes }, approved), error: null };
      }
      return { state: { ...state, judgeVotes }, error: null };
    }

    case "JUDGE_DECIDE": {
      // Local pass-and-play only: one shared screen renders a single
      // Approve/Reject choice for the whole group, instead of the
      // per-seat JUDGE_VOTE flow used online/LAN.
      if (state.phase !== "judge") return { state, error: null };
      if (!bypassAuth) return { state, error: "JUDGE_DECIDE is local-only" };
      return { state: resolveJudge(state, Boolean(action.approve)), error: null };
    }

    case "AUTO_ADVANCE_JUDGE": {
      if (state.phase !== "judge") return { state, error: null };
      if (!bypassAuth && state.turnDeadline && Date.now() < state.turnDeadline) {
        return { state, error: "Not timed out yet" };
      }
      const eligibleVoters = playerCount - 1;
      const approveCount = Object.values(state.judgeVotes).filter(Boolean).length;
      const missing = eligibleVoters - Object.keys(state.judgeVotes).length;
      const approved = (approveCount + missing) * 2 >= eligibleVoters;
      return { state: resolveJudge(state, approved), error: null };
    }

    case "NEXT_ROUND": {
      if (state.phase !== "roundSummary") return { state, error: null };
      const wordsPlayed = state.wordsPlayed + 1;
      const reachedTarget =
        state.gameMode === "rounds"
          ? wordsPlayed >= state.roundsToPlay
          : Math.max(...state.score) >= state.pointsToWin;
      if (reachedTarget) {
        const winnerIndex = state.score.indexOf(Math.max(...state.score));
        return { state: { ...state, phase: "finished", winnerIndex, wordsPlayed, turnDeadline: null }, error: null };
      }
      const selectorIndex = (state.selectorIndex + 1) % playerCount;
      return {
        state: {
          ...state, selectorIndex, guesserIndex: nextGuesser(selectorIndex, selectorIndex, playerCount),
          word: null, guessedLetters: [], wrongGuessCount: 0, roundDelta: Array(playerCount).fill(0),
          roundVoided: false, judgeVotes: {}, turnSeq: 0, phase: "select", wordsPlayed,
          turnDeadline: deadlineFor("select", state.turnDuration),
        },
        error: null,
      };
    }

    default:
      return { state, error: `Unknown action: ${action.type}` };
  }
}

function resolveJudge(state, approved) {
  if (approved) return { ...state, phase: "roundSummary", turnDeadline: null };
  const score = state.score.map((s, i) => s - state.roundDelta[i]);
  return { ...state, score, roundVoided: true, phase: "roundSummary", turnDeadline: null };
}

// Maps a live phase to the action that should fire once its deadline has
// passed - used by every transport's watchdog so idle players can't stall
// the game indefinitely.
export const AUTO_ADVANCE_ACTION_FOR_PHASE = {
  select: "AUTO_ADVANCE_SELECT",
  pass: "AUTO_ADVANCE_PASS",
  guess: "TIME_UP",
  judge: "AUTO_ADVANCE_JUDGE",
};
