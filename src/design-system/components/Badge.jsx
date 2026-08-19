/**
 * Design System Badge
 * @param {"neutral"|"brand"|"success"|"warning"|"danger"} [variant="neutral"]
 */
export default function Badge({ variant = "neutral", dot = false, className = "", children, ...props }) {
  const classes = [`ds-badge`, `ds-badge--${variant}`, className].filter(Boolean).join(" ");
  return (
    <span className={classes} {...props}>
      {dot && <span className="ds-badge__dot" aria-hidden />}
      {children}
    </span>
  );
}
