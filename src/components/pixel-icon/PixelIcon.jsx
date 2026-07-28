import { renderPixelCells, ICONS } from "./../../utils/pixelGrid.jsx";

function PixelIcon({ name, size = 16, color = "currentColor", className }) {
  const icon = ICONS[name];
  if (!icon) return null;
  const pixelSize = size / Math.max(icon.cols, icon.rows);

  return (
    <svg
      viewBox={`0 0 ${icon.cols * pixelSize} ${icon.rows * pixelSize}`}
      width={size}
      height={size}
      className={className}
      aria-hidden="true"
    >
      {renderPixelCells(icon.cells, pixelSize, color, name)}
    </svg>
  );
}

export default PixelIcon;
