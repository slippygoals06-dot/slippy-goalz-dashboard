/**
 * Design System Card — 24px padding, 18px radius, 1px border
 * @param {"default"|"elevated"|"quiet"} [variant="default"]
 */
export default function Card({
  variant = "default",
  interactive = false,
  className = "",
  children,
  ...props
}) {
  const classes = [
    "ds-card",
    variant === "elevated" ? "ds-card--elevated" : "",
    variant === "quiet" ? "ds-card--quiet" : "",
    interactive ? "ds-card--interactive" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={classes} {...props}>
      {children}
    </div>
  );
}
