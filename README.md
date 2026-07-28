# Hangman Friends

A hangman party game with three ways to play, picked from one landing
screen:

- **Local (same device)** - pass the phone around, exactly like the
  original pass-and-play version.
- **Online (room code)** - each player on their own phone, anywhere,
  synced through Supabase.
- **Local Network (WiFi/hotspot)** - each player on their own phone, same
  WiFi network, no internet required.

All three modes run the exact same rules engine
(`supabase/functions/_shared/engine.js`) - it's imported directly by the
app for Local and Local Network mode, and by the Supabase Edge Function
for Online mode. See "How it's structured" below.

> **Verification status**: the engine itself has an automated test script
> covering every phase transition, both judge-verdict paths, timeouts, and
> word masking (all passing) - see the bottom of this README for how to
> re-run it. The React app builds cleanly. What's **not** verified here:
> anything requiring a real Android device - the native LanHost plugin,
> actual WiFi connectivity between two phones, QR scanning, and deep
> links. That needs an Android build, which needs the Android SDK/Gradle -
> not available in the sandbox this was built in.

## Local development

```bash
npm install
npm run dev
```

## One-time Supabase setup (needed for Online mode)

1. Create a project at [supabase.com](https://supabase.com) (the free tier
   is plenty).
2. In the SQL Editor, run `supabase/migrations/0001_online_multiplayer.sql`
   once. This creates `rooms`, `players`, `game_state`, and `secret_words`,
   enables Realtime on the first three, and sets up row-level security -
   the anon key can read rooms/players/game_state and create rooms/players,
   but can't read/write `secret_words` or write `game_state` directly, only
   the Edge Function can (it holds the service-role key).
3. Deploy the Edge Function:
   ```bash
   npx supabase login
   npx supabase link --project-ref your-project-ref
   npx supabase functions deploy apply-action
   ```
4. Copy `.env.example` to `.env` and fill in your project's URL and anon
   key (Project Settings > API).

Local mode and Local Network mode don't need any of this - they work with
no Supabase project configured at all.

## Turning this into an Android app

Already Capacitor-ready. Needs the Android SDK, so run this on your own
machine:

```bash
npm install
npx cap add android      # one-time, generates android/ - SKIP this if android/ already exists in what you unzipped
npm run cap:sync         # builds dist/ and copies it into the native project
npm run cap:android      # opens Android Studio
```

Re-run `npm run cap:sync` after any change to the React source before
testing on Android again.

### Local Network mode needs one extra step: syncing the native plugin

`android/app/src/main/java/.../LanHostPlugin.java` and the
`Java-WebSocket` dependency in `android/app/build.gradle` are already in
place, but Gradle needs to actually fetch that dependency and Android
Studio needs to index the new plugin file. After `npx cap sync`:

1. Open the project in Android Studio (`npm run cap:android`).
2. Let Gradle sync (it'll pull `org.java-websocket:Java-WebSocket:1.5.6`
   from Maven Central automatically).
3. Build and run on two real devices on the same WiFi to test - an
   emulator can't join a real WiFi network the way a phone can, so this
   genuinely needs physical hardware.

If Gradle sync fails on the Java-WebSocket dependency, double check
`mavenCentral()` is in `android/build.gradle`'s `repositories {}` block
(it already is in this project, but worth checking after any Capacitor
version bump).

### Before you ship it

- **App ID**: `capacitor.config.json` uses `com.taiham.hangmanfriends` -
  change it before your first Play Store upload, it can't change after.
- **App icon & splash screen**: not generated yet -
  `npx capacitor-assets generate --android` once you have a source image.
- **Cleartext traffic is enabled** (`usesCleartextTraffic="true"` in the
  manifest) because Local Network mode's WebSocket connection is plain
  `ws://`, not `wss://` - there's no TLS cert to give a phone-hosted local
  server. That's an acceptable tradeoff for a local trusted-network party
  game, but worth knowing it's there.
- **Deep link scheme**: `hangmanfriends://join?ip=...&port=...` is
  registered in the manifest so a scanned join QR code can open the app
  directly to a pre-filled join screen. Test this specifically - deep
  link intent-filter behavior varies across Android versions/OEM skins.

## How it's structured

### The shared engine

`supabase/functions/_shared/engine.js` is pure, synchronous, and has zero
knowledge of Supabase/WebSockets/React - `initState`, `reduce`, and
`maskForBroadcast` are just functions on plain objects. Every transport
calls into the same file:

