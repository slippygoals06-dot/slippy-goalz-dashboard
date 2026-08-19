import { createPortal } from "react-dom";
import { useTheme } from "../context/ThemeContext";
import { phonesMatch } from "../utils/format";
import { getCustomerTier } from "../utils/customerTier";
import StatusBadge from "./StatusBadge";

export default function CustomerHistory({ customer, bookings, invoices = [], onClose }) {
  const { theme: t } = useTheme();
  if (!customer) return null;

  const SERVICE_PRICES = {
    "Screen Repair":5000,"Battery Replacement":2500,"Software Fix":1500,
    "Water Damage":8000,"Charging Port":3000,"Camera Repair":4000
  };

  // Match across legacy formats (0300…) and normalized (+92…) phones
  const history = bookings.filter(b => phonesMatch(b.Phone, customer.Phone));
  const totalSpent = history.filter(b => b.Status === "Confirmed").reduce((s,b) => s+(SERVICE_PRICES[b.Service]||0), 0);
  const firstVisit = history.length ? history[history.length-1].Date : "—";
  const lastVisit  = history.length ? history[0].Date : "—";
  const tier = getCustomerTier(customer.Phone, bookings, invoices);

  return createPortal(
    <div
      className="modal-backdrop"
      onClick={onClose}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        inset: 0,
        zIndex: 2000,
        background: "rgba(0,0,0,0.65)",
        backdropFilter: "blur(8px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
    >
      <div
        className="modal-surface"
        onClick={e=>e.stopPropagation()}
        style={{
          background: t.cardBg,
          borderRadius: 14,
          padding: 32,
          width: "100%",
          maxWidth: 520,
          boxShadow: t.cardShadow,
          border: `1px solid ${t.border}`,
          borderTop: `1px solid ${t.borderTopHighlight}`,
          maxHeight: "80vh",
          overflowY: "auto",
          position: "relative",
          zIndex: 1,
        }}
      >
        
        {/* Header */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:24 }}>
          <div style={{ display:"flex", alignItems:"center", gap:14 }}>
            <div style={{ width:48, height:48, borderRadius:12, background:"rgba(255,255,255,0.06)", border:`1px solid ${t.border}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, fontWeight:700, color:t.textSecondary }}>
              {customer.Name?.charAt(0)}
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <div style={{ fontSize:18, fontWeight:800, color:t.textPrimary }}>{customer.Name}</div>
                {tier && <StatusBadge status={tier} />}
              </div>
              <div style={{ fontSize:13, color:t.textMuted, marginTop:2 }}>{customer.Phone}</div>
            </div>
          </div>
          <button onClick={onClose} style={{ background:t.cardBg2, border:"none", borderRadius:10, width:36, height:36, cursor:"pointer", fontSize:20, color:t.textMuted }}>×</button>
        </div>

        {/* Stats */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12, marginBottom:24 }}>
          {[
            { label:"Total Visits", value:history.length },
            { label:"Total Spent", value:"₨"+totalSpent.toLocaleString() },
            { label:"Confirmed", value:history.filter(b=>b.Status==="Confirmed").length },
          ].map(s => (
            <div key={s.label} style={{ background:t.cardBg2, borderRadius:14, padding:"14px 16px", border:`1px solid ${t.border}` }}>
              <div style={{ fontSize:18, fontWeight:800, color:t.textPrimary }}>{s.value}</div>
              <div style={{ fontSize:11, color:t.textMuted, marginTop:3 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Meta */}
        <div style={{ display:"flex", gap:16, marginBottom:20, fontSize:12, color:t.textMuted }}>
          <span>🗓 First visit: <strong style={{ color:t.textPrimary }}>{firstVisit}</strong></span>
          <span>🕐 Last visit: <strong style={{ color:t.textPrimary }}>{lastVisit}</strong></span>
        </div>

        {/* Booking history */}
        <div style={{ fontWeight:700, fontSize:14, color:t.textPrimary, marginBottom:12 }}>Booking History</div>
        {history.length === 0 ? (
          <div style={{ textAlign:"center", padding:"30px 0", color:t.textMuted, fontSize:13 }}>No bookings found</div>
        ) : (
          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            {history.map((b,i) => (
              <div key={i} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"12px 14px", borderRadius:12, background:t.cardBg2, border:`1px solid ${t.border}` }}>
                <div>
                  <div style={{ fontSize:13, fontWeight:600, color:t.textPrimary }}>{b.Service}</div>
                  <div style={{ fontSize:11, color:t.textMuted, marginTop:2 }}>{b.Date} · {b.Time}</div>
                </div>
                <div style={{ textAlign:"right" }}>
                  <span style={{ fontSize:11, fontWeight:700, padding:"3px 10px", borderRadius:20,
                    background:b.Status==="Confirmed"?"rgba(34,197,94,0.15)":b.Status==="Rejected"?"rgba(248,113,113,0.15)":"rgba(234,179,8,0.15)",
                    color:b.Status==="Confirmed"?"#4ade80":b.Status==="Rejected"?"#f87171":"#fbbf24"
                  }}>{b.Status}</span>
                  {b.Status==="Confirmed" && <div style={{ fontSize:11, color:t.textMuted, marginTop:4 }}>₨{(SERVICE_PRICES[b.Service]||0).toLocaleString()}</div>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
