import { createPortal } from "react-dom";
import { useTheme, cardStyle } from "../context/ThemeContext";

export default function Modal({ open, onClose, children, maxWidth = 460, maxHeight = "90vh" }) {
  const { theme: t } = useTheme();
  if (!open) return null;

  return createPortal(
    <div
      className="modal-backdrop"
      onClick={onClose}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        inset: 0,
        zIndex: 2000,
        background: "rgba(0,0,0,0.65)",
        backdropFilter: "blur(8px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
    >
      <div
        className="modal-surface"
        onClick={(e) => e.stopPropagation()}
        style={{
          ...cardStyle(t),
          padding: 0,
          width: "100%",
          maxWidth,
          maxHeight,
          position: "relative",
          zIndex: 1,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {children}
      </div>
    </div>,
    document.body
  );
}