- **Local mode**: `useLocalAdapter` calls it directly from React state,
  with `bypassAuth: true` (one shared screen legitimately acts for
  whichever seat is relevant - there's no one to authenticate against).
- **Online mode**: the Edge Function calls it with the real caller's seat,
  enforcing turn order server-side.
- **Local Network mode**: the host device's `useLanHost` hook calls it
  in-process (the host phone *is* the server), also with real
  authorization - a modified peer client still can't act out of turn.

Word secrecy is phase-based, not viewer-based: nobody's synced state ever
contains the plaintext word while it's still live (not even the
selector's own client), so one masked broadcast works for every recipient
on every transport - no per-viewer payloads needed.

### The three transports

| | Local | Online | Local Network |
|---|---|---|---|
| Where the engine runs | in the browser | Edge Function | host's phone |
| Sync mechanism | React state | Supabase Realtime | native WebSocket server |
| Needs internet | no | yes | no (same WiFi only) |
| Needs the native plugin | no | no | yes, host side only |

`Gameplay.jsx` doesn't know which of the three it's talking to - it just
consumes whatever shape `useLocalAdapter` / `useOnlineAdapter` /
`useLanHost` / `useLanPeer` hands it (`state`, `playerNames`, `mySeat`,
`isHost`, and the action functions). That's what makes one UI work for
all three modes instead of three separate implementations.

### Judging: local vs. networked

Local mode keeps the original single-screen "group huddles, one tap
decides" verdict (`JUDGE_DECIDE`, only valid with `bypassAuth`). Online
and Local Network use a real per-seat majority vote (`JUDGE_VOTE`) since
players aren't looking at the same screen - see `RoundJudge.jsx`'s
`isLocalMode` prop for the UI split, and `AUTO_ADVANCE_JUDGE` in the
engine for what happens if someone never votes (missing votes count as
approve, so one AFK player can't stall a round forever).

### Known limitations (v1)

- Local Network rooms live entirely in the host's memory - if the host's
  app is killed, the room is gone. No reconnect-after-host-crash.
- Local Network mode assumes every device (including the host) joins the
  *same* WiFi network - either a home/venue network, or one player's
  hotspot that everyone else connects to. It doesn't special-case "host
  device is itself running the hotspot" (that IP is inconsistent across
  Android versions/manufacturers).
- No reconnect flow if a peer's WiFi drops mid-game beyond what the
  existing turn-deadline timeouts already cover.

## Re-running the engine test

There's no permanent test file in the repo (kept it out to avoid a stray
dev-only script shipping), but this is exactly what was run to verify
every phase transition, both judge outcomes, timeouts, and masking before
delivery - worth re-running after any engine change:

```js
// save as engine-test.mjs at the repo root, then: node engine-test.mjs
import { initState, reduce, maskForBroadcast } from './supabase/functions/_shared/engine.js';
// ... construct a game, call reduce() with each action, assert on the
// resulting phase/score/word at each step (see the transitions documented
// in engine.js's switch statement for the full action list).
```

## Project structure

```
src/
  App.jsx                       - mode routing (landing → local/online/lan) + back button + deep links
  main.jsx                      - React entry point, mobile viewport-height fix
  index.css                     - design tokens, fonts, global button/card styles
  game/engine.js                 - re-exports the canonical engine (see supabase/functions/_shared/)
  lib/
    supabaseClient.js             - Supabase client singleton
    playerIdentity.js             - per-room player id in localStorage, room code generation
    lanHostPlugin.js               - JS wrapper for the native LanHost plugin
  hooks/
    useLocalAdapter.js             - local same-device transport
    useOnlineAdapter.js             - wraps useRoomSync/useGameActions into the common adapter shape
    useRoomSync.js                   - Supabase realtime subscription + turn-deadline watchdog
    useGameActions.js                 - thin wrapper for calling the apply-action function
    useLanHost.js                      - LAN host transport (runs the engine, relays over WebSocket)
    useLanPeer.js                       - LAN peer transport (thin WebSocket client)
  components/
    landing/                       - mode-select screen
    local-setup/                    - local mode: player names + settings
    create-game/, join-game/, lobby/ - online mode: host/join/lobby
    lan-host/, lan-join/              - LAN mode: host/join + their "active" (lobby+gameplay) screens
    game-settings-form/                - shared settings UI (turn duration, win condition, word length)
    word-selection/, turn-handoff/, word-guesser/, gameplay/GuessSpectator.jsx,
    round-judge/, scoreboard/, leaderboard/, icon/  - shared gameplay UI, transport-agnostic
supabase/
  migrations/0001_online_multiplayer.sql   - tables, RLS, realtime setup (online mode only)
  functions/
    _shared/engine.js                       - the canonical rules engine (all 3 modes)
    apply-action/index.ts                     - thin transport wrapper around the engine (online mode)
android/
  app/src/main/java/.../LanHostPlugin.java  - native WebSocket server for LAN hosting
```
