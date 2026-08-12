/**
 * GenesisBootSplash — cinematic Slippy Goalz boot sequence.
 *
 * Stack: React web + Framer Motion (orchestrated timeline).
 *
 * TODO: Replace synthesized SVG layers with designer exports when available:
 *   outer_ring.svg, circuit_lines.svg, apple_silhouette.svg,
 *   inner_circuit.svg, text_we_fix.svg, text_tagline.svg
 * Until then we animate SVG approximations + the full raster logo (logo.png).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  motion,
  useAnimationControls,
  AnimatePresence,
} from "framer-motion";
import logoSrc from "../assets/logo.png";
import { BUSINESS_NAME, BUSINESS_SUBTITLE } from "../constants/brand";

/* ── Tunable timeline (seconds) ─────────────────────────────────────────── */
export const TIMELINE = {
  voidEnd: 0.6,
  circuitsStart: 0.6,
  circuitsEnd: 1.8,
  ignitionStart: 1.8,
  ignitionEnd: 2.6,
  landingStart: 2.6,
  landingEnd: 3.2,
  completeAt: 3.2,
  pathStagger: 0.045,
  pathDraw: 0.55,
  nodePunch: 0.15,
  innerDraw: 0.4,
  shockwave: 0.5,
  ringSpring: 0.55,
  sweep: 0.32,
  textFocus: 0.4,
  tagline: 0.4,
};

const STORAGE_KEY = "slippy_intro_seen";
const ACCENT = "#E11D48";
const ACCENT_SOFT = "#E11D48";

/** Force replay: /login?intro=1 */
export function shouldPlayIntro() {
  try {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("intro") === "1" || params.get("intro") === "true") {
        sessionStorage.removeItem(STORAGE_KEY);
        return true;
      }
    }
    return sessionStorage.getItem(STORAGE_KEY) !== "1";
  } catch {
    return true;
  }
}

function markIntroSeen() {
  try {
    sessionStorage.setItem(STORAGE_KEY, "1");
  } catch {
    /* ignore */
  }
}

/* Circuit traces — grow outward from center (viewBox 0 0 400 400, origin 200,200) */
const CIRCUIT_PATHS = [
  { d: "M0 -48 V -168 H -46", len: 170 },
  { d: "M0 48 V 168 H 48", len: 168 },
  { d: "M48 0 H 172 V -38", len: 162 },
  { d: "M-48 0 H -172 V 32", len: 156 },
  { d: "M30 -30 L 86 -86 H 138 L 162 -110", len: 175 },
  { d: "M-30 30 L -80 80 V 128 L -108 156", len: 168 },
  { d: "M30 30 L 78 78 V 120 H 148", len: 158 },
  { d: "M-30 -30 L -74 -74 H -134 L -160 -100", len: 165 },
  { d: "M12 -48 L -18 -78 V -118 H -64", len: 120 },
  { d: "M12 48 L 36 84 H 78 V 126", len: 115 },
  { d: "M-12 -40 H -56 V -92 L -88 -120", len: 130 },
  { d: "M-12 40 H 40 V 88 L 72 118", len: 125 },
];

const CIRCUIT_NODES = [
  { x: -46, y: -168 },
  { x: 48, y: 168 },
  { x: 172, y: -38 },
  { x: -172, y: 32 },
  { x: 162, y: -110 },
  { x: -108, y: 156 },
  { x: 148, y: 120 },
  { x: -160, y: -100 },
  { x: -64, y: -118 },
  { x: 78, y: 126 },
  { x: -88, y: -120 },
  { x: 72, y: 118 },
];

/* Inner apple circuit — single stroke through 3 nodes (local coords in apple group) */
const INNER_CIRCUIT_D = "M -6 -28 L -18 -4 L -8 12 L 4 28";
const INNER_NODES = [
  { x: -18, y: -4, at: 0.33 },
  { x: -8, y: 12, at: 0.66 },
  { x: 4, y: 28, at: 1.0 },
];

const springRing = { type: "tween", duration: 0.35, ease: [0.2, 0, 0, 1] };

