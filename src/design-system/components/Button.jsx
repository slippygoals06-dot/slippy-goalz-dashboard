import { forwardRef } from "react";

const VARIANTS = {
  primary: "ds-btn--primary",
  secondary: "ds-btn--secondary",
  ghost: "ds-btn--ghost",
  danger: "ds-btn--danger",
};

const SIZES = {
  sm: "ds-btn--sm",
  md: "",
  lg: "ds-btn--lg",
  icon: "ds-btn--icon",
};

/**
 * Design System Button
 * @param {"primary"|"secondary"|"ghost"|"danger"} [variant="primary"]
 * @param {"sm"|"md"|"lg"|"icon"} [size="md"]
 */
export const Button = forwardRef(function Button(
  { variant = "primary", size = "md", className = "", type = "button", children, ...props },
  ref
) {
  const classes = ["ds-btn", VARIANTS[variant], SIZES[size], className].filter(Boolean).join(" ");
  return (
    <button ref={ref} type={type} className={classes} {...props}>
      {children}
    </button>
  );
});

export default Button;
