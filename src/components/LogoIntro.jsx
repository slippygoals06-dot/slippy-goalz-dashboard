/**
 * LogoIntro — one-shot entrance animation for client demo logos.
 *
 * Variants:
 *   "hero"   — large centered logo with whitespace (default)
 *   "avatar" — circular crop (~80px) for account / business name rows
 *
 * Pure CSS keyframes — no animation library.
 */
import "./LogoIntro.css";

export default function LogoIntro({
  src,
  alt = "Logo",
  variant = "hero",
  size,
  className = "",
}) {
  if (!src) return null;

  const isAvatar = variant === "avatar";
  const avatarSize = size ?? 80;

  if (isAvatar) {
    return (
      <div
        className={`logo-intro logo-intro--avatar ${className}`.trim()}
        style={{ width: avatarSize, height: avatarSize }}
      >
        <img
          src={src}
          alt={alt}
          className="logo-intro__img logo-intro__img--avatar"
          draggable={false}
        />
      </div>
    );
  }

  return (
    <div className={`logo-intro logo-intro--hero ${className}`.trim()}>
      <img
        src={src}
        alt={alt}
        className="logo-intro__img logo-intro__img--hero"
        style={size ? { width: size, maxWidth: size } : undefined}
        draggable={false}
      />
    </div>
  );
}
