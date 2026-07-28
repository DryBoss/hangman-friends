// Every icon in the game (hangman, eye toggle, trash, star, arrow) is drawn
// on the same blocky pixel grid instead of mixing in emoji or smooth SVG
// paths. This is the one visual signature the whole UI shares.

export function renderPixelCells(cells, pixelSize, color, keyPrefix) {
  return cells.map(([col, row], i) => (
    <rect
      key={`${keyPrefix}-${i}`}
      x={col * pixelSize}
      y={row * pixelSize}
      width={pixelSize}
      height={pixelSize}
      fill={color}
      shapeRendering="crispEdges"
    />
  ));
}

// Coordinates are [col, row] on a small grid, top-left origin.
export const ICONS = {
  star: {
    cols: 7,
    rows: 7,
    cells: [
      [3, 0],
      [2, 1], [3, 1], [4, 1],
      [1, 2], [2, 2], [3, 2], [4, 2], [5, 2],
      [0, 3], [1, 3], [2, 3], [3, 3], [4, 3], [5, 3], [6, 3],
      [1, 4], [2, 4], [4, 4], [5, 4],
      [1, 5], [5, 5],
      [0, 6], [6, 6],
    ],
  },
  eyeOpen: {
    cols: 5,
    rows: 3,
    cells: [
      [1, 0], [2, 0], [3, 0],
      [0, 1], [1, 1], [2, 1], [3, 1], [4, 1],
      [1, 2], [2, 2], [3, 2],
    ],
  },
  eyeClosed: {
    cols: 5,
    rows: 3,
    cells: [
      [0, 1], [1, 1], [2, 1], [3, 1], [4, 1],
    ],
  },
  arrowRight: {
    cols: 5,
    rows: 5,
    cells: [
      [0, 0],
      [0, 1], [1, 1],
      [0, 2], [1, 2], [2, 2],
      [0, 3], [1, 3],
      [0, 4],
    ],
  },
  trash: {
    cols: 7,
    rows: 8,
    cells: [
      [1, 1], [2, 1], [3, 1], [4, 1], [5, 1],
      [2, 2], [3, 2], [4, 2],
      [2, 3], [3, 3], [4, 3],
      [2, 4], [3, 4], [4, 4],
      [2, 5], [3, 5], [4, 5],
      [2, 6], [3, 6], [4, 6],
      [2, 7], [3, 7], [4, 7],
    ],
  },
  plus: {
    cols: 5,
    rows: 5,
    cells: [
      [2, 0], [2, 1],
      [0, 2], [1, 2], [2, 2], [3, 2], [4, 2],
      [2, 3], [2, 4],
    ],
  },
  minus: {
    cols: 5,
    rows: 5,
    cells: [
      [0, 2], [1, 2], [2, 2], [3, 2], [4, 2],
    ],
  },
};
