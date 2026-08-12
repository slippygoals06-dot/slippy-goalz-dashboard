/**
 * Living Design System documentation — /ds-tokens
 * Production reference for tokens + primitives. Not a product page redesign.
 */
import {
  Button,
  Input,
  Field,
  Textarea,
  Card,
  Badge,
  Alert,
  Modal,
  color,
  space,
  radius,
  shadow,
  type,
  layout,
} from "../design-system";
import { useState } from "react";
import { Plus, Search, Check } from "lucide-react";

const SWATCHES = [
  ["Primary BG", color.bg.primary],
  ["Secondary BG", color.bg.secondary],
  ["Card", color.bg.card],
  ["Elevated", color.bg.elevated],
  ["Brand", color.brand.DEFAULT],
  ["Success", color.semantic.success],
  ["Warning", color.semantic.warning],
  ["Danger", color.semantic.danger],
];

const TYPE_ROWS = [
  ["Display", type.display, "ds-display"],
  ["H1", type.h1, "ds-h1"],
  ["H2", type.h2, "ds-h2"],
  ["H3", type.h3, "ds-h3"],
  ["Large", type.large, "ds-large"],
  ["Body", type.body, "ds-body"],
  ["Small", type.small, "ds-small"],
  ["Caption", type.caption, "ds-caption"],
];

