import styles from "./ThemeToggle.module.css";
import Icon from "./../icon/Icon";
import { useTheme } from "./../../theme/ThemeContext";

function ThemeToggle({ className = "" }) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      className={`${styles.toggle} ${className}`}
      onClick={toggleTheme}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      <Icon name={isDark ? "sun" : "moon"} size={20} />
    </button>
  );
}

export default ThemeToggle;
