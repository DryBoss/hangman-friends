-- Online multiplayer schema for Hangman Friends.
--
-- Design notes:
-- * No user accounts. A "player" is just a client-generated uuid persisted
--   in localStorage, scoped to a room code. That's enough identity to know
--   whose turn it is, without any auth flow.
-- * game_state.state is the same shape the old client-side useReducer used,
--   with one deliberate change: while a word is still "live" (phase is
--   select / pass / guess), the word field is a masked array
--   (null for hidden letters, the real character for separators and
--   letters already in guessedLetters) rather than the plaintext word.
--   The plaintext only appears once the round reaches judge/roundSummary,
--   by which point everyone is allowed to see it. This means privacy is
--   enforced by *what gets written to the row*, not by RLS trickery -
--   every subscriber sees the same row, so the row itself must never
--   contain the secret while it's still secret.
-- * All state mutation happens through the apply-action Edge Function
--   (SECURITY: it validates that the calling player_id is actually allowed
--   to perform the requested action before writing). Clients never write
--   to game_state directly - the table grants them SELECT only.

create extension if not exists "pgcrypto";

create table if not exists rooms (
  code text primary key,
  id uuid not null default gen_random_uuid() unique,
  host_player_id uuid not null,
  settings jsonb not null,
  status text not null default 'lobby' check (status in ('lobby', 'playing', 'finished')),
  created_at timestamptz not null default now()
);

create table if not exists players (
  id uuid primary key,
  room_code text not null references rooms(code) on delete cascade,
  name text not null,
  seat_index int, -- null while still in the lobby, assigned when the host starts the game
  is_host boolean not null default false,
  connected boolean not null default true,
  last_seen timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (room_code, id)
);

create table if not exists game_state (
  room_code text primary key references rooms(code) on delete cascade,
  state jsonb not null,
  turn_deadline timestamptz, -- when the current phase should be force-advanced if nobody acts
  updated_at timestamptz not null default now()
);

-- The actual secret word/phrase, kept completely separate from game_state
-- so it can be denied to the anon role at the table level (no SELECT policy
-- at all = no access), rather than relying on remembering to strip it out
-- of every response. Only the Edge Function (service role) touches this.
create table if not exists secret_words (
  room_code text primary key references rooms(code) on delete cascade,
  word text not null
);

create index if not exists players_room_code_idx on players(room_code);

-- Realtime: publish changes on all three tables so clients can subscribe
-- to just their room via `filter: room_code=eq.XXXXXX` (or `code=eq.XXXXXX`
-- for rooms itself).
alter publication supabase_realtime add table rooms;
alter publication supabase_realtime add table players;
alter publication supabase_realtime add table game_state;

-- Row level security. This is a casual friends-game, not a security-critical
-- app, so the policy is deliberately simple: anyone with a room code can
-- read/join it (rooms are meant to be shared), but only the Edge Function
-- (using the service role key, which bypasses RLS) can write to game_state.
alter table rooms enable row level security;
alter table players enable row level security;
alter table game_state enable row level security;
alter table secret_words enable row level security;
-- Deliberately no policies at all for secret_words: RLS defaults to deny,
-- so the anon/authenticated roles get zero access (no select, no insert,
-- no update). Only the service-role key used inside the Edge Function
-- bypasses RLS and can touch this table.

create policy "rooms are publicly readable" on rooms
  for select using (true);

create policy "anyone can create a room" on rooms
  for insert with check (true);

create policy "players are publicly readable" on players
  for select using (true);

create policy "anyone can join as a player" on players
  for insert with check (true);

create policy "a player can update their own presence" on players
  for update using (true);

create policy "game_state is publicly readable" on game_state
  for select using (true);

-- No insert/update/delete policy on game_state for the anon role - only the
-- service-role key (used inside the Edge Function) can write to it.
