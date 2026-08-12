import { useState } from "react";
import { useTheme } from "../context/ThemeContext";

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DAYS   = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

export default function Calendar({ bookings = [], onSelectDate }) {
  const { theme:t, dark } = useTheme();
  const today = new Date();
  const [year,  setYear]  = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [hover, setHover] = useState(null);
  const [selected, setSelected] = useState(null);

  const firstDay    = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const prevMonth = () => { if (month===0){setMonth(11);setYear(year-1);}else setMonth(month-1); };
  const nextMonth = () => { if (month===11){setMonth(0);setYear(year+1);}else setMonth(month+1); };

  const getBookingsForDay = (day) =>
    bookings.filter(b => {
      if (!b.Date) return false;
      const d = new Date(b.Date);
      return d.getDate()===day && d.getMonth()===month && d.getFullYear()===year;
    });

  const isToday = (day) =>
    day===today.getDate() && month===today.getMonth() && year===today.getFullYear();

  return (
    <div style={{ background:t.cardBg, borderRadius:t.cardRadius ?? 32, padding:24, border:`1px solid ${t.border}`, boxShadow:t.cardShadow }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20 }}>
        <button type="button" className="ui-press" onClick={prevMonth} style={{ width:32, height:32, borderRadius:9999, border:`1px solid ${t.border}`, background:t.cardBg2, cursor:"pointer", fontSize:14, color:t.textSecondary, fontWeight:600, display:"flex", alignItems:"center", justifyContent:"center" }}>←</button>
        <h3 className="font-display" style={{ margin:0, fontSize:16, fontWeight:500, color:t.textPrimary, letterSpacing:-0.3 }}>{MONTHS[month]} {year}</h3>
        <button type="button" className="ui-press" onClick={nextMonth} style={{ width:32, height:32, borderRadius:9999, border:`1px solid ${t.border}`, background:t.cardBg2, cursor:"pointer", fontSize:14, color:t.textSecondary, fontWeight:600, display:"flex", alignItems:"center", justifyContent:"center" }}>→</button>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:6, marginBottom:8 }}>
        {DAYS.map(d => (
          <div key={d} className="ds-th" style={{ textAlign:"center", padding:"6px 0" }}>{d}</div>
        ))}
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:6 }}>
        {[...Array(firstDay)].map((_,i) => <div key={`e${i}`} />)}
        {[...Array(daysInMonth)].map((_,i) => {
          const day = i+1;
          const dayBookings = getBookingsForDay(day);
          const confirmed   = dayBookings.filter(b => b.Status==="Confirmed").length;
          const pending     = dayBookings.filter(b => b.Status==="Pending").length;
          const isHov       = hover===day;
          const todayCell   = isToday(day);
          const isSel       = selected === day;

          return (
            <div key={day}
              onClick={() => {
                setSelected(day);
                onSelectDate && onSelectDate(day, dayBookings);
              }}
              onMouseEnter={() => setHover(day)}
              onMouseLeave={() => setHover(null)}
              style={{ aspectRatio:1, padding:8, borderRadius:16, cursor:onSelectDate?"pointer":"default", transition:"all .12s",
                border: isSel ? `2px solid ${t.accent}` : todayCell ? `1.5px solid ${t.accent}` : `1px solid ${t.borderSub}`,
                boxShadow: isSel ? `inset 0 0 0 1px ${t.accent}33` : "none",
                background: dayBookings.length>0 ? (dark ? t.accentGlow : t.accentSoft || "#FFF1F2") : isHov ? t.rowHover : t.cardBg,
                display:"flex", flexDirection:"column", justifyContent:"space-between",
              }}
            >
              <div className="font-mono-data" style={{ fontSize:13, fontWeight:todayCell||isSel?700:500, color:todayCell||isSel?t.accent:t.textPrimary }}>{day}</div>
              {dayBookings.length>0 && (
                <span
                  className="font-mono-data"
                  style={{
                    alignSelf: "flex-start",
                    fontSize: 10,
                    fontWeight: 600,
                    padding: "1px 6px",
                    borderRadius: 999,
                    background: t.accentGlow,
                    color: t.accent,
                    boxShadow: "none",
                  }}
                >
                  {dayBookings.length}
                </span>
              )}
              {(confirmed>0 || pending>0) && (
                <div style={{ display:"flex", gap:3 }}>
                  {confirmed>0 && <div style={{ width:6, height:6, borderRadius:"50%", background:t.accent }} />}
                  {pending>0   && <div style={{ width:6, height:6, borderRadius:"50%", background:"#F9AB00" }} />}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div style={{ display:"flex", gap:16, marginTop:18, paddingTop:16, borderTop:`1px solid ${t.border}`, justifyContent:"center" }}>
        {[[t.accent,"Confirmed"],["#F9AB00","Pending"],["var(--risk)","Rejected"]].map(([c,l]) => (
          <div key={l} style={{ display:"flex", alignItems:"center", gap:6 }}>
            <span style={{ width:8, height:8, borderRadius:"50%", background:c }} />
            <span style={{ fontSize:11, color:t.textMuted, fontWeight:500 }}>{l}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
