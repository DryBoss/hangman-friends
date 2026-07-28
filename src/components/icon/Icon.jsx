// A small set of hand-drawn line icons, all sharing the same stroke weight
// and rounded caps so they read as one consistent family.

const PATHS = {
  star: "M12 2.5l2.7 6.3 6.8.6-5.2 4.5 1.6 6.7L12 16.9 6.1 20.6l1.6-6.7-5.2-4.5 6.8-.6L12 2.5z",
  eyeOpen:
    "M1.5 12S5 5.5 12 5.5 22.5 12 22.5 12 19 18.5 12 18.5 1.5 12 1.5 12z M12 15.2a3.2 3.2 0 100-6.4 3.2 3.2 0 000 6.4z",
  eyeClosed:
    "M3 4l18 16 M6.5 6.9C3.8 8.6 1.5 12 1.5 12s3.5 6.5 10.5 6.5c1.7 0 3.2-.4 4.5-1 M10.2 16.8c.6.2 1.2.3 1.8.3 7 0 10.5-6.5 10.5-6.5s-1-1.9-2.9-3.7 M9.4 9.5a3.2 3.2 0 004.2 4.3",
  trash:
    "M4 7h16 M9.5 7V4.8c0-.4.4-.8.8-.8h3.4c.4 0 .8.4.8.8V7 M6.5 7l1 12.3c0 .4.4.7.8.7h7.4c.4 0 .8-.3.8-.7L17.5 7 M10 10.5v6 M14 10.5v6",
  arrowRight: "M4 12h15 M13 5.5L20 12l-7 6.5",
  plus: "M12 4.5v15 M4.5 12h15",
  minus: "M4.5 12h15",
  check: "M4 12.5l5.5 5.5L20 6.5",
  grip: "M9 6h.01 M9 12h.01 M9 18h.01 M15 6h.01 M15 12h.01 M15 18h.01",
  copy: "M8 8h11a1 1 0 011 1v11a1 1 0 01-1 1H8a1 1 0 01-1-1V9a1 1 0 011-1z M5 16H4a1 1 0 01-1-1V4a1 1 0 011-1h11a1 1 0 011 1v1",
  share: "M18 8a2.5 2.5 0 100-5 2.5 2.5 0 000 5z M6 14.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z M18 21a2.5 2.5 0 100-5 2.5 2.5 0 000 5z M8.2 13l7.6-4 M8.2 12l7.6 4",
  arrowUp: "M12 19V5 M5.5 11.5L12 5l6.5 6.5",
  arrowDown: "M12 5v14 M5.5 12.5L12 19l6.5-6.5",
};

const STROKE_ONLY = new Set([
  "eyeClosed",
  "trash",
  "arrowRight",
  "plus",
  "minus",
  "check",
  "grip",
  "copy",
  "share",
  "arrowUp",
  "arrowDown",
]);

const SOLID_FILL = new Set([]);

function Icon({ name, size = 20, color = "currentColor", strokeWidth = 2, className }) {
  const d = PATHS[name];
  if (!d) return null;
  const strokeOnly = STROKE_ONLY.has(name);
  const fillOpacity = strokeOnly ? 0 : SOLID_FILL.has(name) ? 1 : 0.15;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <path
        d={d}
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill={strokeOnly ? "none" : color}
        fillOpacity={fillOpacity}
      />
    </svg>
  );
}

export default Icon;
