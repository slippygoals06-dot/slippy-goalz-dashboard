import { useState, useEffect, useMemo, useCallback } from "react";
import {
  UserPlus, Shield, ChevronDown, ChevronRight,
  Check, X, Eye, EyeOff, Power, PowerOff,
} from "lucide-react";
import { useTheme, primaryBtnStyle, primaryBtnHoverProps, secondaryBtnStyle, cardStyle } from "../context/ThemeContext";
import { useToast } from "../context/ToastContext";
import { useStore } from "../store/useStore";
import Modal from "./Modal";
import Sheet from "./Sheet";
import { Button, Badge } from "../design-system";
import { radius, color } from "../design-system/tokens";
import {
  PERMISSIONS,
  ALL_PERMISSION_KEYS,
  DEFAULT_STAFF_PERMISSIONS,
  MAX_STAFF_MEMBERS,
} from "../constants/permissions";

function MemberAvatar({ name, size = 48, isOwner }) {
  const { theme: t, dark } = useTheme();
  const bg = isOwner
    ? (dark ? "rgba(244,63,94,0.16)" : "rgba(244,63,94,0.10)")
    : (dark ? "rgba(16,185,129,0.16)" : "rgba(16,185,129,0.10)");
  const fg = isOwner ? color.brand.DEFAULT : "#10B981";
  const initials = (name || "?").slice(0, 1).toUpperCase();

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: 14,
        background: bg,
        color: fg,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontWeight: 650,
        fontSize: size * 0.34,
        flexShrink: 0,
      }}
    >
      {initials}
    </div>
  );
}

function PermissionToggle({ permKey, checked, onChange, disabled }) {
  const { theme: t, dark } = useTheme();
  const perm = PERMISSIONS[permKey];
  if (!perm) return null;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 14,
        padding: "14px 0",
        borderBottom: `1px solid ${t.borderSub || t.border}`,
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 550, color: disabled ? t.textMuted : t.textPrimary }}>
          {perm.label}
        </div>
        <div style={{ fontSize: 12, color: t.textMuted, lineHeight: 1.4, marginTop: 3 }}>
          {perm.description}
        </div>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={perm.label}
        disabled={disabled}
        onClick={() => !disabled && onChange(!checked)}
        style={{
          width: 44,
          height: 26,
          borderRadius: 999,
          border: "none",
          padding: 2,
          background: checked
            ? color.brand.DEFAULT
            : dark ? "rgba(255,255,255,0.12)" : "rgba(15,17,21,0.12)",
          cursor: disabled ? "default" : "pointer",
          opacity: disabled ? 0.5 : 1,
          transition: "background 180ms ease",
          flexShrink: 0,
        }}
      >
        <span
          style={{
            display: "block",
            width: 22,
            height: 22,
            borderRadius: "50%",
            background: "#fff",
            boxShadow: "0 1px 2px rgba(0,0,0,0.15)",
            transform: checked ? "translateX(18px)" : "translateX(0)",
            transition: "transform 180ms ease",
          }}
        />
      </button>
    </div>
  );
}

