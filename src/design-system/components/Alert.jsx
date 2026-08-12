/**
 * Design System Alert
 * @param {"info"|"success"|"warning"|"danger"} [variant="info"]
 */
export default function Alert({ variant = "info", title, children, className = "", ...props }) {
  const classes = [`ds-alert`, `ds-alert--${variant}`, className].filter(Boolean).join(" ");
  return (
    <div role="alert" className={classes} {...props}>
      <div>
        {title && <p className="ds-alert__title">{title}</p>}
        {children && <div className="ds-alert__body">{children}</div>}
      </div>
    </div>
  );
}
