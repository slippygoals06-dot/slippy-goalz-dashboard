import { useCallback, useEffect, useRef, useState } from "react";
import { Html5Qrcode, Html5QrcodeScannerState } from "html5-qrcode";
import { Check, PackagePlus, Wrench } from "lucide-react";
import { installParts, receiveParts } from "../api";
import PageShell, { pagePanelStyle } from "../components/PageShell";
import {
  useTheme,
  primaryBtnStyle,
  primaryBtnHoverProps,
  secondaryBtnStyle,
  secondaryBtnHoverProps,
  inputStyle,
} from "../context/ThemeContext";

const SCANNER_ELEMENT_ID = "parts-qr-reader";

/** Extract batch number from a verify URL or raw scanned/typed value. */
function parseBatchNumber(raw) {
  const text = String(raw || "").trim();
  if (!text) return "";

  try {
    const url = new URL(text);
    const match = url.pathname.match(/\/verify\/([^/]+)\/?$/);
    if (match) return decodeURIComponent(match[1]).trim();
  } catch {
    /* not a full URL */
  }

  const pathMatch = text.match(/\/verify\/([^/?#]+)/i);
  if (pathMatch) return decodeURIComponent(pathMatch[1]).trim();

  return text;
}

function labelStyle(t) {
  return {
    display: "block",
    fontSize: 12.5,
    fontWeight: 600,
    color: t.textMuted,
    marginBottom: 8,
    letterSpacing: 0.01,
  };
}

export default function PartsScan() {
  const { theme: t, dark } = useTheme();

  const [phase, setPhase] = useState("scan"); // scan | actions | receive | install | success
  const [batchNumber, setBatchNumber] = useState("");
  const [manualInput, setManualInput] = useState("");
  const [scanError, setScanError] = useState("");
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [successAction, setSuccessAction] = useState(""); // received | installed

  const [receiveForm, setReceiveForm] = useState({
    supplier_name: "",
    part_type: "",
  });
  const [installForm, setInstallForm] = useState({
    repair_id: "",
    location: "",
  });

  const scanningRef = useRef(false);
  const capturedRef = useRef(false);

  const captureBatch = useCallback((value) => {
    const batch = parseBatchNumber(value);
    if (!batch) return;
    capturedRef.current = true;
    setBatchNumber(batch);
    setManualInput(batch);
    setScanError("");
    setFormError("");
    setPhase("actions");
  }, []);

  const resetToScan = useCallback(() => {
    capturedRef.current = false;
    setBatchNumber("");
    setManualInput("");
    setScanError("");
    setFormError("");
    setSuccessAction("");
    setReceiveForm({ supplier_name: "", part_type: "" });
    setInstallForm({ repair_id: "", location: "" });
    setPhase("scan");
  }, []);

  useEffect(() => {
    if (phase !== "scan") return;

    let cancelled = false;
    let scanner = null;
    /** True only after start() resolves; cleared before/when stop() is attempted. */
    let isRunning = false;
    scanningRef.current = false;
    capturedRef.current = false;
    setScanError("");

    async function safeStop(instance) {
      if (!instance) return;

      let shouldStop = isRunning || scanningRef.current;
      try {
        const state = instance.getState();
        shouldStop =
          state === Html5QrcodeScannerState.SCANNING ||
          state === Html5QrcodeScannerState.PAUSED;
      } catch {
        /* keep flag-based shouldStop */
      }

      isRunning = false;
      scanningRef.current = false;

      if (shouldStop) {
        try {
          await instance.stop();
        } catch {
          /* already stopped / never started */
        }
      }

      try {
        instance.clear();
      } catch {
        /* ignore */
      }
    }

    async function startScanner() {
      try {
        scanner = new Html5Qrcode(SCANNER_ELEMENT_ID);
        await scanner.start(
          { facingMode: "environment" },
          { fps: 8, qrbox: { width: 240, height: 240 }, aspectRatio: 1 },
          (decodedText) => {
            if (cancelled || capturedRef.current) return;
            const batch = parseBatchNumber(decodedText);
            if (!batch) return;
            capturedRef.current = true;

            void (async () => {
              await safeStop(scanner);
              if (cancelled) return;
              setBatchNumber(batch);
              setManualInput(batch);
              setScanError("");
              setFormError("");
              setPhase("actions");
            })();
          },
          () => {}
        );

        if (cancelled) {
          await safeStop(scanner);
          return;
        }

        isRunning = true;
        scanningRef.current = true;
      } catch {
        isRunning = false;
        scanningRef.current = false;
        if (!cancelled) {
          setScanError(
            "Camera unavailable on this device. Enter the batch number manually below."
          );
        }
      }
    }

    startScanner();

    return () => {
      cancelled = true;
      void safeStop(scanner);
    };
  }, [phase]);

  async function handleReceive(e) {
    e.preventDefault();
    setFormError("");
    const supplier_name = receiveForm.supplier_name.trim();
    const part_type = receiveForm.part_type.trim();
    if (!supplier_name || !part_type) {
      setFormError("Supplier name and part type are required.");
      return;
    }

    setSubmitting(true);
    try {
      await receiveParts({
        supplier_name,
        batch_number: batchNumber,
        part_type,
      });
      setSuccessAction("received");
      setPhase("success");
    } catch (err) {
      setFormError(err.message || "Failed to log received event.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleInstall(e) {
    e.preventDefault();
    setFormError("");
    const repair_id = installForm.repair_id.trim();
    const location = installForm.location.trim();
    if (!repair_id || !location) {
      setFormError("Repair ID and location are required.");
      return;
    }

    setSubmitting(true);
    try {
      await installParts({
        batch_number: batchNumber,
        repair_id,
        location,
      });
      setSuccessAction("installed");
      setPhase("success");
    } catch (err) {
      setFormError(err.message || "Failed to log installed event.");
    } finally {
      setSubmitting(false);
    }
  }

  const panel = {
    ...pagePanelStyle(t),
    padding: 24,
  };

  const batchChip = (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: "8px 12px",
        borderRadius: 10,
        background: dark ? "rgba(255,255,255,0.04)" : t.cardBg2,
        border: `1px solid ${t.border}`,
        fontSize: 13,
        fontWeight: 600,
        color: t.textPrimary,
        wordBreak: "break-all",
        maxWidth: "100%",
      }}
    >
      <span style={{ color: t.textMuted, fontWeight: 500 }}>Batch</span>
      {batchNumber}
    </div>
  );

  return (
    <PageShell
      title="Parts Scan"
      subtitle="Scan a parts QR code to log received or installed events."
      narrow
    >
      <style>{`
        #${SCANNER_ELEMENT_ID} {
          width: 100%;
          overflow: hidden;
          border-radius: 12px;
          background: ${dark ? "#0A0A0A" : "#111827"};
        }
        #${SCANNER_ELEMENT_ID} video {
          border-radius: 12px;
          object-fit: cover;
        }
        #${SCANNER_ELEMENT_ID} img { display: none; }
        @media (max-width: 520px) {
          .parts-scan-actions { flex-direction: column; }
          .parts-scan-actions button { width: 100%; }
        }
      `}</style>

      {phase === "scan" && (
        <div style={{ display: "grid", gap: 16 }}>
          <div style={panel}>
            <div
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: t.textPrimary,
                marginBottom: 12,
              }}
            >
              Scan QR code
            </div>
            <div id={SCANNER_ELEMENT_ID} />
            {scanError && (
              <div
                style={{
                  marginTop: 12,
                  padding: "10px 12px",
                  borderRadius: 10,
                  background: t.riskBg,
                  border: `1px solid ${t.riskBorder}`,
                  color: t.risk,
                  fontSize: 13,
                  lineHeight: 1.45,
                }}
              >
                {scanError}
              </div>
            )}
          </div>

          <div style={panel}>
            <div
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: t.textPrimary,
                marginBottom: 4,
              }}
            >
              Or enter batch number
            </div>
            <p
              style={{
                margin: "0 0 14px",
                fontSize: 13,
                color: t.textMuted,
                lineHeight: 1.45,
              }}
            >
              Paste a batch code or a verify link if the camera isn’t available.
            </p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const batch = parseBatchNumber(manualInput);
                if (!batch) {
                  setScanError("Enter a batch number to continue.");
                  return;
                }
                captureBatch(batch);
              }}
              style={{ display: "grid", gap: 12 }}
            >
              <input
                style={inputStyle(t)}
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value)}
                placeholder="e.g. BATCH-2026-001"
                autoComplete="off"
                spellCheck={false}
              />
              <button
                type="submit"
                style={{ ...primaryBtnStyle(t), width: "100%" }}
                {...primaryBtnHoverProps(t)}
              >
                Continue
              </button>
            </form>
          </div>
        </div>
      )}

      {phase === "actions" && (
        <div style={{ ...panel, display: "grid", gap: 18 }}>
          {batchChip}
          <div>
            <div
              style={{
                fontSize: 16,
                fontWeight: 700,
                color: t.textPrimary,
                letterSpacing: -0.2,
              }}
            >
              What happened with this batch?
            </div>
            <p
              style={{
                margin: "6px 0 0",
                fontSize: 13.5,
                color: t.textMuted,
                lineHeight: 1.5,
              }}
            >
              Log a receive when stock arrives, or an install when a part goes
              into a repair.
            </p>
          </div>

          <div
            className="parts-scan-actions"
            style={{ display: "flex", gap: 10 }}
          >
            <button
              type="button"
              onClick={() => {
                setFormError("");
                setPhase("receive");
              }}
              style={{ ...primaryBtnStyle(t), flex: 1 }}
              {...primaryBtnHoverProps(t)}
            >
              <PackagePlus size={16} strokeWidth={2} />
              Log Received
            </button>
            <button
              type="button"
              onClick={() => {
                setFormError("");
                setPhase("install");
              }}
              style={{ ...secondaryBtnStyle(t), flex: 1 }}
              {...secondaryBtnHoverProps(t)}
            >
              <Wrench size={16} strokeWidth={2} />
              Log Installed
            </button>
          </div>

          <button
            type="button"
            onClick={resetToScan}
            style={{
              ...secondaryBtnStyle(t),
              background: "transparent",
              border: "none",
              color: t.textMuted,
              height: 40,
            }}
          >
            Scan another batch
          </button>
        </div>
      )}

      {phase === "receive" && (
        <form
          onSubmit={handleReceive}
          style={{ ...panel, display: "grid", gap: 16 }}
        >
          {batchChip}
          <div>
            <div
              style={{
                fontSize: 16,
                fontWeight: 700,
                color: t.textPrimary,
                letterSpacing: -0.2,
              }}
            >
              Log received
            </div>
            <p
              style={{
                margin: "6px 0 0",
                fontSize: 13.5,
                color: t.textMuted,
                lineHeight: 1.5,
              }}
            >
              Creates the batch and writes the first on-chain checkpoint.
            </p>
          </div>

          <div>
            <label style={labelStyle(t)}>Supplier name</label>
            <input
              style={inputStyle(t)}
              value={receiveForm.supplier_name}
              onChange={(e) =>
                setReceiveForm((f) => ({ ...f, supplier_name: e.target.value }))
              }
              placeholder="Supplier / distributor"
              autoFocus
              required
            />
          </div>
          <div>
            <label style={labelStyle(t)}>Part type</label>
            <input
              style={inputStyle(t)}
              value={receiveForm.part_type}
              onChange={(e) =>
                setReceiveForm((f) => ({ ...f, part_type: e.target.value }))
              }
              placeholder="e.g. iPhone 14 screen"
              required
            />
          </div>

          {formError && (
            <div
              role="alert"
              style={{
                padding: "10px 12px",
                borderRadius: 10,
                background: t.riskBg,
                border: `1px solid ${t.riskBorder}`,
                color: t.risk,
                fontSize: 13,
                lineHeight: 1.45,
              }}
            >
              {formError}
            </div>
          )}

          <div className="parts-scan-actions" style={{ display: "flex", gap: 10 }}>
            <button
              type="button"
              onClick={() => {
                setFormError("");
                setPhase("actions");
              }}
              style={{ ...secondaryBtnStyle(t), flex: 1 }}
              {...secondaryBtnHoverProps(t)}
              disabled={submitting}
            >
              Back
            </button>
            <button
              type="submit"
              style={{
                ...primaryBtnStyle(t),
                flex: 1,
                opacity: submitting ? 0.7 : 1,
              }}
              {...primaryBtnHoverProps(t)}
              disabled={submitting}
            >
              {submitting ? "Saving…" : "Confirm received"}
            </button>
          </div>
        </form>
      )}

      {phase === "install" && (
        <form
          onSubmit={handleInstall}
          style={{ ...panel, display: "grid", gap: 16 }}
        >
          {batchChip}
          <div>
            <div
              style={{
                fontSize: 16,
                fontWeight: 700,
                color: t.textPrimary,
                letterSpacing: -0.2,
              }}
            >
              Log installed
            </div>
            <p
              style={{
                margin: "6px 0 0",
                fontSize: 13.5,
                color: t.textMuted,
                lineHeight: 1.5,
              }}
            >
              Links this part to a repair booking and appends a checkpoint.
            </p>
          </div>

          <div>
            <label style={labelStyle(t)}>Repair ID</label>
            <input
              style={inputStyle(t)}
              value={installForm.repair_id}
              onChange={(e) =>
                setInstallForm((f) => ({ ...f, repair_id: e.target.value }))
              }
              placeholder="Booking / repair ID"
              autoFocus
              required
            />
          </div>
          <div>
            <label style={labelStyle(t)}>Location</label>
            <input
              style={inputStyle(t)}
              value={installForm.location}
              onChange={(e) =>
                setInstallForm((f) => ({ ...f, location: e.target.value }))
              }
              placeholder="e.g. Bench 2 / Front counter"
              required
            />
          </div>

          {formError && (
            <div
              role="alert"
              style={{
                padding: "10px 12px",
                borderRadius: 10,
                background: t.riskBg,
                border: `1px solid ${t.riskBorder}`,
                color: t.risk,
                fontSize: 13,
                lineHeight: 1.45,
              }}
            >
              {formError}
            </div>
          )}

          <div className="parts-scan-actions" style={{ display: "flex", gap: 10 }}>
            <button
              type="button"
              onClick={() => {
                setFormError("");
                setPhase("actions");
              }}
              style={{ ...secondaryBtnStyle(t), flex: 1 }}
              {...secondaryBtnHoverProps(t)}
              disabled={submitting}
            >
              Back
            </button>
            <button
              type="submit"
              style={{
                ...primaryBtnStyle(t),
                flex: 1,
                opacity: submitting ? 0.7 : 1,
              }}
              {...primaryBtnHoverProps(t)}
              disabled={submitting}
            >
              {submitting ? "Saving…" : "Confirm installed"}
            </button>
          </div>
        </form>
      )}

      {phase === "success" && (
        <div
          style={{
            ...panel,
            textAlign: "center",
            padding: "36px 24px",
            display: "grid",
            gap: 14,
            justifyItems: "center",
          }}
        >
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 16,
              background: t.successMuted,
              border: "1px solid rgba(34,197,94,0.28)",
              color: t.success,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Check size={28} strokeWidth={2.4} />
          </div>
          <div
            style={{
              fontSize: 20,
              fontWeight: 800,
              color: t.textPrimary,
              letterSpacing: -0.4,
            }}
          >
            {successAction === "installed" ? "Install logged" : "Received logged"}
          </div>
          <p
            style={{
              margin: 0,
              fontSize: 14,
              color: t.textSecondary,
              lineHeight: 1.55,
              maxWidth: 360,
            }}
          >
            Batch <strong style={{ color: t.textPrimary }}>{batchNumber}</strong>{" "}
            was recorded successfully
            {successAction === "installed"
              ? " as installed."
              : " as received."}
          </p>
          <button
            type="button"
            onClick={resetToScan}
            style={{ ...primaryBtnStyle(t), marginTop: 8, minWidth: 180 }}
            {...primaryBtnHoverProps(t)}
          >
            Scan another batch
          </button>
        </div>
      )}
    </PageShell>
  );
}