function AddStaffModal({ open, onClose }) {
  const { theme: t, dark } = useTheme();
  const { showToast } = useToast();
  const addStaffMember = useStore((s) => s.addStaffMember);
  const staff = useStore((s) => s.staff);

  const [form, setForm] = useState({ username: "", password: "" });
  const [permissions, setPermissions] = useState([...DEFAULT_STAFF_PERMISSIONS]);
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [step, setStep] = useState(1);

  useEffect(() => {
    if (!open) return;
    setForm({ username: "", password: "" });
    setPermissions([...DEFAULT_STAFF_PERMISSIONS]);
    setShowPassword(false);
    setSaving(false);
    setError("");
    setStep(1);
  }, [open]);

  function generatePassword() {
    const chars = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$";
    let pw = "";
    for (let i = 0; i < 12; i++) pw += chars[Math.floor(Math.random() * chars.length)];
    setForm((f) => ({ ...f, password: pw }));
    setShowPassword(true);
  }

  async function handleSave() {
    setSaving(true);
    setError("");
    try {
      await addStaffMember({
        username: form.username.trim().toLowerCase(),
        password: form.password,
        permissions,
      });
      showToast(`${form.username} added to team`);
      onClose?.();
    } catch (err) {
      setError(err.message || "Failed to add staff member");
    } finally {
      setSaving(false);
    }
  }

  const inputStyle = {
    width: "100%",
    border: `1px solid ${t.border}`,
    borderRadius: 12,
    padding: "10px 14px",
    fontSize: 13,
    background: t.inputBg,
    color: t.textPrimary,
    outline: "none",
    boxSizing: "border-box",
    fontFamily: "inherit",
  };

  const nonOwnerStaff = staff.filter((m) => m.role !== "owner");

  return (
    <Modal open={open} onClose={() => !saving && onClose?.()} maxWidth={520} maxHeight="90vh">
      <div style={{ padding: 28 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 550, color: t.textPrimary, letterSpacing: -0.3 }}>
              {step === 1 ? "Add staff member" : "Set permissions"}
            </h2>
            <p style={{ margin: "6px 0 0", fontSize: 13, color: t.textMuted }}>
              {step === 1
                ? `Step 1 of 2 · ${Math.max(0, MAX_STAFF_MEMBERS - nonOwnerStaff.length)} spots remaining`
                : `Step 2 of 2 · Choose what @${form.username} can access`}
            </p>
          </div>
          <button
            type="button"
            disabled={saving}
            onClick={() => !saving && onClose?.()}
            style={{
              background: t.cardBg2, border: `1px solid ${t.border}`, borderRadius: 10,
              width: 36, height: 36, cursor: "pointer", fontSize: 18, color: t.textSecondary,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            ×
          </button>
        </div>

        {step === 1 ? (
          <div style={{ display: "grid", gap: 16 }}>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: t.textMuted, marginBottom: 8 }}>
                Username * (for login — letters, numbers, underscores)
              </label>
              <input
                style={inputStyle}
                value={form.username}
                onChange={(e) => setForm((f) => ({ ...f, username: e.target.value.replace(/\s/g, "").toLowerCase() }))}
                placeholder="ahmed_staff"
                autoComplete="off"
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: t.textMuted, marginBottom: 8 }}>
                Password * (min 8 characters)
              </label>
              <div style={{ display: "flex", gap: 8 }}>
                <div style={{ position: "relative", flex: 1 }}>
                  <input
                    style={inputStyle}
                    type={showPassword ? "text" : "password"}
                    value={form.password}
                    onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                    placeholder="Min 8 characters"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
                      background: "none", border: "none", cursor: "pointer", color: t.textMuted, padding: 4,
                    }}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <button
                  type="button"
                  onClick={generatePassword}
                  style={{ ...secondaryBtnStyle(t), padding: "0 12px", fontSize: 12, whiteSpace: "nowrap", fontFamily: "inherit" }}
                >
                  Generate
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div style={{ maxHeight: 400, overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8, gap: 8 }}>
              <button
                type="button"
                onClick={() => setPermissions([...ALL_PERMISSION_KEYS])}
                style={{ fontSize: 12, fontWeight: 500, color: color.brand.DEFAULT, background: "none", border: "none", cursor: "pointer", fontFamily: "inherit" }}
              >
                Select all
              </button>
              <button
                type="button"
                onClick={() => setPermissions([])}
                style={{ fontSize: 12, fontWeight: 500, color: t.textMuted, background: "none", border: "none", cursor: "pointer", fontFamily: "inherit" }}
              >
                Clear
              </button>
            </div>
            {ALL_PERMISSION_KEYS.map((key) => (
              <PermissionToggle
                key={key}
                permKey={key}
                checked={permissions.includes(key)}
                onChange={(v) => {
                  setPermissions((prev) =>
                    v ? [...prev, key] : prev.filter((k) => k !== key)
                  );
                }}
                disabled={false}
              />
            ))}
          </div>
        )}

        {error && (
          <div
            style={{
              marginTop: 16, padding: "12px 14px",
              background: "rgba(239,68,68,0.1)", color: dark ? "#fca5a5" : "#b91c1c",
              borderRadius: 12, fontSize: 13, border: "1px solid rgba(239,68,68,0.3)",
            }}
          >
            {error}
          </div>
        )}

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 24 }}>
          {step === 2 && (
            <button type="button" disabled={saving} onClick={() => setStep(1)}
              style={{ ...secondaryBtnStyle(t), padding: "10px 18px", fontSize: 13 }}>Back</button>
          )}
          <button type="button" disabled={saving} onClick={() => !saving && onClose?.()}
            style={{ ...secondaryBtnStyle(t), padding: "10px 18px", fontSize: 13 }}>Cancel</button>
          {step === 1 ? (
            <button
              type="button"
              onClick={() => {
                if (!form.username.trim() || !/^[a-zA-Z][a-zA-Z0-9_]{2,31}$/.test(form.username.trim())) {
                  setError("Username must start with a letter, 3–32 chars (letters, numbers, _)");
                  return;
                }
                if (!form.password || form.password.length < 8) {
                  setError("Password must be at least 8 characters");
                  return;
                }
                setError("");
                setStep(2);
              }}
              {...primaryBtnHoverProps(t)}
              style={{ ...primaryBtnStyle(t), padding: "10px 22px", fontSize: 13 }}
            >
              Next: Permissions
            </button>
          ) : (
            <button
              type="button" disabled={saving} onClick={handleSave}
              {...primaryBtnHoverProps(t)}
              style={{ ...primaryBtnStyle(t), padding: "10px 22px", fontSize: 13, opacity: saving ? 0.7 : 1, cursor: saving ? "wait" : "pointer" }}
            >
              {saving ? "Adding…" : "Add member"}
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
}

function MemberPermissionsDrawer({ member, onClose }) {
  const { theme: t } = useTheme();
  const { showToast } = useToast();
  const updateStaffPermissions = useStore((s) => s.updateStaffPermissions);
  const setStaffActive = useStore((s) => s.setStaffActive);
  const [permissions, setPermissions] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (member) {
      setPermissions([...(member.permissions || [])]);
    }
  }, [member?.username]);

  if (!member) return null;

  const isOwner = member.role === "owner";
  const canEdit = member.can_edit_permissions && !isOwner;
  const dirty = !isOwner && JSON.stringify([...permissions].sort()) !== JSON.stringify([...(member.permissions || [])].sort());

  async function handleSave() {
    setSaving(true);
    try {
      await updateStaffPermissions(member.username, permissions);
      showToast("Permissions updated");
      onClose?.();
    } catch (err) {
      showToast(err.message || "Failed to save", "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleActive() {
    setSaving(true);
    try {
      await setStaffActive(member.username, !member.is_active);
      showToast(member.is_active ? `${member.username} disabled` : `${member.username} enabled`);
    } catch (err) {
      showToast(err.message || "Failed to update", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet
      open={!!member}
      onClose={onClose}
      title={`@${member.username}`}
      subtitle={`${isOwner ? "Owner" : "Staff"} · ${member.source === "env" ? "Environment" : "Database"}`}
      width={460}
      footer={
        dirty ? (
          <>
            <button type="button" onClick={onClose}
              style={{ ...secondaryBtnStyle(t), padding: "10px 16px", fontSize: 13, fontFamily: "inherit", flex: 1 }}>Cancel</button>
            <button type="button" disabled={saving} onClick={handleSave}
              {...primaryBtnHoverProps(t)}
              style={{ ...primaryBtnStyle(t), padding: "10px 16px", fontSize: 13, fontFamily: "inherit", flex: 1, opacity: saving ? 0.7 : 1 }}>
              {saving ? "Saving…" : "Save permissions"}
            </button>
          </>
        ) : null
      }
    >
      {/* Member info */}
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 24 }}>
        <MemberAvatar name={member.username} size={52} isOwner={isOwner} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 16, fontWeight: 550, color: t.textPrimary }}>@{member.username}</span>
            <Badge variant={isOwner ? "brand" : member.is_active ? "success" : "neutral"} dot>
              {isOwner ? "Owner" : member.is_active ? "Active" : "Disabled"}
            </Badge>
          </div>
          <div style={{ fontSize: 13, color: t.textMuted, marginTop: 4 }}>
            Source: {member.source} · {(member.permissions || []).length} permissions
          </div>
        </div>
      </div>

      {/* Toggle active */}
      {member.can_disable && (
        <div style={{ marginBottom: 20 }}>
          <button
            type="button"
            disabled={saving}
            onClick={handleToggleActive}
            style={{
              ...secondaryBtnStyle(t),
              width: "100%",
              padding: "12px",
              fontSize: 13,
              fontFamily: "inherit",
              gap: 8,
              color: member.is_active ? t.risk : "#10B981",
            }}
          >
            {member.is_active ? <PowerOff size={15} /> : <Power size={15} />}
            {member.is_active ? "Disable account" : "Enable account"}
          </button>
        </div>
      )}

      {/* Permissions */}
      <div style={{ fontSize: 11, fontWeight: 500, color: t.textMuted, letterSpacing: "0.04em", textTransform: "uppercase", marginBottom: 10 }}>
        Permissions ({(isOwner ? ALL_PERMISSION_KEYS : permissions).length}/{ALL_PERMISSION_KEYS.length})
      </div>

      {isOwner && (
        <div style={{ fontSize: 13, color: t.textMuted, marginBottom: 16, lineHeight: 1.5 }}>
          Owner has full access to everything. Permissions cannot be changed.
        </div>
      )}

      {canEdit && (
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8, gap: 8 }}>
          <button type="button" onClick={() => setPermissions([...ALL_PERMISSION_KEYS])}
            style={{ fontSize: 12, fontWeight: 500, color: color.brand.DEFAULT, background: "none", border: "none", cursor: "pointer", fontFamily: "inherit" }}>
            Select all
          </button>
          <button type="button" onClick={() => setPermissions([])}
            style={{ fontSize: 12, fontWeight: 500, color: t.textMuted, background: "none", border: "none", cursor: "pointer", fontFamily: "inherit" }}>
            Clear
          </button>
        </div>
      )}

      {ALL_PERMISSION_KEYS.map((key) => (
        <PermissionToggle
          key={key}
          permKey={key}
          checked={isOwner || permissions.includes(key)}
          onChange={(v) => {
            setPermissions((prev) => v ? [...prev, key] : prev.filter((k) => k !== key));
          }}
          disabled={!canEdit}
        />
      ))}
    </Sheet>
  );
}

