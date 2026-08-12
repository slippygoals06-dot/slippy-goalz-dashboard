/**
 * Slippy Goalz Design System
 *
 * import { Button, Card, color, space } from "../design-system";
 */

export {
  color,
  font,
  type,
  space,
  spacing,
  radius,
  shadow,
  ease,
  duration,
  layout,
  focus,
  cssVars,
} from "./tokens";

export { default as tokens } from "./tokens";

export {
  EASE as MOTION_EASE,
  duration as motionDuration,
  tween,
  motionPresets,
} from "./motion";
export { default as motion } from "./motion";

export { Button, default as ButtonDefault } from "./components/Button";
export { Input, Textarea, Field } from "./components/Input";
export { default as Card } from "./components/Card";
export { default as Badge } from "./components/Badge";
export { default as Alert } from "./components/Alert";
export { default as Modal } from "./components/Modal";