export default function DesignSystemTest() {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--ds-bg)",
        color: "var(--ds-text)",
        fontFamily: "var(--ds-font-sans)",
        padding: `${space[6]}px ${space[5]}px ${space[9]}px`,
      }}
    >
      <div style={{ maxWidth: 960, margin: "0 auto" }} className="ds-enter">
        <p className="ds-caption" style={{ marginBottom: space[2] }}>
          SLIPPY GOALZ · DESIGN SYSTEM
        </p>
        <h1 className="ds-h1" style={{ marginBottom: space[2] }}>
          Foundations
        </h1>
        <p className="ds-small" style={{ marginBottom: space[8], maxWidth: 520 }}>
          Single source of truth. Premium, quiet, confident. Brand red only on primary actions,
          active nav, focus, and critical badges.
        </p>

        {/* Colour */}
        <Section title="Colour">
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
              gap: space[3],
            }}
          >
            {SWATCHES.map(([label, hex]) => (
              <div key={label}>
                <div
                  style={{
                    height: 64,
                    borderRadius: radius.md,
                    background: hex,
                    border: "1px solid var(--ds-border)",
                    marginBottom: space[2],
                  }}
                />
                <div className="ds-caption">{label}</div>
                <div className="ds-small" style={{ fontVariantNumeric: "tabular-nums" }}>
                  {hex}
                </div>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: space[4], marginTop: space[5], flexWrap: "wrap" }}>
            <TextSample label="Primary" color={color.text.primary} />
            <TextSample label="Secondary" color={color.text.secondary} />
            <TextSample label="Muted" color={color.text.muted} />
          </div>
        </Section>

        {/* Type */}
        <Section title="Typography">
          <div style={{ display: "flex", flexDirection: "column", gap: space[4] }}>
            {TYPE_ROWS.map(([name, meta, cls]) => (
              <div key={name} style={{ display: "grid", gridTemplateColumns: "100px 1fr", gap: space[4], alignItems: "baseline" }}>
                <span className="ds-caption">{name} · {meta.size}</span>
                <span className={cls}>Slippy Goalz</span>
              </div>
            ))}
          </div>
        </Section>

        {/* Spacing / Radius / Shadow */}
        <Section title="Spacing · Radius · Shadow">
          <div style={{ display: "flex", flexWrap: "wrap", gap: space[2], alignItems: "flex-end", marginBottom: space[5] }}>
            {Object.entries(space).map(([k, v]) => (
              <div key={k} style={{ textAlign: "center" }}>
                <div
                  style={{
                    width: Math.max(v, 8),
                    height: Math.max(v, 8),
                    background: "var(--ds-brand-soft)",
                    border: "1px solid var(--ds-brand)",
                    borderRadius: 4,
                    margin: "0 auto 4px",
                  }}
                />
                <span className="ds-caption">{v}</span>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: space[4], flexWrap: "wrap", marginBottom: space[5] }}>
            {Object.entries(radius).map(([k, v]) => (
              <div
                key={k}
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: typeof v === "number" && v > 100 ? 9999 : v,
                  border: "1px solid var(--ds-border)",
                  background: "var(--ds-elevated)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <span className="ds-caption">{k} {v}</span>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: space[4], flexWrap: "wrap" }}>
            {(["sm", "md", "lg"]).map((k) => (
              <div
                key={k}
                style={{
                  width: 120,
                  height: 72,
                  borderRadius: radius.lg,
                  background: "var(--ds-card)",
                  border: "1px solid var(--ds-border)",
                  boxShadow: shadow[k],
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <span className="ds-caption">shadow.{k}</span>
              </div>
            ))}
          </div>
        </Section>

        {/* Buttons */}
        <Section title="Buttons">
          <div style={{ display: "flex", flexWrap: "wrap", gap: space[3], alignItems: "center" }}>
            <Button variant="primary">Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="danger">Danger</Button>
            <Button variant="primary" size="sm">
              Small
            </Button>
            <Button variant="primary" size="icon" aria-label="Add">
              <Plus size={20} strokeWidth={2} />
            </Button>
            <Button variant="primary" disabled>
              Disabled
            </Button>
          </div>
        </Section>

        {/* Inputs */}
        <Section title="Inputs">
          <div style={{ display: "grid", gap: space[4], maxWidth: 400 }}>
            <Field label="Customer name" hint="As shown on the booking">
              <Input placeholder="Ali Khan" />
            </Field>
            <Field label="Notes" error="Required">
              <Textarea placeholder="Device issue…" error />
            </Field>
          </div>
        </Section>

        {/* Cards */}
        <Section title="Cards">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: space[4] }}>
            <Card>
              <p className="ds-caption" style={{ marginBottom: space[2] }}>
                DEFAULT
              </p>
              <p className="ds-h3" style={{ fontSize: 20, marginBottom: space[2] }}>
                24 bookings
              </p>
              <p className="ds-small">Padding 24 · radius 18 · 1px border</p>
            </Card>
            <Card variant="elevated">
              <p className="ds-caption" style={{ marginBottom: space[2] }}>
                ELEVATED
              </p>
              <p className="ds-small">Slightly stronger shadow for popovers / sheets.</p>
            </Card>
            <Card variant="quiet" interactive>
              <p className="ds-caption" style={{ marginBottom: space[2] }}>
                QUIET · INTERACTIVE
              </p>
              <p className="ds-small">Hover lifts 1px. No glow.</p>
            </Card>
          </div>
        </Section>

        {/* Badges + Alerts */}
        <Section title="Badges · Alerts">
          <div style={{ display: "flex", flexWrap: "wrap", gap: space[2], marginBottom: space[5] }}>
            <Badge variant="neutral" dot>
              Neutral
            </Badge>
            <Badge variant="brand" dot>
              Brand
            </Badge>
            <Badge variant="success" dot>
              Success
            </Badge>
            <Badge variant="warning" dot>
              Warning
            </Badge>
            <Badge variant="danger" dot>
              Danger
            </Badge>
          </div>
          <div style={{ display: "grid", gap: space[3] }}>
            <Alert variant="info" title="Info">
              Quiet system notice with secondary copy.
            </Alert>
            <Alert variant="success" title="Synced">
              Ledger updated successfully.
            </Alert>
            <Alert variant="warning" title="Pending">
              3 bookings need confirmation.
            </Alert>
            <Alert variant="danger" title="Failed">
              Payment webhook timed out.
            </Alert>
          </div>
        </Section>

        {/* Table */}
        <Section title="Table">
          <div className="ds-table-wrap">
            <table className="ds-table">
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Service</th>
                  <th>Status</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["Sara Ahmed", "Screen Repair", "Confirmed", "Rs 5,000"],
                  ["Omar R.", "Battery", "Pending", "Rs 2,500"],
                  ["Fatima K.", "Software Fix", "Completed", "Rs 1,500"],
                ].map((row) => (
                  <tr key={row[0]}>
                    <td>{row[0]}</td>
                    <td style={{ color: "var(--ds-text-secondary)" }}>{row[1]}</td>
                    <td>
                      <Badge
                        variant={row[2] === "Pending" ? "warning" : row[2] === "Completed" ? "success" : "neutral"}
                        dot
                      >
                        {row[2]}
                      </Badge>
                    </td>
                    <td style={{ fontVariantNumeric: "tabular-nums" }}>{row[3]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        {/* Nav preview */}
        <Section title="Navigation">
          <Card variant="quiet" style={{ maxWidth: layout.sidebarWidth, padding: space[3] }}>
            <nav className="ds-nav" style={{ padding: 0 }}>
              <div className="ds-nav__group">Operations</div>
              <a className="ds-nav__item is-active" href="#nav">
                <Search size={20} strokeWidth={2} className="ds-nav__icon" />
                Dashboard
              </a>
              <a className="ds-nav__item" href="#nav">
                <Check size={20} strokeWidth={2} className="ds-nav__icon" />
                Bookings
              </a>
              <a className="ds-nav__item" href="#nav">
                <Plus size={20} strokeWidth={2} className="ds-nav__icon" />
                Invoices
              </a>
            </nav>
          </Card>
          <p className="ds-caption" style={{ marginTop: space[3] }}>
            Active = soft brand tint + 2px indicator · not a solid red block
          </p>
        </Section>

        {/* Modal */}
        <Section title="Modal">
          <Button variant="secondary" onClick={() => setModalOpen(true)}>
            Open modal
          </Button>
          <Modal
            open={modalOpen}
            onClose={() => setModalOpen(false)}
            title="Confirm booking"
            footer={
              <>
                <Button variant="ghost" onClick={() => setModalOpen(false)}>
                  Cancel
                </Button>
                <Button variant="primary" onClick={() => setModalOpen(false)}>
                  Confirm
                </Button>
              </>
            }
          >
            <p className="ds-small">
              Radius 24 · shadow large · Escape closes. No glass. No glow.
            </p>
          </Modal>
        </Section>

        {/* Layout tokens */}
        <Section title="Layout tokens">
          <ul className="ds-small" style={{ margin: 0, paddingLeft: space[5], lineHeight: 1.8 }}>
            <li>Sidebar {layout.sidebarWidth}px</li>
            <li>Topbar {layout.topbarHeight}px</li>
            <li>Button {layout.buttonHeight}px · Input {layout.inputHeight}px</li>
            <li>Table row {layout.tableRowHeight}px</li>
            <li>Icons {layout.iconSize}px / {layout.iconStroke}px stroke</li>
          </ul>
        </Section>

        <p className="ds-caption" style={{ marginTop: space[8] }}>
          Docs: src/design-system/README.md · API: src/design-system/index.js
        </p>
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <section style={{ marginBottom: space[8] }}>
      <h2 className="ds-h3" style={{ fontSize: 20, marginBottom: space[4] }}>
        {title}
      </h2>
      {children}
    </section>
  );
}

function TextSample({ label, color: c }) {
  return (
    <div>
      <div className="ds-caption" style={{ marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ color: c, fontSize: 16, fontWeight: 500 }}>The quick repair</div>
    </div>
  );
}
