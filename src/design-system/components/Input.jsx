import { forwardRef } from "react";

/**
 * Design System Input — 48px height, subtle border, brand focus ring
 */
export const Input = forwardRef(function Input(
  { className = "", error = false, ...props },
  ref
) {
  const classes = ["ds-input", error ? "ds-input--error" : "", className].filter(Boolean).join(" ");
  return <input ref={ref} className={classes} {...props} />;
});

export const Textarea = forwardRef(function Textarea(
  { className = "", error = false, ...props },
  ref
) {
  const classes = ["ds-textarea", error ? "ds-textarea--error" : "", className]
    .filter(Boolean)
    .join(" ");
  return <textarea ref={ref} className={classes} {...props} />;
});

export function Field({ label, hint, error, htmlFor, children }) {
  return (
    <div className="ds-field">
      {label && (
        <label className="ds-label" htmlFor={htmlFor}>
          {label}
        </label>
      )}
      {children}
      {error ? <span className="ds-error-text">{error}</span> : hint ? <span className="ds-hint">{hint}</span> : null}
    </div>
  );
}

export default Input;
