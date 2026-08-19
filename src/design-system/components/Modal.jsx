import { useEffect } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { Button } from "./Button";

/**
 * Design System Modal — 24px radius, large quiet shadow
 */
export default function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  className = "",
}) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      className="ds-modal-backdrop"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === "string" ? title : undefined}
        className={`ds-modal ${className}`.trim()}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="ds-modal__header">
          {title ? <h2 className="ds-h3" style={{ fontSize: 20 }}>{title}</h2> : <span />}
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close">
            <X size={20} strokeWidth={2} />
          </Button>
        </div>
        <div>{children}</div>
        {footer && <div className="ds-modal__footer">{footer}</div>}
      </div>
    </div>,
    document.body
  );
}
