import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "medical-appointments";

const theme = {
  bg: "#F0F4F8",
  card: "#FFFFFF",
  primary: "#2B7A78",
  primaryLight: "#DEF2F1",
  primaryDark: "#17252A",
  accent: "#3AAFA9",
  danger: "#E85D75",
  dangerLight: "#FDE8EC",
  text: "#17252A",
  textMuted: "#5C7A7B",
  border: "#D4E4E3",
  warning: "#F6A623",
  warningLight: "#FEF3D6",
  shadow: "0 2px 12px rgba(43, 122, 120, 0.08)",
  shadowHover: "0 4px 20px rgba(43, 122, 120, 0.15)",
};

const HEBREW_MONTHS = ["ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני", "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר"];
const HEBREW_DAYS_SHORT = ["א׳", "ב׳", "ג׳", "ד׳", "ה׳", "ו׳", "ש׳"];
const HEBREW_DAYS_FULL = ["יום ראשון", "יום שני", "יום שלישי", "יום רביעי", "יום חמישי", "יום שישי", "שבת"];

function formatDate(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T00:00:00");
  return `${HEBREW_DAYS_FULL[d.getDay()]}, ${d.getDate()} ${HEBREW_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

function toDateStr(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function isUpcoming(dateStr) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return new Date(dateStr + "T00:00:00") >= today;
}

function isToday(dateStr) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const d = new Date(dateStr + "T00:00:00"); d.setHours(0, 0, 0, 0);
  return d.getTime() === today.getTime();
}

function isTomorrow(dateStr) {
  const t = new Date(); t.setDate(t.getDate() + 1); t.setHours(0, 0, 0, 0);
  const d = new Date(dateStr + "T00:00:00"); d.setHours(0, 0, 0, 0);
  return d.getTime() === t.getTime();
}

function daysUntil(dateStr) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const d = new Date(dateStr + "T00:00:00"); d.setHours(0, 0, 0, 0);
  return Math.ceil((d - today) / (1000 * 60 * 60 * 24));
}

// --- Storage (localStorage) ---
function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return { appointments: [], dismissedAlerts: [] };
}

function saveData(data) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch (e) { console.error("Save failed:", e); }
}

// Generate recurring instances
function expandRecurring(apt) {
  if (!apt.recurring || !apt.recurringWeeks) return [apt];
  const instances = [apt];
  const baseDate = new Date(apt.date + "T00:00:00");
  const count = apt.recurringCount || 12;
  for (let i = 1; i < count; i++) {
    const newDate = new Date(baseDate);
    newDate.setDate(newDate.getDate() + (i * apt.recurringWeeks * 7));
    instances.push({
      ...apt,
      id: `${apt.id}_r${i}`,
      date: toDateStr(newDate),
      parentId: apt.id,
      recurringIndex: i,
    });
  }
  return instances;
}

// --- Alert Banners ---
function AlertBanners({ appointments, dismissedAlerts, onDismiss }) {
  const alerts = [];
  
  appointments.forEach(apt => {
    if (!isUpcoming(apt.date)) return;
    const days = daysUntil(apt.date);
    
    const checks = [
      { d: 0, type: "today", suffix: "today" },
      { d: 1, type: "tomorrow", suffix: "1d" },
      { d: 3, type: "soon", suffix: "3d" },
      { d: 7, type: "week", suffix: "7d" },
    ];
    
    checks.forEach(({ d, type, suffix }) => {
      if (days === d) {
        const key = `${apt.id}_${suffix}`;
        if (!dismissedAlerts.includes(key)) {
          alerts.push({ key, apt, type, days: d });
        }
      }
    });
  });

  if (alerts.length === 0) return null;

  const styles = {
    today: { bg: "#FFE8E8", border: "#E85D75", icon: "🔴", label: "היום!" },
    tomorrow: { bg: "#FFF3E0", border: "#F6A623", icon: "🟠", label: "מחר!" },
    soon: { bg: theme.warningLight, border: theme.warning, icon: "⚠️", label: "בעוד 3 ימים" },
    week: { bg: theme.primaryLight, border: theme.accent, icon: "📢", label: "בעוד שבוע" },
  };

  return (
    <div style={{ marginBottom: 16, display: "flex", flexDirection: "column", gap: 8 }}>
      {alerts.map(alert => {
        const s = styles[alert.type];
        return (
          <div key={alert.key} style={{
            background: s.bg, border: `2px solid ${s.border}`, borderRadius: 14,
            padding: "14px 16px", display: "flex", alignItems: "center", justifyContent: "space-between",
            animation: "fadeIn 0.3s ease",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1 }}>
              <span style={{ fontSize: 22 }}>{s.icon}</span>
              <div>
                <div style={{ fontSize: 14, fontWeight: 800, color: theme.primaryDark }}>{s.label} — {alert.apt.reason}</div>
                <div style={{ fontSize: 13, color: theme.textMuted }}>{formatDate(alert.apt.date)} | {alert.apt.time} | {alert.apt.location}</div>
              </div>
            </div>
            <button onClick={() => onDismiss(alert.key)} style={{
              background: "transparent", border: "none", fontSize: 18, color: theme.textMuted,
              cursor: "pointer", padding: "4px 8px", borderRadius: 8, flexShrink: 0,
            }}>✕</button>
          </div>
        );
      })}
    </div>
  );
}

// --- Badge ---
function AppointmentBadge({ dateStr }) {
  if (isToday(dateStr)) return <span style={{ background: theme.danger, color: "#fff", padding: "3px 12px", borderRadius: 20, fontSize: 13, fontWeight: 700 }}>היום!</span>;
  if (isTomorrow(dateStr)) return <span style={{ background: "#F6A623", color: "#fff", padding: "3px 12px", borderRadius: 20, fontSize: 13, fontWeight: 700 }}>מחר</span>;
  const days = daysUntil(dateStr);
  if (days > 0 && days <= 7) return <span style={{ background: theme.primaryLight, color: theme.primary, padding: "3px 12px", borderRadius: 20, fontSize: 13, fontWeight: 600 }}>בעוד {days} ימים</span>;
  return null;
}

// --- Card ---
function AppointmentCard({ apt, onDelete }) {
  const upcoming = isUpcoming(apt.date);
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <div style={{
      background: upcoming ? theme.card : "#F7F9FA",
      border: `1.5px solid ${upcoming ? theme.border : "#E8ECEE"}`,
      borderRadius: 16, padding: "20px 22px", marginBottom: 14,
      boxShadow: upcoming ? theme.shadow : "none",
      opacity: upcoming ? 1 : 0.65,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
        <span style={{ fontSize: 22, filter: upcoming ? "none" : "grayscale(0.5)" }}>🏥</span>
        <span style={{ fontSize: 17, fontWeight: 700, color: upcoming ? theme.primaryDark : theme.textMuted }}>{apt.reason}</span>
        <AppointmentBadge dateStr={apt.date} />
        {apt.recurring && <span style={{ background: "#E8F0FE", color: "#1A73E8", padding: "2px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600 }}>🔄 חוזר</span>}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 6 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}><span style={{ fontSize: 18 }}>📅</span><span style={{ fontSize: 15, color: theme.text, fontWeight: 500 }}>{formatDate(apt.date)}</span></div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}><span style={{ fontSize: 18 }}>🕐</span><span style={{ fontSize: 15, color: theme.text, fontWeight: 500 }}>{apt.time}</span></div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}><span style={{ fontSize: 18 }}>📍</span><span style={{ fontSize: 15, color: theme.text, fontWeight: 500 }}>{apt.location}</span></div>
      </div>

      {!upcoming && <div style={{ marginTop: 8, fontSize: 13, color: theme.textMuted, fontStyle: "italic" }}>✓ התור עבר</div>}

      <div style={{ marginTop: 12 }}>
        {!confirmDelete ? (
          <button onClick={() => setConfirmDelete(true)} style={{
            background: "transparent", border: "none", color: theme.textMuted, fontSize: 13,
            cursor: "pointer", padding: "6px 10px", borderRadius: 8,
          }}
            onMouseEnter={e => { e.target.style.color = theme.danger; e.target.style.background = theme.dangerLight; }}
            onMouseLeave={e => { e.target.style.color = theme.textMuted; e.target.style.background = "transparent"; }}
          >🗑️ מחיקה</button>
        ) : (
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <span style={{ fontSize: 13, color: theme.danger }}>{apt.recurring && !apt.parentId ? "למחוק את כל הסדרה?" : "למחוק?"}</span>
            <button onClick={() => onDelete(apt.id)} style={{ background: theme.danger, color: "#fff", border: "none", borderRadius: 8, padding: "6px 16px", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>כן</button>
            <button onClick={() => setConfirmDelete(false)} style={{ background: theme.border, color: theme.text, border: "none", borderRadius: 8, padding: "6px 16px", fontSize: 14, cursor: "pointer" }}>לא</button>
          </div>
        )}
      </div>
    </div>
  );
}

// --- Date Picker ---
function DatePicker({ value, onChange }) {
  const now = new Date();
  const [viewMonth, setViewMonth] = useState(now.getMonth());
  const [viewYear, setViewYear] = useState(now.getFullYear());

  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const todayStr = toDateStr(now);
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const goMonth = (dir) => {
    let m = viewMonth + dir, y = viewYear;
    if (m < 0) { m = 11; y--; }
    if (m > 11) { m = 0; y++; }
    setViewMonth(m); setViewYear(y);
  };

  const btnBase = { border: "none", cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s" };

  return (
    <div style={{ background: "#FAFCFC", border: `2px solid ${theme.border}`, borderRadius: 14, padding: 14, marginBottom: 4 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <button onClick={() => goMonth(-1)} style={{ ...btnBase, background: theme.primaryLight, borderRadius: 10, width: 42, height: 42, fontSize: 20, color: theme.primary }}>→</button>
        <span style={{ fontSize: 17, fontWeight: 700, color: theme.primaryDark }}>{HEBREW_MONTHS[viewMonth]} {viewYear}</span>
        <button onClick={() => goMonth(1)} style={{ ...btnBase, background: theme.primaryLight, borderRadius: 10, width: 42, height: 42, fontSize: 20, color: theme.primary }}>←</button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2, marginBottom: 6 }}>
        {HEBREW_DAYS_SHORT.map(d => <div key={d} style={{ textAlign: "center", fontSize: 12, fontWeight: 700, color: theme.textMuted, padding: 4 }}>{d}</div>)}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 3 }}>
        {cells.map((day, i) => {
          if (!day) return <div key={`e${i}`} />;
          const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const isSelected = value === dateStr;
          const isCurrentDay = dateStr === todayStr;
          return (
            <button key={i} onClick={() => onChange(dateStr)} style={{
              ...btnBase, width: "100%", aspectRatio: "1", borderRadius: 10, fontSize: 16,
              fontWeight: isSelected ? 800 : 500,
              background: isSelected ? theme.accent : isCurrentDay ? theme.primaryLight : "transparent",
              color: isSelected ? "#fff" : isCurrentDay ? theme.primary : theme.text,
              boxShadow: isSelected ? "0 2px 8px rgba(58,175,169,0.3)" : "none",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>{day}</button>
          );
        })}
      </div>
    </div>
  );
}

// --- Time Picker with manual input ---
function TimePicker({ value, onChange }) {
  const [mode, setMode] = useState("buttons");
  const [manualH, setManualH] = useState("");
  const [manualM, setManualM] = useState("");
  const [h, m] = value ? value.split(":").map(Number) : [null, null];

  const morningHours = [7, 8, 9, 10, 11, 12];
  const afternoonHours = [13, 14, 15, 16, 17, 18, 19, 20, 21];
  const quickMinutes = [0, 15, 30, 45];

  const selectHour = (hour) => {
    const min = m != null ? m : 0;
    onChange(`${String(hour).padStart(2, "0")}:${String(min).padStart(2, "0")}`);
  };
  const selectMinute = (min) => {
    const hour = h != null ? h : 9;
    onChange(`${String(hour).padStart(2, "0")}:${String(min).padStart(2, "0")}`);
  };

  const applyManual = () => {
    const hh = parseInt(manualH), mm = parseInt(manualM);
    if (!isNaN(hh) && hh >= 0 && hh <= 23 && !isNaN(mm) && mm >= 0 && mm <= 59) {
      onChange(`${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`);
    }
  };

  const hourBtnStyle = (selected) => ({
    border: selected ? `2px solid ${theme.accent}` : "2px solid transparent",
    borderRadius: 12, padding: "12px 4px", fontSize: 18,
    fontWeight: selected ? 800 : 600,
    background: selected ? theme.accent : "#EDF2F4",
    color: selected ? "#fff" : theme.text,
    cursor: "pointer", fontFamily: "inherit",
    boxShadow: selected ? "0 3px 10px rgba(58,175,169,0.35)" : "none",
    minWidth: 48, textAlign: "center",
  });

  const minBtnStyle = (selected) => ({
    border: selected ? `2px solid ${theme.accent}` : "2px solid transparent",
    borderRadius: 14, padding: "14px 8px", fontSize: 20,
    fontWeight: selected ? 800 : 600,
    background: selected ? theme.accent : "#EDF2F4",
    color: selected ? "#fff" : theme.text,
    cursor: "pointer", fontFamily: "inherit",
    boxShadow: selected ? "0 3px 10px rgba(58,175,169,0.35)" : "none",
    textAlign: "center",
  });

  const tabStyle = (active) => ({
    flex: 1, padding: "10px", fontSize: 15, fontWeight: 700,
    background: active ? theme.accent : "transparent",
    color: active ? "#fff" : theme.textMuted,
    border: `2px solid ${active ? theme.accent : theme.border}`,
    borderRadius: 10, cursor: "pointer", fontFamily: "inherit",
  });

  const manualInputStyle = {
    width: 80, padding: "16px 8px", fontSize: 32, fontWeight: 800,
    textAlign: "center", border: `2px solid ${theme.border}`, borderRadius: 14,
    outline: "none", color: theme.primaryDark, fontFamily: "inherit",
    background: "#FAFCFC", direction: "ltr",
  };

  return (
    <div style={{ background: "#FAFCFC", border: `2px solid ${theme.border}`, borderRadius: 14, padding: 16, direction: "rtl" }}>
      {value && (
        <div style={{
          textAlign: "center", marginBottom: 16, padding: "10px",
          background: theme.primaryLight, borderRadius: 12,
          fontSize: 28, fontWeight: 800, color: theme.primaryDark,
          letterSpacing: 2, direction: "ltr",
        }}>{value}</div>
      )}

      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <button onClick={() => setMode("buttons")} style={tabStyle(mode === "buttons")}>⚡ בחירה מהירה</button>
        <button onClick={() => setMode("manual")} style={tabStyle(mode === "manual")}>✏️ הקלדה ידנית</button>
      </div>

      {mode === "buttons" ? (
        <>
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: theme.primary, marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>☀️ <span>בוקר</span></div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 6 }}>
              {morningHours.map(hour => <button key={hour} onClick={() => selectHour(hour)} style={hourBtnStyle(h === hour)}>{String(hour).padStart(2, "0")}</button>)}
            </div>
          </div>
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: theme.primary, marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>🌙 <span>אחה״צ / ערב</span></div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 6 }}>
              {afternoonHours.map(hour => <button key={hour} onClick={() => selectHour(hour)} style={hourBtnStyle(h === hour)}>{String(hour).padStart(2, "0")}</button>)}
            </div>
          </div>
          <div style={{ height: 1, background: theme.border, margin: "12px 0" }} />
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: theme.primary, marginBottom: 10 }}>דקות:</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
              {quickMinutes.map(min => <button key={min} onClick={() => selectMinute(min)} style={minBtnStyle(m === min)}>{String(min).padStart(2, "0")}</button>)}
            </div>
          </div>
        </>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, padding: "10px 0" }}>
          <div style={{ fontSize: 15, color: theme.textMuted, fontWeight: 600 }}>הקלד את השעה המדויקת:</div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, direction: "ltr" }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              <span style={{ fontSize: 13, color: theme.textMuted, marginBottom: 6, fontWeight: 600 }}>שעה</span>
              <input type="number" min="0" max="23" placeholder="14" value={manualH}
                onChange={e => setManualH(e.target.value.slice(0, 2))}
                style={manualInputStyle}
                onFocus={e => e.target.style.borderColor = theme.accent}
                onBlur={e => e.target.style.borderColor = theme.border}
              />
            </div>
            <span style={{ fontSize: 40, fontWeight: 800, color: theme.primaryDark, paddingTop: 22 }}>:</span>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              <span style={{ fontSize: 13, color: theme.textMuted, marginBottom: 6, fontWeight: 600 }}>דקות</span>
              <input type="number" min="0" max="59" placeholder="22" value={manualM}
                onChange={e => setManualM(e.target.value.slice(0, 2))}
                style={manualInputStyle}
                onFocus={e => e.target.style.borderColor = theme.accent}
                onBlur={e => e.target.style.borderColor = theme.border}
              />
            </div>
          </div>
          <button onClick={applyManual} disabled={!manualH || !manualM} style={{
            padding: "14px 48px", fontSize: 18, fontWeight: 800,
            background: (manualH && manualM) ? theme.accent : theme.border,
            color: (manualH && manualM) ? "#fff" : theme.textMuted,
            border: "none", borderRadius: 12,
            cursor: (manualH && manualM) ? "pointer" : "not-allowed",
            fontFamily: "inherit",
          }}>קבע שעה</button>
        </div>
      )}
    </div>
  );
}

// --- Recurring Options ---
function RecurringOptions({ recurring, setRecurring, recurringWeeks, setRecurringWeeks, recurringCount, setRecurringCount }) {
  const toggleStyle = (active) => ({
    flex: 1, padding: "12px", fontSize: 16, fontWeight: 700,
    background: active ? theme.accent : "#EDF2F4",
    color: active ? "#fff" : theme.text,
    border: `2px solid ${active ? theme.accent : theme.border}`,
    borderRadius: 12, cursor: "pointer", fontFamily: "inherit",
  });

  const optBtnStyle = (selected) => ({
    padding: "10px 16px", fontSize: 15, fontWeight: selected ? 800 : 600,
    background: selected ? theme.accent : "#EDF2F4",
    color: selected ? "#fff" : theme.text,
    border: selected ? `2px solid ${theme.accent}` : "2px solid transparent",
    borderRadius: 10, cursor: "pointer", fontFamily: "inherit",
    boxShadow: selected ? "0 2px 8px rgba(58,175,169,0.3)" : "none",
  });

  return (
    <div style={{ background: "#FAFCFC", border: `2px solid ${theme.border}`, borderRadius: 14, padding: 16 }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: theme.primary, marginBottom: 12 }}>🔄 האם התור חוזר על עצמו?</div>
      
      <div style={{ display: "flex", gap: 8, marginBottom: recurring ? 16 : 0 }}>
        <button onClick={() => setRecurring(false)} style={toggleStyle(!recurring)}>לא, חד פעמי</button>
        <button onClick={() => setRecurring(true)} style={toggleStyle(recurring)}>כן, חוזר</button>
      </div>

      {recurring && (
        <>
          <div style={{ fontSize: 14, fontWeight: 700, color: theme.primary, marginBottom: 8, marginTop: 4 }}>כל כמה שבועות?</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
            {[1, 2, 3, 4].map(w => (
              <button key={w} onClick={() => setRecurringWeeks(w)} style={optBtnStyle(recurringWeeks === w)}>
                {w === 1 ? "כל שבוע" : `כל ${w} שבועות`}
              </button>
            ))}
          </div>

          <div style={{ fontSize: 14, fontWeight: 700, color: theme.primary, marginBottom: 8 }}>כמה פעמים סה״כ?</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {[4, 6, 8, 12, 24].map(c => (
              <button key={c} onClick={() => setRecurringCount(c)} style={optBtnStyle(recurringCount === c)}>
                {c} פעמים
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// --- Add Form Wizard ---
function AddForm({ onAdd, onCancel }) {
  const [reason, setReason] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [location, setLocation] = useState("");
  const [recurring, setRecurring] = useState(false);
  const [recurringWeeks, setRecurringWeeks] = useState(2);
  const [recurringCount, setRecurringCount] = useState(12);
  const [step, setStep] = useState(0);

  const inputStyle = {
    width: "100%", padding: "14px 16px", fontSize: 17,
    border: `2px solid ${theme.border}`, borderRadius: 12, outline: "none",
    background: "#FAFCFC", color: theme.text, fontFamily: "inherit",
    boxSizing: "border-box", direction: "rtl",
  };
  const labelStyle = { fontSize: 16, fontWeight: 700, color: theme.primary, marginBottom: 8, display: "block" };
  const nextBtnStyle = (disabled) => ({
    width: "100%", padding: "14px", fontSize: 18, fontWeight: 800,
    background: disabled ? theme.border : theme.primary,
    color: disabled ? theme.textMuted : "#fff",
    border: "none", borderRadius: 14, cursor: disabled ? "not-allowed" : "pointer",
    fontFamily: "inherit", marginTop: 10,
  });
  const backBtnStyle = { background: "transparent", border: "none", color: theme.textMuted, fontSize: 14, cursor: "pointer", padding: "8px 12px", fontFamily: "inherit" };

  const stepNames = ["למה?", "תאריך", "שעה", "מיקום", "חזרה?", "סיכום"];

  const handleSubmit = () => {
    onAdd({
      id: Date.now().toString(),
      reason: reason.trim(), date, time, location: location.trim(),
      recurring, recurringWeeks: recurring ? recurringWeeks : null,
      recurringCount: recurring ? recurringCount : null,
    });
  };

  return (
    <div style={{ background: theme.card, borderRadius: 20, padding: "28px 24px", boxShadow: theme.shadowHover, border: `2px solid ${theme.accent}`, marginBottom: 20 }}>
      <h2 style={{ fontSize: 20, fontWeight: 800, color: theme.primaryDark, marginBottom: 18, textAlign: "center" }}>➕ תור חדש</h2>

      <div style={{ display: "flex", justifyContent: "center", gap: 4, marginBottom: 18, flexWrap: "wrap" }}>
        {stepNames.map((name, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 3 }}>
            <div style={{
              width: 26, height: 26, borderRadius: "50%",
              background: i <= step ? theme.accent : theme.border,
              color: i <= step ? "#fff" : theme.textMuted,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 11, fontWeight: 700,
            }}>{i < step ? "✓" : i + 1}</div>
            {i < stepNames.length - 1 && <div style={{ width: 12, height: 2, background: i < step ? theme.accent : theme.border, borderRadius: 2 }} />}
          </div>
        ))}
      </div>

      {step === 0 && (
        <div>
          <label style={labelStyle}>למה התור?</label>
          <input type="text" placeholder='למשל: כימותרפיה / ד"ר כהן - קרדיולוג' value={reason} onChange={e => setReason(e.target.value)} style={inputStyle} autoFocus
            onFocus={e => e.target.style.borderColor = theme.accent} onBlur={e => e.target.style.borderColor = theme.border}
            onKeyDown={e => { if (e.key === "Enter" && reason.trim()) setStep(1); }} />
          <button onClick={() => setStep(1)} disabled={!reason.trim()} style={nextBtnStyle(!reason.trim())}>הבא ←</button>
        </div>
      )}

      {step === 1 && (
        <div>
          <label style={labelStyle}>📅 באיזה תאריך?</label>
          <DatePicker value={date} onChange={(d) => { setDate(d); setStep(2); }} />
          <button onClick={() => setStep(0)} style={backBtnStyle}>→ חזרה</button>
        </div>
      )}

      {step === 2 && (
        <div>
          <label style={labelStyle}>🕐 באיזה שעה?</label>
          <TimePicker value={time} onChange={setTime} />
          <button onClick={() => setStep(3)} disabled={!time} style={nextBtnStyle(!time)}>הבא ←</button>
          <button onClick={() => setStep(1)} style={backBtnStyle}>→ חזרה</button>
        </div>
      )}

      {step === 3 && (
        <div>
          <label style={labelStyle}>📍 איפה?</label>
          <input type="text" placeholder="למשל: בית חולים איכילוב, קומה 3" value={location} onChange={e => setLocation(e.target.value)} style={inputStyle} autoFocus
            onFocus={e => e.target.style.borderColor = theme.accent} onBlur={e => e.target.style.borderColor = theme.border}
            onKeyDown={e => { if (e.key === "Enter" && location.trim()) setStep(4); }} />
          <button onClick={() => setStep(4)} disabled={!location.trim()} style={nextBtnStyle(!location.trim())}>הבא ←</button>
          <button onClick={() => setStep(2)} style={backBtnStyle}>→ חזרה</button>
        </div>
      )}

      {step === 4 && (
        <div>
          <RecurringOptions
            recurring={recurring} setRecurring={setRecurring}
            recurringWeeks={recurringWeeks} setRecurringWeeks={setRecurringWeeks}
            recurringCount={recurringCount} setRecurringCount={setRecurringCount}
          />
          <button onClick={() => setStep(5)} style={nextBtnStyle(false)}>הבא ←</button>
          <button onClick={() => setStep(3)} style={backBtnStyle}>→ חזרה</button>
        </div>
      )}

      {step === 5 && (
        <div>
          <div style={{ background: theme.primaryLight, borderRadius: 14, padding: "18px 20px", marginBottom: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: theme.primary, marginBottom: 12 }}>סיכום התור:</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}><span>🏥</span><span style={{ fontSize: 16, fontWeight: 700, color: theme.primaryDark }}>{reason}</span></div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}><span>📅</span><span style={{ fontSize: 15, color: theme.text }}>{formatDate(date)}</span></div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}><span>🕐</span><span style={{ fontSize: 15, color: theme.text }}>{time}</span></div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}><span>📍</span><span style={{ fontSize: 15, color: theme.text }}>{location}</span></div>
              {recurring && (
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <span>🔄</span>
                  <span style={{ fontSize: 15, color: theme.text }}>
                    חוזר כל {recurringWeeks === 1 ? "שבוע" : `${recurringWeeks} שבועות`} — {recurringCount} פעמים
                  </span>
                </div>
              )}
            </div>
          </div>
          <button onClick={handleSubmit} style={{
            width: "100%", padding: "16px", fontSize: 20, fontWeight: 800,
            background: theme.primary, color: "#fff", border: "none", borderRadius: 14,
            cursor: "pointer", fontFamily: "inherit", boxShadow: "0 4px 16px rgba(43,122,120,0.3)",
          }}>✅ שמור תור</button>
          <button onClick={() => setStep(4)} style={backBtnStyle}>→ חזרה</button>
        </div>
      )}

      <div style={{ textAlign: "center", marginTop: 8 }}>
        <button onClick={onCancel} style={{ background: "transparent", border: "none", color: theme.danger, fontSize: 14, cursor: "pointer", padding: "8px 16px", fontFamily: "inherit" }}>✕ ביטול</button>
      </div>
    </div>
  );
}

// --- Main App ---
export default function MedicalAppointments() {
  const [appointments, setAppointments] = useState([]);
  const [dismissedAlerts, setDismissedAlerts] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [showPast, setShowPast] = useState(false);

  useEffect(() => {
    const data = loadData();
    setAppointments(data.appointments || []);
    setDismissedAlerts(data.dismissedAlerts || []);
    setLoaded(true);
  }, []);

  const save = useCallback((apts, dismissed) => {
    setAppointments(apts);
    setDismissedAlerts(dismissed);
    saveData({ appointments: apts, dismissedAlerts: dismissed });
  }, []);

  const handleAdd = (apt) => { save([...appointments, apt], dismissedAlerts); setShowForm(false); };

  const handleDelete = (id) => {
    // Check if it's a recurring instance (contains _r)
    if (id.includes("_r")) {
      // It's a generated instance, can't delete individually — find parent
      const parentId = id.split("_r")[0];
      save(appointments.filter(a => a.id !== parentId), dismissedAlerts);
    } else {
      save(appointments.filter(a => a.id !== id), dismissedAlerts);
    }
  };

  const handleDismissAlert = (alertKey) => {
    save(appointments, [...dismissedAlerts, alertKey]);
  };

  const allAppointments = appointments.flatMap(expandRecurring);

  const upcoming = allAppointments
    .filter(a => isUpcoming(a.date))
    .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));

  const past = allAppointments
    .filter(a => !isUpcoming(a.date))
    .sort((a, b) => b.date.localeCompare(a.date));

  if (!loaded) {
    return (
      <div style={{ direction: "rtl", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: theme.bg, fontFamily: "'Segoe UI', 'Arial', sans-serif" }}>
        <div style={{ fontSize: 22, color: theme.textMuted }}>טוען...</div>
      </div>
    );
  }

  return (
    <div style={{ direction: "rtl", minHeight: "100vh", background: theme.bg, fontFamily: "'Segoe UI', 'Arial', sans-serif", paddingBottom: 100 }}>
      <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }`}</style>
      
      <div style={{
        background: `linear-gradient(135deg, ${theme.primaryDark} 0%, ${theme.primary} 100%)`,
        padding: "32px 20px 28px", textAlign: "center",
        borderRadius: "0 0 28px 28px",
        boxShadow: "0 4px 20px rgba(23, 37, 42, 0.2)", marginBottom: 24,
      }}>
        <div style={{ fontSize: 36, marginBottom: 6 }}>💊</div>
        <h1 style={{ color: "#fff", fontSize: 26, fontWeight: 800, margin: 0 }}>התורים שלי</h1>
        <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 14, margin: "6px 0 0" }}>ניהול תורים רפואיים בקלות</p>
      </div>

      <div style={{ maxWidth: 500, margin: "0 auto", padding: "0 16px" }}>
        <AlertBanners appointments={allAppointments} dismissedAlerts={dismissedAlerts} onDismiss={handleDismissAlert} />

        {!showForm && (
          <button onClick={() => setShowForm(true)} style={{
            width: "100%", padding: "18px", fontSize: 20, fontWeight: 800,
            background: theme.accent, color: "#fff", border: "none", borderRadius: 16,
            cursor: "pointer", marginBottom: 24,
            boxShadow: "0 4px 16px rgba(58, 175, 169, 0.3)", fontFamily: "inherit",
          }}
            onMouseEnter={e => { e.target.style.transform = "scale(1.02)"; }}
            onMouseLeave={e => { e.target.style.transform = "scale(1)"; }}
          >➕ הוסף תור חדש</button>
        )}

        {showForm && <AddForm onAdd={handleAdd} onCancel={() => setShowForm(false)} />}

        {upcoming.length > 0 && (
          <>
            <div style={{ fontSize: 16, fontWeight: 700, color: theme.primary, marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
              <span>📋</span><span>תורים קרובים ({upcoming.length})</span>
            </div>
            {upcoming.map(apt => <AppointmentCard key={apt.id} apt={apt} onDelete={handleDelete} />)}
          </>
        )}

        {upcoming.length === 0 && !showForm && (
          <div style={{ textAlign: "center", padding: "48px 20px", color: theme.textMuted }}>
            <div style={{ fontSize: 52, marginBottom: 16 }}>📭</div>
            <p style={{ fontSize: 18, fontWeight: 600, margin: "0 0 6px" }}>אין תורים קרובים</p>
            <p style={{ fontSize: 14, margin: 0 }}>לחץ על "הוסף תור חדש" כדי להתחיל</p>
          </div>
        )}

        {past.length > 0 && (
          <>
            <button onClick={() => setShowPast(!showPast)} style={{
              width: "100%", padding: "12px", fontSize: 14,
              background: "transparent", color: theme.textMuted,
              border: `1px dashed ${theme.border}`, borderRadius: 12,
              cursor: "pointer", marginTop: 20, fontFamily: "inherit",
            }}>
              {showPast ? "▲ הסתר" : "▼ הצג"} תורים שעברו ({past.length})
            </button>
            {showPast && <div style={{ marginTop: 12 }}>{past.map(apt => <AppointmentCard key={apt.id} apt={apt} onDelete={handleDelete} />)}</div>}
          </>
        )}
      </div>
    </div>
  );
}