export default function GenesisBootSplash({ onComplete, onDismiss }) {
  const [phase, setPhase] = useState("boot"); // boot | idle | exit
  const [showShock, setShowShock] = useState(false);
  const completed = useRef(false);
  const dismissed = useRef(false);
  const onCompleteRef = useRef(onComplete);
  const onDismissRef = useRef(onDismiss);
  onCompleteRef.current = onComplete;
  onDismissRef.current = onDismiss;

  const ringControls = useAnimationControls();
  const appleControls = useAnimationControls();
  const sweepControls = useAnimationControls();
  const textControls = useAnimationControls();
  const tagControls = useAnimationControls();
  const fGlowControls = useAnimationControls();
  const logoRasterControls = useAnimationControls();

  const finish = useCallback(() => {
    if (completed.current) return;
    completed.current = true;
    markIntroSeen();
    setPhase("idle");
    onCompleteRef.current?.();
  }, []);

  const dismiss = useCallback(() => {
    setPhase("exit");
  }, []);

  const skipToIdle = useCallback(async () => {
    if (phase !== "boot") return;
    setShowShock(false);
    await Promise.all([
      ringControls.set({ scale: 1, opacity: 1 }),
      appleControls.set({ clipPath: "inset(0% 0% 0% 0%)", opacity: 1 }),
      logoRasterControls.set({ opacity: 1 }),
      textControls.set({ opacity: 1, y: 0 }),
      tagControls.set({ opacity: 1, letterSpacing: "0.22em" }),
      fGlowControls.set({
        filter: "none",
      }),
    ]);
    finish();
    window.setTimeout(dismiss, 400);
  }, [
    phase,
    ringControls,
    appleControls,
    logoRasterControls,
    textControls,
    tagControls,
    fGlowControls,
    finish,
    dismiss,
  ]);

  // After landing → brief idle → wipe out
  useEffect(() => {
    if (phase !== "idle") return undefined;
    const t = window.setTimeout(dismiss, 700);
    return () => window.clearTimeout(t);
  }, [phase, dismiss]);

  useEffect(() => {
    let cancelled = false;
    const timers = [];

    const run = async () => {
      // ACT 1 is declarative via initial/animate on void elements

      // ACT 2 — apple clip reveal synced with circuits window
      appleControls.start({
        clipPath: ["inset(100% 0% 0% 0%)", "inset(0% 0% 0% 0%)"],
        opacity: [0.2, 1],
        transition: {
          duration: TIMELINE.circuitsEnd - TIMELINE.circuitsStart,
          delay: TIMELINE.circuitsStart,
          ease: [0.16, 1, 0.3, 1],
        },
      });

      // ACT 3 — ignition
      timers.push(
        window.setTimeout(() => {
          if (cancelled) return;
          ringControls.start({
            scale: [0.98, 1],
            opacity: 1,
            transition: springRing,
          });
          sweepControls.start({
            x: ["-120%", "140%"],
            opacity: [0, 0.9, 0],
            transition: {
              duration: TIMELINE.sweep,
              ease: [0.4, 0, 0.2, 1],
            },
          });
          setShowShock(true);
          logoRasterControls.start({
            opacity: [0, 1],
            transition: { duration: 0.45, delay: 0.25, ease: "easeOut" },
          });
        }, TIMELINE.ignitionStart * 1000)
      );

      // LANDING — text
      timers.push(
        window.setTimeout(() => {
          if (cancelled) return;
          textControls.start({
            opacity: 1,
            y: 0,
            transition: {
              duration: TIMELINE.textFocus,
              ease: [0.2, 0, 0, 1],
            },
          });
          fGlowControls.start({
            filter: "none",
            transition: { duration: 0.2 },
          });
          tagControls.start({
            opacity: 1,
            letterSpacing: "0.22em",
            transition: {
              duration: TIMELINE.tagline,
              ease: [0.16, 1, 0.3, 1],
            },
          });
        }, TIMELINE.landingStart * 1000)
      );

      timers.push(
        window.setTimeout(() => {
          if (!cancelled) finish();
        }, TIMELINE.completeAt * 1000)
      );
    };

    run();
    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
    };
  }, [
    appleControls,
    ringControls,
    sweepControls,
    textControls,
    tagControls,
    fGlowControls,
    logoRasterControls,
    finish,
  ]);

  const pathDelays = useMemo(
    () =>
      CIRCUIT_PATHS.map(
        (_, i) => TIMELINE.circuitsStart + i * TIMELINE.pathStagger
      ),
    []
  );

  const overlay = (
    <motion.div
      className="genesis-splash"
      onClick={skipToIdle}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") skipToIdle();
      }}
      role="button"
      tabIndex={0}
      aria-label="Boot splash — tap to skip"
      initial={false}
      animate={
        phase === "exit"
          ? { clipPath: "circle(0% at 50% 48%)" }
          : { clipPath: "circle(160% at 50% 48%)" }
      }
      transition={{ duration: 0.95, ease: [0.76, 0, 0.24, 1] }}
      onAnimationComplete={() => {
        if (phase !== "exit" || dismissed.current) return;
        dismissed.current = true;
        onDismissRef.current?.();
      }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        background: "#000",
        cursor: "pointer",
        userSelect: "none",
      }}
    >
      <style>{`
        .genesis-splash * { box-sizing: border-box; }
        .genesis-stage {
          position: relative;
          width: min(78vw, 320px);
          aspect-ratio: 1 / 1;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .genesis-copy {
          margin-top: 28px;
          text-align: center;
          width: min(90vw, 360px);
        }
        .genesis-title {
          margin: 0;
          font-size: clamp(28px, 7vw, 36px);
          font-weight: 750;
          letter-spacing: -0.5px;
          color: #fff;
          line-height: 1.1;
        }
        .genesis-title .f-teal {
          color: ${ACCENT};
          display: inline-block;
        }
        .genesis-tag {
          margin: 14px 0 0;
          font-size: 11px;
          font-weight: 650;
          text-transform: uppercase;
          color: ${ACCENT};
          letter-spacing: 0.5em;
        }
        .genesis-hint {
          position: absolute;
          bottom: 28px;
          left: 0;
          right: 0;
          text-align: center;
          font-size: 11px;
          color: rgba(255,255,255,0.28);
          letter-spacing: 0.06em;
          pointer-events: none;
        }
      `}</style>

      {/* ACT 1 — Void vignette */}
      <motion.div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          background: "#0B0D10",
          pointerEvents: "none",
        }}
        initial={{ opacity: 1 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.2, ease: [0.2, 0, 0, 1] }}
      />

      {/* Center ignition point */}
      <motion.div
        aria-hidden
        style={{
          position: "absolute",
          top: "48%",
          left: "50%",
          width: 10,
          height: 10,
          margin: "-5px 0 0 -5px",
          borderRadius: "50%",
          background: ACCENT_SOFT,
          boxShadow: "none",
          pointerEvents: "none",
          zIndex: 1,
        }}
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: [0, 1, 0], scale: [0.85, 1, 1.12] }}
        transition={{
          duration: 0.55,
          delay: 0.3,
          times: [0, 0.4, 1],
          ease: [0.2, 0, 0, 1],
        }}
      />

      <div
        style={{
          position: "relative",
          zIndex: 2,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <div className="genesis-stage">
          {/* Shockwave — behind circuits */}
          <AnimatePresence>
            {showShock && (
              <motion.div
                key="shock"
                aria-hidden
                style={{
                  position: "absolute",
                  top: "50%",
                  left: "50%",
                  width: "40%",
                  height: "40%",
                  margin: "-20% 0 0 -20%",
                  borderRadius: "50%",
                  border: `1.5px solid ${ACCENT}`,
                  boxShadow: "none",
                  zIndex: 0,
                  pointerEvents: "none",
                }}
                initial={{ scale: 0.9, opacity: 0.35 }}
                animate={{ scale: 1.8, opacity: 0 }}
                transition={{
                  duration: TIMELINE.shockwave,
                  ease: [0.2, 0, 0, 1],
                }}
                onAnimationComplete={() => setShowShock(false)}
              />
            )}
          </AnimatePresence>

          {/* ACT 2 — Circuit field */}
          <svg
            viewBox="0 0 400 400"
            style={{
              position: "absolute",
              inset: "-18%",
              width: "136%",
              height: "136%",
              zIndex: 1,
              pointerEvents: "none",
              overflow: "visible",
            }}
            aria-hidden
          >
            <defs>
              <linearGradient id="genesisStroke" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#0891b2" />
                <stop offset="55%" stopColor={ACCENT} />
                <stop offset="100%" stopColor={ACCENT_SOFT} />
              </linearGradient>
              <filter id="genesisGlow" x="-40%" y="-40%" width="180%" height="180%">
                <feGaussianBlur stdDeviation="1.6" result="b" />
                <feMerge>
                  <feMergeNode in="b" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            <g transform="translate(200 200)" filter="url(#genesisGlow)">
              {CIRCUIT_PATHS.map((p, i) => (
                <motion.path
                  key={`p-${i}`}
                  d={p.d}
                  fill="none"
                  stroke="url(#genesisStroke)"
                  strokeWidth={1.35}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  initial={{ pathLength: 0, opacity: 0.3 }}
                  animate={{ pathLength: 1, opacity: [0.3, 1, 0.75] }}
                  transition={{
                    pathLength: {
                      duration: TIMELINE.pathDraw,
                      delay: pathDelays[i],
                      ease: [0.4, 0, 0.2, 1],
                    },
                    opacity: {
                      duration: TIMELINE.pathDraw,
                      delay: pathDelays[i],
                      times: [0, 0.85, 1],
                    },
                  }}
                  style={{ willChange: "auto" }}
                />
              ))}

              {CIRCUIT_NODES.map((n, i) => (
                <motion.circle
                  key={`n-${i}`}
                  cx={n.x}
                  cy={n.y}
                  r={2.6}
                  fill={ACCENT_SOFT}
                  initial={{ opacity: 0, scale: 0 }}
                  animate={
                    phase === "idle"
                      ? {
                          opacity: 0.85,
                          scale: 1,
                        }
                      : {
                          opacity: [0, 1, 1],
                          scale: [0.85, 1],
                          transition: {
                            duration: TIMELINE.nodePunch,
                            delay:
                              pathDelays[i] + TIMELINE.pathDraw - 0.05,
                            times: [0, 1],
                            ease: [0.2, 0, 0, 1],
                          },
                        }
                  }
                />
              ))}
            </g>
          </svg>

          {/* Outer chrome ring (SVG) */}
          <motion.svg
            viewBox="0 0 200 200"
            animate={ringControls}
            initial={{ scale: 0.98, opacity: 0 }}
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              zIndex: 3,
              pointerEvents: "none",
              willChange: "transform",
              overflow: "visible",
            }}
            aria-hidden
          >
            <defs>
              <linearGradient id="chromeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#e8eef2" />
                <stop offset="25%" stopColor="#6a737b" />
                <stop offset="50%" stopColor="#f3f6f8" />
                <stop offset="75%" stopColor="#3d464e" />
                <stop offset="100%" stopColor="#c5cdd4" />
              </linearGradient>
            </defs>
            <circle
              cx="100"
              cy="100"
              r="96"
              fill="none"
              stroke="url(#chromeGrad)"
              strokeWidth="4.5"
            />
            <circle
              cx="100"
              cy="100"
              r="92.5"
              fill="none"
              stroke="rgba(225,29,72,0.55)"
              strokeWidth="1.2"
            />
          </motion.svg>

          {/* Idle ring — static settle, no infinite pulse */}
          {phase === "idle" && (
            <div
              aria-hidden
              style={{
                position: "absolute",
                inset: -4,
                borderRadius: "50%",
                zIndex: 2,
                pointerEvents: "none",
                opacity: 0.55,
              }}
            />
          )}

          {/* Apple / logo reveal (SVG silhouette + raster settle) */}
          <motion.div
            animate={appleControls}
            initial={{ clipPath: "inset(100% 0% 0% 0%)", opacity: 0.2 }}
            style={{
              position: "relative",
              width: "86%",
              height: "86%",
              borderRadius: "50%",
              overflow: "hidden",
              zIndex: 4,
              background: "#05080a",
              willChange: "clip-path, opacity",
            }}
          >
            {/* Synthesized apple for early acts */}
            <svg
              viewBox="-50 -55 100 110"
              style={{
                position: "absolute",
                inset: "12% 18% 28%",
                width: "64%",
                height: "auto",
                margin: "0 auto",
                left: 0,
                right: 0,
              }}
              aria-hidden
            >
              <defs>
                <clipPath id="appleClip">
                  <path d="M0 -36 C -6 -48, 14 -52, 16 -38 C 4 -36, 2 -28, 0 -22 C -2 -28, -4 -36, -16 -38 C -14 -52, 6 -48, 0 -36 Z M -22 -8 C -38 8, -34 42, -8 48 C -2 50, 2 50, 8 48 C 34 42, 38 8, 22 -8 C 12 -18, 6 -20, 0 -18 C -6 -20, -12 -18, -22 -8 Z" />
                </clipPath>
              </defs>
              <path
                fill="#fff"
                d="M0 -36 C -6 -48, 14 -52, 16 -38 C 4 -36, 2 -28, 0 -22 C -2 -28, -4 -36, -16 -38 C -14 -52, 6 -48, 0 -36 Z M -22 -8 C -38 8, -34 42, -8 48 C -2 50, 2 50, 8 48 C 34 42, 38 8, 22 -8 C 12 -18, 6 -20, 0 -18 C -6 -20, -12 -18, -22 -8 Z"
              />
              {/* Inner circuit ignition */}
              <g clipPath="url(#appleClip)">
                <motion.path
                  d={INNER_CIRCUIT_D}
                  fill="none"
                  stroke="#0a1620"
                  strokeWidth={3.2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{
                    duration: TIMELINE.innerDraw,
                    delay: TIMELINE.ignitionStart,
                    ease: [0.4, 0, 0.2, 1],
                  }}
                />
                {INNER_NODES.map((n, i) => (
                  <motion.circle
                    key={`in-${i}`}
                    cx={n.x}
                    cy={n.y}
                    r={2.8}
                    fill="#0a1620"
                    initial={{ scale: 1 }}
                    animate={{ scale: 1 }}
                    transition={{
                      duration: 0.18,
                      delay:
                        TIMELINE.ignitionStart +
                        TIMELINE.innerDraw * n.at -
                        0.02,
                      ease: [0.2, 0, 0, 1],
                    }}
                  />
                ))}
              </g>
            </svg>

            {/* Full raster logo for brand-accurate settle */}
            <motion.img
              src={logoSrc}
              alt=""
              draggable={false}
              animate={logoRasterControls}
              initial={{ opacity: 0 }}
              style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                objectFit: "cover",
                borderRadius: "50%",
              }}
            />

            {/* Light sweep */}
            <motion.div
              aria-hidden
              animate={sweepControls}
              initial={{ x: "-120%", opacity: 0 }}
              style={{
                position: "absolute",
                top: "-20%",
                left: 0,
                width: "35%",
                height: "140%",
                background:
                  "linear-gradient(90deg, transparent, rgba(255,255,255,0.08), rgba(165,243,252,0.45), rgba(255,255,255,0.08), transparent)",
                transform: "rotate(20deg)",
                mixBlendMode: "screen",
                pointerEvents: "none",
                willChange: "transform, opacity",
              }}
            />
          </motion.div>
        </div>

        {/* LANDING text */}
        <div className="genesis-copy">
          <motion.p
            className="genesis-title"
            animate={textControls}
            initial={{ opacity: 0, y: 6 }}
            style={{ willChange: "transform, opacity" }}
          >
            We{" "}
            <motion.span className="f-teal" animate={fGlowControls}>
              F
            </motion.span>
            ix
          </motion.p>
          <motion.p
            className="genesis-tag"
            animate={tagControls}
            initial={{ opacity: 0, letterSpacing: "0.5em" }}
            style={{ willChange: "opacity, letter-spacing" }}
          >
            {BUSINESS_SUBTITLE}
          </motion.p>
        </div>
      </div>

      {phase === "boot" && (
        <div className="genesis-hint">Tap to skip</div>
      )}
    </motion.div>
  );

  if (typeof document === "undefined") return null;
  return createPortal(overlay, document.body);
}