export default function TeamManager({ sessionUser }) {
  const { theme: t, dark } = useTheme();
  const { showToast } = useToast();
  const staff = useStore((s) => s.staff);
  const staffLoading = useStore((s) => s.staffLoading);
  const fetchStaff = useStore((s) => s.fetchStaff);

  const [addOpen, setAddOpen] = useState(false);
  const [selectedUsername, setSelectedUsername] = useState(null);

  useEffect(() => {
    fetchStaff();
  }, [fetchStaff]);

  const selectedMember = useMemo(
    () => staff.find((s) => s.username === selectedUsername),
    [staff, selectedUsername]
  );

  const owner = staff.find((m) => m.role === "owner");
  const nonOwner = staff.filter((m) => m.role !== "owner");

  return (
    <>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 550, letterSpacing: -0.4, color: t.textPrimary }}>
          Team
        </h2>
        <p style={{ margin: "6px 0 0", fontSize: 14, color: t.textMuted, lineHeight: 1.5 }}>
          Manage who can access your workspace and what they can do. Up to {MAX_STAFF_MEMBERS} staff members.
        </p>
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16, gap: 10 }}>
        <span style={{ flex: 1, fontSize: 13, color: t.textMuted, alignSelf: "center" }}>
          {staff.length} of {MAX_STAFF_MEMBERS + 1} seats used
        </span>
        <Button
          variant="primary"
          size="sm"
          onClick={() => setAddOpen(true)}
          disabled={nonOwner.length >= MAX_STAFF_MEMBERS}
        >
          <UserPlus size={16} strokeWidth={2} />
          Add staff
        </Button>
      </div>

      {/* Owner card */}
      {owner && (
        <div
          style={{
            ...cardStyle(t, { interactive: true }),
            padding: 20, borderRadius: radius.lg,
            display: "flex", alignItems: "center", gap: 16, marginBottom: 12, cursor: "pointer",
          }}
          onClick={() => setSelectedUsername(owner.username)}
        >
          <MemberAvatar name={owner.username} size={48} isOwner />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <span style={{ fontSize: 15, fontWeight: 550, color: t.textPrimary }}>@{owner.username}</span>
              <Badge variant="brand" dot>Owner</Badge>
            </div>
            <div style={{ fontSize: 13, color: t.textSecondary, marginTop: 4 }}>
              Full access · All permissions
            </div>
          </div>
          <Shield size={18} strokeWidth={1.75} color={t.textMuted} />
        </div>
      )}

      {/* Staff list */}
      {nonOwner.map((member) => (
        <div
          key={member.username}
          className="set-lift"
          style={{
            ...cardStyle(t, { interactive: true }),
            padding: 20, borderRadius: radius.lg,
            display: "flex", alignItems: "center", gap: 16, marginBottom: 12, cursor: "pointer",
            opacity: member.is_active ? 1 : 0.6,
          }}
          onClick={() => setSelectedUsername(member.username)}
        >
          <MemberAvatar name={member.username} size={48} isOwner={false} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <span style={{ fontSize: 15, fontWeight: 550, color: t.textPrimary }}>@{member.username}</span>
              <Badge variant={member.is_active ? "success" : "neutral"} dot>
                {member.is_active ? "Active" : "Disabled"}
              </Badge>
              {member.source === "env" && (
                <Badge variant="neutral">ENV</Badge>
              )}
            </div>
            <div style={{ fontSize: 13, color: t.textSecondary, marginTop: 4 }}>
              {(member.permissions || []).length} permissions
              {!member.is_active && " · Account disabled"}
            </div>
          </div>
        </div>
      ))}

      {staffLoading && staff.length === 0 && (
        <div style={{ ...cardStyle(t, { interactive: false }), padding: "48px 28px", borderRadius: radius.lg, textAlign: "center" }}>
          <div style={{ fontSize: 13, color: t.textMuted }}>Loading team…</div>
        </div>
      )}

      {!staffLoading && nonOwner.length === 0 && (
        <div style={{ ...cardStyle(t, { interactive: false }), padding: "48px 28px", borderRadius: radius.lg, textAlign: "center" }}>
          <div style={{ fontSize: 15, fontWeight: 550, color: t.textPrimary, marginBottom: 6 }}>
            No staff members yet
          </div>
          <div style={{ fontSize: 13, color: t.textMuted, lineHeight: 1.5 }}>
            Add staff to share access with your team. Choose exactly which pages they can see.
          </div>
        </div>
      )}

      <AddStaffModal open={addOpen} onClose={() => setAddOpen(false)} />
      <MemberPermissionsDrawer member={selectedMember} onClose={() => setSelectedUsername(null)} />
    </>
  );
}
