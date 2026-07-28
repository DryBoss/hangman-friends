import styles from "./HangmanDrawing.module.css";
import { renderPixelCells } from "./../../utils/pixelGrid.jsx";

const PX = 6; // every "pixel" is a 6x6 block on a 60x60 grid

function HangmanDrawing({ wrongCount, maxWrong }) {
  const ink = "var(--ink)";

  const gallowsCells = [
    ...Array.from({ length: 8 }, (_, i) => [i + 1, 9]), // base
    ...Array.from({ length: 8 }, (_, i) => [3, 9 - i]), // pole
    ...Array.from({ length: 5 }, (_, i) => [3 + i, 1]), // beam
    [7, 2], // rope
  ];

  const stages = [
    [[6, 3], [7, 3], [8, 3], [6, 4], [8, 4], [6, 5], [7, 5], [8, 5]], // 1: head
    [[7, 6], [7, 7], [7, 8]], // 2: body
    [[6, 6], [5, 6]], // 3: left arm
    [[8, 6], [9, 6]], // 4: right arm
    [[6, 8], [5, 9]], // 5: left leg
    [[8, 8], [9, 9]], // 6: right leg
  ];

  const visibleCells = stages.slice(0, wrongCount).flat();
  const critical = wrongCount >= maxWrong;

  return (
    <div className={styles.wrapper}>
      <svg
        viewBox="0 0 60 60"
        className={styles.svg}
        role="img"
        aria-label={`${wrongCount} of ${maxWrong} wrong guesses`}
      >
        {renderPixelCells(gallowsCells, PX, ink, "gallows")}
        {renderPixelCells(visibleCells, PX, critical ? "var(--danger)" : ink, "figure")}
      </svg>
      <div className={styles.livesLabel}>
        {maxWrong - wrongCount} {maxWrong - wrongCount === 1 ? "life" : "lives"} left
      </div>
    </div>
  );
}

export default HangmanDrawing;
