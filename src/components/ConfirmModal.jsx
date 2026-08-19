import { useTheme, primaryBtnStyle, secondaryBtnStyle } from "../context/ThemeContext";
import Modal from "./Modal";

/**
 * Reusable destructive / confirm dialog.
 * open + title + message; Confirm runs onConfirm (may be async).
 */
export default function ConfirmModal({
  open,
  onClose,
  onConfirm,
  title = "Are you sure?",
  message = "This can't be undone.",
  confirmLabel = "Delete",
  cancelLabel = "Cancel",
  busy = false,
  danger = true,
}) {
  const { theme: t } = useTheme();

  async function handleConfirm() {
    if (busy) return;
    await onConfirm?.();
  }

  return (
    <Modal open={open} onClose={() => !busy && onClose?.()} maxWidth={400} maxHeight="90vh">
      <div style={{ padding: 24 }}>
        <div style={{ fontSize: 17, fontWeight: 800, color: t.textPrimary, letterSpacing: -0.3, marginBottom: 8 }}>
          {title}
        </div>
        <p style={{ fontSize: 13, color: t.textSecondary, lineHeight: 1.5, margin: "0 0 20px" }}>
          {message}
        </p>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button
            type="button"
            className="ui-interactive"
            disabled={busy}
            onClick={() => !busy && onClose?.()}
            style={{ ...secondaryBtnStyle(t), padding: "10px 16px", fontSize: 13 }}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className="ui-interactive"
            disabled={busy}
            onClick={handleConfirm}
            style={{
              ...(danger
                ? {
                    background: "rgba(239,68,68,0.16)",
                    color: "#fca5a5",
                    border: "1px solid rgba(239,68,68,0.4)",
                    borderRadius: 10,
                    fontWeight: 600,
                    cursor: busy ? "wait" : "pointer",
                  }
                : primaryBtnStyle(t)),
              padding: "10px 16px",
              fontSize: 13,
              opacity: busy ? 0.7 : 1,
            }}
          >
            {busy ? "Working…" : confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  );
}
