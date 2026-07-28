import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "./index.css";

// Mobile browsers (iOS Safari, Chrome Android) resize their address bar and
// mess with 100vh. Setting a --vh custom property from the real innerHeight
// keeps every full-screen panel accurate instead of jumping/cutting off.
function setViewportHeight() {
  document.documentElement.style.setProperty(
    "--vh",
    `${window.innerHeight * 0.01}px`
  );
}
setViewportHeight();
window.addEventListener("resize", setViewportHeight);
window.addEventListener("orientationchange", setViewportHeight);

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>
);
