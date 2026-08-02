import styles from "./Round-judge.module.css";

// Online/LAN: a live majority vote (everyone except the guesser who
// solved the word votes approve/reject; see AUTO_ADVANCE_JUDGE in the
// shared engine for what happens if someone never votes).
// Local same-device: one shared screen, so it's just a single group
// verdict instead of a per-seat vote - isLocalMode swaps the UI for that.
function RoundJudge({
  word, players, roundDelta, votes, eligibleVoters, isGuesser, myVote, onVote, isLocalMode = false, pending = false,
}) {
  const preview = players
    .map((name, index) => ({ name, delta: roundDelta[index] }))
    .filter((entry) => entry.delta !== 0)
    .sort((a, b) => b.delta - a.delta);

  const votesIn = Object.keys(votes).length;
  const approveCount = Object.values(votes).filter(Boolean).length;

  return (
    <div className={styles.roundJudge}>
      <div className={`card ${styles.panel}`}>
        <h3 className={styles.heading}>Was this a fair word?</h3>
        <p className={styles.word}>{word.join("")}</p>
        <p className={styles.hint}>
          Check it's spelled correctly and it's a real, appropriate word. If
          rejected, nobody scores this round.
        </p>

        <div className={styles.preview}>
          <p className={styles.previewLabel}>If Approved</p>
          {preview.length === 0 ? (
            <p className={styles.previewEmpty}>No point changes this round.</p>
          ) : (
            preview.map((entry) => (
              <div key={entry.name} className={styles.previewRow}>
                <span>{entry.name}</span>
                <span className={entry.delta > 0 ? styles.gain : styles.loss}>
                  {entry.delta > 0 ? "+" : ""}
                  {entry.delta}
                </span>
              </div>
            ))
          )}
        </div>

        {isLocalMode ? (
          <div className={styles.actions}>
            <button className={styles.approve} onClick={() => onVote(true)} disabled={pending}>
              {pending ? "Sending…" : "Approve"}
            </button>
            <button className="btnDanger" onClick={() => onVote(false)} disabled={pending}>
              Reject - Illegal Word
            </button>
          </div>
        ) : (
          <>
            <p className={styles.voteTally}>
              {votesIn} of {eligibleVoters} votes in ({approveCount} approve)
            </p>
            {isGuesser ? (
              <p className={styles.hint}>Waiting on the rest of the group to vote…</p>
            ) : myVote != null ? (
              <p className={styles.hint}>
                You voted {myVote ? "Approve" : "Reject"}. Waiting on the rest of the group…
              </p>
            ) : (
              <div className={styles.actions}>
                <button className={styles.approve} onClick={() => onVote(true)} disabled={pending}>
                  {pending ? "Sending…" : "Approve"}
                </button>
                <button className="btnDanger" onClick={() => onVote(false)} disabled={pending}>
                  Reject - Illegal Word
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default RoundJudge;
