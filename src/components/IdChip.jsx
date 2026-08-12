import { useTheme } from "../context/ThemeContext";

/** Monospaced ID chip — e.g. #BE68C8 */
export default function IdChip({ children, title }) {
  const { theme: t, dark } = useTheme();
  return (
    <span
      title={title}
      className="font-mono-data"
      style={{
        display: "inline-block",
        background: dark ? "rgba(255,255,255,0.08)" : "#F5F5F5",
        color: dark ? "rgba(255,255,255,0.72)" : "#525252",
        borderRadius: 8,
        padding: "2px 8px",
        fontSize: 12,
        fontWeight: 500,
        letterSpacing: "0.01em",
        lineHeight: 1.4,
        border: `1px solid ${dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)"}`,
      }}
    >
      {children}
    </span>
  );
}
