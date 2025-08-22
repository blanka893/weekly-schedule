import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Plus, Calendar as CalendarIcon, Trash2, Download, Upload, Settings, ChevronLeft, ChevronRight, Copy, ListTodo, CheckSquare, Square, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

/* ----- the rest of the user's ScheduleApp component pasted from canvas ----- */
// ---------- Utilities ----------
const pad = (n) => n.toString().padStart(2, "0");
const timeToMinutes = (t) => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };
const minutesToTime = (mins) => `${pad(Math.floor(mins / 60))}:${pad(mins % 60)}`;
const isValidHHMM = (t) => /^\d{2}:\d{2}$/.test(t);
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]; // Monday-based

function getMonday(d = new Date()) { const date = new Date(d); const day = (date.getDay() + 6) % 7; date.setDate(date.getDate() - day); date.setHours(0, 0, 0, 0); return date; }
function formatISODate(d) { const dt = new Date(d); return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`; }
function getWeekKey(date) { return formatISODate(getMonday(date)); }
// Pure helper for tests & navigation
function shiftWeek(date, deltaWeeks) { const d = new Date(date); d.setDate(d.getDate() + 7 * deltaWeeks); return getMonday(d); }

const readLS = (k, fallback) => { if (typeof window === "undefined") return fallback; try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : fallback; } catch { return fallback; } };
const writeLS = (k, v) => { if (typeof window !== "undefined") localStorage.setItem(k, JSON.stringify(v)); };

// Normalize legacy and new To-Do assignment shapes into { enabled, slots: [{day|null, start, end}] }
function normalizeAssigned(todo) {
  const a = todo?.assigned || {};
  // New shape with slots
  if (Array.isArray(a.slots)) {
    const slots = a.slots
      .filter((s) => s && (typeof s.day === 'number' || s.start || s.end))
      .map((s) => ({ day: (typeof s.day === 'number' ? s.day : null), start: s.start || "", end: s.end || "" }));
    return { enabled: Boolean(a.enabled && slots.length), slots };
  }
  // Legacy single assignment
  const hasAny = Boolean(typeof a.day === 'number' || a.start || a.end);
  if (a.enabled && hasAny) {
    return { enabled: true, slots: [{ day: (typeof a.day === 'number' ? a.day : null), start: a.start || "", end: a.end || "" }] };
  }
  return { enabled: false, slots: [] };
}

// ---------- Default recurring classes from your screenshots ----------
const DEFAULT_RECURRING = [
  { id: "mon-trade-1", title: "Международная торговля — Бондаренко К.\nПокровский б-р 11, ауд. D107", category: "Class", day: 0, start: "16:20", end: "17:40", color: "#c7d2fe", isRecurring: true, showTimeOnly: false, notes: "" },
  { id: "mon-trade-2", title: "Международная торговля — Бондаренко К.\nПокровский б-р 11, ауд. D109", category: "Class", day: 0, start: "18:10", end: "19:30", color: "#c7d2fe", isRecurring: true, showTimeOnly: false, notes: "" },
  { id: "tue-east-1", title: "Россия и страны Востока — Васильев Д.В.\nПокровский б-р 11, ауд. R507", category: "Class", day: 1, start: "16:20", end: "17:40", color: "#fbcfe8", isRecurring: true, showTimeOnly: false, notes: "" },
  { id: "tue-east-2", title: "Россия и страны Востока — Васильев Д.В.\nПокровский б-р 11, ауд. R507", category: "Class", day: 1, start: "18:10", end: "19:30", color: "#fbcfe8", isRecurring: true, showTimeOnly: false, notes: "" },
  { id: "wed-biz-1", title: "Международный бизнес — Остроухова В.А.\nМал. Ордынка 29, ауд. 113", category: "Class", day: 2, start: "13:00", end: "14:20", color: "#bbf7d0", isRecurring: true, showTimeOnly: false, notes: "" },
  { id: "wed-biz-2", title: "Международный бизнес — Остроухова В.А.\nМал. Ордынка 29, ауд. 113", category: "Class", day: 2, start: "14:40", end: "16:00", color: "#bbf7d0", isRecurring: true, showTimeOnly: false, notes: "" },
  { id: "thu-nis-1", title: "НИС — Варпаховскис Э.\nМал. Ордынка 17, ауд. 223", category: "Class", day: 3, start: "09:30", end: "10:50", color: "#fde68a", isRecurring: true, showTimeOnly: false, notes: "" },
  { id: "thu-nis-2", title: "НИС — Варпаховскис Э.\nМал. Ордынка 17, ауд. 223", category: "Class", day: 3, start: "11:10", end: "12:30", color: "#fde68a", isRecurring: true, showTimeOnly: false, notes: "" },
  { id: "thu-nis-3", title: "НИС — Варпаховскис Э.\nМал. Ордынка 17, ауд. 223", category: "Class", day: 3, start: "13:00", end: "14:20", color: "#fde68a", isRecurring: true, showTimeOnly: false, notes: "" },
  { id: "thu-jpn-1", title: "Японский язык — Наумова Е.А.\nМал. Ордынка 29, ауд. 202", category: "Class", day: 3, start: "14:40", end: "16:00", color: "#a5f3fc", isRecurring: true, showTimeOnly: false, notes: "" },
  { id: "thu-jpn-2", title: "Японский язык — Наумова Е.А.\nМал. Ордынка 29, ауд. 204", category: "Class", day: 3, start: "16:20", end: "17:40", color: "#a5f3fc", isRecurring: true, showTimeOnly: false, notes: "" },
  { id: "sat-fin-1", title: "Международные финансы — Гусева О.А.\nМал. Ордынка 17, ауд. 328", category: "Class", day: 5, start: "09:30", end: "10:50", color: "#fecaca", isRecurring: true, showTimeOnly: false, notes: "" },
  { id: "sat-fin-2", title: "Международные финансы — Гусева О.А.\nМал. Ордынка 17, ауд. 328", category: "Class", day: 5, start: "11:10", end: "12:30", color: "#fecaca", isRecurring: true, showTimeOnly: false, notes: "" },
  { id: "sat-jpn-1", title: "Японский язык — Сапплин–Силановицкий Ю.В.\nМал. Ордынка 29, ауд. 202", category: "Class", day: 5, start: "13:00", end: "14:20", color: "#a7f3d0", isRecurring: true, showTimeOnly: false, notes: "" },
  { id: "sat-jpn-2", title: "Японский язык — Сапплин–Силановицкий Ю.В.\nМал. Ордынка 29, ауд. 202", category: "Class", day: 5, start: "14:40", end: "16:00", color: "#a7f3d0", isRecurring: true, showTimeOnly: false, notes: "" },
];

// ---------- Simple runtime tests (smoke checks) ----------
try {
  console.assert(timeToMinutes("10:00") === 600, "timeToMinutes basic check failed");
  console.assert(minutesToTime(75) === "01:15", "minutesToTime basic check failed");
  console.assert(minutesToTime(0) === "00:00", "minutesToTime 0 failed");
  console.assert(timeToMinutes("23:59") === 1439, "timeToMinutes edge failed");
  console.assert(isValidHHMM("09:07") && !isValidHHMM("9:7"), "isValidHHMM format check failed");
  // shiftWeek tests
  const mon = getMonday(new Date("2025-01-15"));
  console.assert(getWeekKey(shiftWeek(mon, -1)) !== getWeekKey(mon), "shiftWeek should change week");
  console.assert(getWeekKey(shiftWeek(mon, 1)) !== getWeekKey(mon), "shiftWeek should change week forward");
  DEFAULT_RECURRING.forEach((a) => { console.assert(timeToMinutes(a.end) > timeToMinutes(a.start), `Activity ${a.id} has end <= start`); });
  // normalizeAssigned tests
  const legacy = { assigned: { enabled:true, day: 1, start: "10:00", end:"11:00" } };
  const na1 = normalizeAssigned(legacy);
  console.assert(na1.enabled && na1.slots.length === 1 && na1.slots[0].day===1 && na1.slots[0].start==="10:00", "normalize legacy failed");
  const multi = { assigned: { enabled:true, slots:[{day:0,start:"",end:""},{day:2,start:"14:00",end:"15:00"}] } };
  const na2 = normalizeAssigned(multi);
  console.assert(na2.enabled && na2.slots.length===2 && na2.slots[1].start==="14:00" && na2.slots[0].day===0, "normalize multi failed");
  // Additional tests
  const none = { assigned: { enabled:false, slots: [] } };
  const na3 = normalizeAssigned(none);
  console.assert(!na3.enabled && na3.slots.length===0, "normalize disabled failed");
  const legacyOff = { assigned: { enabled:false, day: 1, start: "10:00", end: "11:00" } };
  const na4 = normalizeAssigned(legacyOff);
  console.assert(!na4.enabled, "normalize legacy disabled flag failed");
} catch (_) {}

// ---------- Main App ----------
export default function ScheduleApp() {
  const [weekStart, setWeekStart] = useState(getMonday());
  const [viewMode, setViewMode] = useState(readLS("sched.viewMode", (typeof window!=="undefined" && window.innerWidth < 768) ? "day" : "week")); // "week" | "day"
  const [dayViewIdx, setDayViewIdx] = useState(readLS("sched.dayViewIdx", (new Date().getDay()+6)%7));

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null); // activities

  const [todoAddOpen, setTodoAddOpen] = useState(false);
  const [todoEditTarget, setTodoEditTarget] = useState(null);
  const [todoDeleteTarget, setTodoDeleteTarget] = useState(null);

  const [dayStart, setDayStart] = useState(readLS("sched.dayStart", "09:00"));
  const [dayEnd, setDayEnd] = useState(readLS("sched.dayEnd", "20:00"));
  const [slotMins, setSlotMins] = useState(readLS("sched.slotMins", 30));
  const [showWeekend, setShowWeekend] = useState(readLS("sched.showWeekend", true));
  const [rowHeight, setRowHeight] = useState(readLS("sched.rowHeight", 34));
  const [colMinWidth, setColMinWidth] = useState(readLS("sched.colMinWidth", 220));
  const [timeColWidth, setTimeColWidth] = useState(readLS("sched.timeColWidth", 140));
  const [timeLabelPx, setTimeLabelPx] = useState(readLS("sched.timeLabelPx", 14));
  const [timeLabelContrast, setTimeLabelContrast] = useState(readLS("sched.timeLabelContrast", true));

  useEffect(() => writeLS("sched.viewMode", viewMode), [viewMode]);
  useEffect(() => writeLS("sched.dayViewIdx", dayViewIdx), [dayViewIdx]);
  useEffect(() => writeLS("sched.dayStart", dayStart), [dayStart]);
  useEffect(() => writeLS("sched.dayEnd", dayEnd), [dayEnd]);
  useEffect(() => writeLS("sched.slotMins", slotMins), [slotMins]);
  useEffect(() => writeLS("sched.showWeekend", showWeekend), [showWeekend]);
  useEffect(() => writeLS("sched.rowHeight", rowHeight), [rowHeight]);
  useEffect(() => writeLS("sched.colMinWidth", colMinWidth), [colMinWidth]);
  useEffect(() => writeLS("sched.timeColWidth", timeColWidth), [timeColWidth]);
  useEffect(() => writeLS("sched.timeLabelPx", timeLabelPx), [timeLabelPx]);
  useEffect(() => writeLS("sched.timeLabelContrast", timeLabelContrast), [timeLabelContrast]);

  const [recurring, setRecurring] = useState(readLS("sched.recurring", DEFAULT_RECURRING));
  const [oneTimeByWeek, setOneTimeByWeek] = useState(readLS("sched.oneTimeByWeek", {}));
  const [notesByWeek, setNotesByWeek] = useState(readLS("sched.notesByWeek", {})); // { weekKey: { [activityId]: notes } }
  const [excludeByWeek, setExcludeByWeek] = useState(readLS("sched.excludeByWeek", {})); // { weekKey: [activityId, ...] }

  const [todoRecurring, setTodoRecurring] = useState(readLS("sched.todoRecurring", []));
  const [todoByWeek, setTodoByWeek] = useState(readLS("sched.todoByWeek", {}));
  const [todoDoneByWeek, setTodoDoneByWeek] = useState(readLS("sched.todoDoneByWeek", {})); // now stores per-slot or per-item keys
  const [todoExcludeByWeek, setTodoExcludeByWeek] = useState(readLS("sched.todoExcludeByWeek", {}));

  useEffect(() => writeLS("sched.recurring", recurring), [recurring]);
  useEffect(() => writeLS("sched.oneTimeByWeek", oneTimeByWeek), [oneTimeByWeek]);
  useEffect(() => writeLS("sched.notesByWeek", notesByWeek), [notesByWeek]);
  useEffect(() => writeLS("sched.excludeByWeek", excludeByWeek), [excludeByWeek]);
  useEffect(() => writeLS("sched.todoRecurring", todoRecurring), [todoRecurring]);
  useEffect(() => writeLS("sched.todoByWeek", todoByWeek), [todoByWeek]);
  useEffect(() => writeLS("sched.todoDoneByWeek", todoDoneByWeek), [todoDoneByWeek]);
  useEffect(() => writeLS("sched.todoExcludeByWeek", todoExcludeByWeek), [todoExcludeByWeek]);

  const weekKey = useMemo(() => getWeekKey(weekStart), [weekStart]);
  const visibleDays = useMemo(() => (showWeekend ? DAYS : DAYS.slice(0,5)), [showWeekend]);

  // Activities visible on the grid (recurring minus excludes + one-time for this week)
  const activities = useMemo(() => {
    const excluded = new Set((excludeByWeek[weekKey]||[]));
    const base = (recurring||[]).filter(a=>!excluded.has(a.id));
    return [ ...base, ...((oneTimeByWeek[weekKey])||[]) ];
  }, [recurring, oneTimeByWeek, weekKey, excludeByWeek]);

  // TODOs visible this week (never rendered on the time grid)
  const todosForWeek = useMemo(()=>{
    const excluded = new Set((todoExcludeByWeek[weekKey]||[]));
    const rec = (todoRecurring||[]).filter(t=>!excluded.has(t.id));
    const wk = (todoByWeek[weekKey]||[]);
    return [ ...rec, ...wk ];
  }, [todoRecurring, todoByWeek, weekKey, todoExcludeByWeek]);

  // ---- DONE STATE HELPERS (per-slot/day or per-item for undated) ----
  const wkDoneMap = useMemo(()=> (todoDoneByWeek[weekKey]||{}), [todoDoneByWeek, weekKey]);
  const doneHas = (key) => Boolean(wkDoneMap[key]);
  const doneToggle = (key) => setTodoDoneByWeek(m=>{ const wk={...(m[weekKey]||{})}; wk[key]=!wk[key]; return { ...m, [weekKey]: wk };});
  const keyForUndated = (t) => `todo:${t.id}`;
  const keyForSlot = (t, s) => {
    const d = (typeof s.day === 'number') ? s.day : 'ND';
    const st = s.start || ''; const en = s.end || '';
    return `todo:${t.id}::${d}@${st}-${en}`;
  };

  // Helpers for week-specific notes (activities only)
  const getNotesFor = (act) => {
    if (!act) return "";
    if (act.isRecurring) {
      const wk = notesByWeek[weekKey] || {};
      return typeof wk[act.id] === "string" ? wk[act.id] : (act.notes || "");
    }
    return act.notes || "";
  };
  const setNotesFor = (actId, text) => {
    setNotesByWeek((m) => {
      const wk = { ...(m[weekKey] || {}) };
      wk[actId] = text;
      return { ...m, [weekKey]: wk };
    });
  };

  // Grid calculations
  const startM = useMemo(() => timeToMinutes(dayStart), [dayStart]);
  const endM = useMemo(() => timeToMinutes(dayEnd), [dayEnd]);
  const totalMins = Math.max(endM - startM, slotMins);
  const rows = Math.ceil(totalMins / slotMins);

  const [draft, setDraft] = useState({ day: 0, start: dayStart, end: minutesToTime(timeToMinutes(dayStart)+slotMins) });
  useEffect(() => {
    const s=timeToMinutes(dayStart), e=timeToMinutes(dayEnd);
    const st=Math.min(Math.max(timeToMinutes(draft.start),s), e-slotMins);
    const en=Math.min(Math.max(timeToMinutes(draft.end), st+slotMins), e);
    setDraft((d)=>({...d,start:minutesToTime(st),end:minutesToTime(en)}));
  },[dayStart,dayEnd,slotMins]);

  const handleAdd = (data) => {
    const base = { ...data, id: crypto.randomUUID() };
    if (data.isRecurring) {
      const { notes, ...rest } = base;
      setRecurring((r)=>[...r, { ...rest, notes: "" }]);
      if ((data.notes||"").trim()) setNotesFor(base.id, data.notes);
    } else {
      setOneTimeByWeek((m)=>({ ...m, [weekKey]: [ ...(m[weekKey]||[]), { ...base, weekKey } ] }));
    }
  };

  const handleUpdate = (updated) => {
    if (updated.isRecurring) {
      const { notes, ...rest } = updated;
      setRecurring((r)=>r.map((a)=>a.id===updated.id? { ...a, ...rest, notes: a.notes } : a));
      setOneTimeByWeek((map)=>{ const copy={...map}; for(const k in copy){ copy[k]=(copy[k]||[]).filter(a=>a.id!==updated.id);} return copy; });
    } else {
      setOneTimeByWeek((map)=>{ const list=map[weekKey]||[]; const exists=list.some(a=>a.id===updated.id);
        if (exists) return { ...map, [weekKey]: list.map(a=>a.id===updated.id?{...updated, weekKey}:a) };
        setRecurring((r)=>r.filter((a)=>a.id!==updated.id));
        return { ...map, [weekKey]: [...list, { ...updated, weekKey }] };
      });
    }
  };

  const hardDeleteRecurringEverywhere = (act) => {
    const id = act.id;
    setRecurring((r)=>r.filter((a)=>a.id!==id));
    setNotesByWeek((m)=>{ const copy={...m}; for(const wk in copy){ if(copy[wk]){ const inner={...copy[wk]}; delete inner[id]; copy[wk]=inner; } } return copy; });
    setExcludeByWeek((m)=>{ const copy={...m}; for(const wk in copy){ if(Array.isArray(copy[wk])) copy[wk]=copy[wk].filter((x)=>x!==id); } return copy; });
  };
  const softDeleteRecurringThisWeek = (act) => {
    const id = act.id;
    setExcludeByWeek((m)=>{ const list = new Set(m[weekKey]||[]); list.add(id); return { ...m, [weekKey]: Array.from(list) }; });
  };
  const deleteOneTimeThisWeek = (act) => {
    setOneTimeByWeek((m)=>({ ...m, [weekKey]: (m[weekKey]||[]).filter((a)=>a.id!==act.id) }));
  };

  // ---- To-Do handlers ----
  const addTodo = (todo) => {
    const base = { ...todo, id: crypto.randomUUID() };
    if (base.isRecurring) setTodoRecurring((r)=>[...r, base]);
    else setTodoByWeek((m)=>({ ...m, [weekKey]: [ ...(m[weekKey]||[]), { ...base, weekKey } ] }));
  };
  const updateTodo = (updated) => {
    if (updated.isRecurring) {
      setTodoRecurring((r)=>r.map((t)=>t.id===updated.id? updated : t));
      setTodoByWeek((map)=>{ const copy={...map}; for(const k in copy){ copy[k]=(copy[k]||[]).filter(t=>t.id!==updated.id);} return copy; });
    } else {
      setTodoByWeek((map)=>{ const list=map[weekKey]||[]; const exists=list.some(t=>t.id===updated.id);
        if (exists) return { ...map, [weekKey]: list.map(t=>t.id===updated.id?{...updated, weekKey}:t) };
        setTodoRecurring((r)=>r.filter((t)=>t.id!==updated.id));
        return { ...map, [weekKey]: [...list, { ...updated, weekKey }] };
      });
    }
  };
  const deleteTodoEverywhere = (todo) => {
    const id = todo.id;
    setTodoRecurring((r)=>r.filter((t)=>t.id!==id));
    setTodoByWeek((m)=>{ const copy={...m}; for(const wk in copy){ if(Array.isArray(copy[wk])) copy[wk]=copy[wk].filter((t)=>t.id!==id); } return copy; });
    setTodoExcludeByWeek((m)=>{ const copy={...m}; for(const wk in copy){ if(Array.isArray(copy[wk])) copy[wk]=copy[wk].filter((x)=>x!==id); } return copy; });
    setTodoDoneByWeek((m)=>{ const copy={...m}; for(const wk in copy){ if(copy[wk]){ const inner={...copy[wk]}; Object.keys(inner).forEach(k=>{ if(k.startsWith(`todo:${id}`)) delete inner[k]; }); copy[wk]=inner; } } return copy; });
  };
  const deleteTodoThisWeek = (todo) => {
    const id = todo.id;
    if (todo.isRecurring) {
      setTodoExcludeByWeek((m)=>{ const list = new Set(m[weekKey]||[]); list.add(id); return { ...m, [weekKey]: Array.from(list) }; });
    } else {
      setTodoByWeek((m)=>({ ...m, [weekKey]: (m[weekKey]||[]).filter((t)=>t.id!==id) }));
    }
  };

  // Week navigation handlers
  const prevWeek = () => setWeekStart((d) => shiftWeek(d, -1));
  const nextWeek = () => setWeekStart((d) => shiftWeek(d, 1));
  const thisWeek = () => setWeekStart(getMonday(new Date()));

  // Rendering blocks (activities only)
  const renderBlocks = (dayIdx) => {
    const dayActs = activities.filter(a=>a.day===dayIdx);
    return dayActs.map((a)=>{
      const top=((timeToMinutes(a.start)-startM)/slotMins)*rowHeight;
      const height=((Math.max(15, timeToMinutes(a.end)-timeToMinutes(a.start)))/slotMins)*rowHeight;
      const preview = getNotesFor(a).trim();
      return (
        <motion.div key={a.id} layout initial={{opacity:0,scale:0.98}} animate={{opacity:1,scale:1}} exit={{opacity:0}}
          onClick={()=> setEditTarget(a)}
          className="absolute left-1 right-1 rounded-2xl shadow-sm cursor-pointer border"
          style={{ top, height, background: a.color||\"#dbeafe\", borderColor:\"rgba(0,0,0,0.08)\" }}>
          <div className="p-2.5 text-[13px] leading-tight">
            <div className="font-medium whitespace-pre-line">{a.title || `${a.start}–${a.end}`}</div>
            {a.title && <div className="text-xs opacity-80">{a.start}–{a.end}</div>}
            {!!preview && <div className="text-[11px] mt-0.5 opacity-80 truncate" title={preview}>📝 {preview}</div>}
            {a.isRecurring ? <div className="text-[10px] opacity-70">Every week</div> : <div className="text-[10px] opacity-60">This week only</div>}
          </div>
        </motion.div>
      );
    });
  };

  const prettyWeek = () => { const end=new Date(weekStart); end.setDate(end.getDate()+6); const fmt=(d)=>`${d.toLocaleString(undefined,{month:\"short\"})} ${d.getDate()}`; return `${fmt(weekStart)} – ${fmt(end)} (${weekKey})`; };

  const gridTemplateWeek = { gridTemplateColumns: `${timeColWidth}px repeat(${visibleDays.length}, minmax(${colMinWidth}px, 1fr))` };
  const gridWidthWeekPx = timeColWidth + visibleDays.length * colMinWidth;
  const gridTemplateDay = { gridTemplateColumns: `${timeColWidth}px minmax(${colMinWidth}px, 1fr)` };
  const gridWidthDayPx = timeColWidth + colMinWidth;

  // ---- Export/Import ----
  const exportData = () => { const data={ settings:{dayStart,dayEnd,slotMins,showWeekend,rowHeight,colMinWidth,viewMode,dayViewIdx,timeColWidth,timeLabelPx,timeLabelContrast}, recurring, oneTimeByWeek, notesByWeek, excludeByWeek, todoRecurring, todoByWeek, todoDoneByWeek, todoExcludeByWeek };
    const blob=new Blob([JSON.stringify(data,null,2)],{type:\"application/json\"}); const url=URL.createObjectURL(blob);
    const a=document.createElement(\"a\"); a.href=url; a.download=`schedule_${weekKey}.json`; a.click(); URL.revokeObjectURL(url); };
  const importRef = useRef(null);
  const importData = (e) => { const file=e.target.files?.[0]; if(!file) return; const reader=new FileReader(); reader.onload=()=>{ try{ const json=JSON.parse(reader.result);
        if(json.settings){ setDayStart(json.settings.dayStart||dayStart); setDayEnd(json.settings.dayEnd||dayEnd); setSlotMins(json.settings.slotMins||slotMins); setShowWeekend(json.settings.showWeekend??showWeekend); setRowHeight(json.settings.rowHeight||rowHeight); setColMinWidth(json.settings.colMinWidth||colMinWidth); setViewMode(json.settings.viewMode||viewMode); setDayViewIdx(json.settings.dayViewIdx??dayViewIdx); setTimeColWidth(json.settings.timeColWidth||timeColWidth); setTimeLabelPx(json.settings.timeLabelPx||timeLabelPx); setTimeLabelContrast(json.settings.timeLabelContrast??timeLabelContrast);} 
        if(json.recurring) setRecurring(json.recurring); if(json.oneTimeByWeek) setOneTimeByWeek(json.oneTimeByWeek); if(json.notesByWeek) setNotesByWeek(json.notesByWeek); if(json.excludeByWeek) setExcludeByWeek(json.excludeByWeek);
        if(json.todoRecurring) setTodoRecurring(json.todoRecurring); if(json.todoByWeek) setTodoByWeek(json.todoByWeek); if(json.todoDoneByWeek) setTodoDoneByWeek(json.todoDoneByWeek); if(json.todoExcludeByWeek) setTodoExcludeByWeek(json.todoExcludeByWeek);
      }catch{ alert(\"Invalid JSON file.\"); } }; reader.readAsText(file); if(importRef.current) importRef.current.value=\"\"; };

  const clearThisWeekSingles = () => { if(!confirm(\"Remove all one-time activities for this week?\")) return; setOneTimeByWeek((m)=>({ ...m, [weekKey]: [] })); };
  const copyWeekSinglesForward = () => { const source=oneTimeByWeek[weekKey]||[]; const next=formatISODate(new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate()+7));
    setOneTimeByWeek((m)=>({ ...m, [next]: (m[next]||[]).concat(source.map(a=>({ ...a, id: crypto.randomUUID(), weekKey: next }))) })); };

  // ---- Helpers for displaying To-Dos under days ----
  const todosForDay = (idx) => {
    const entries = [];
    for (const t of todosForWeek) {
      const na = normalizeAssigned(t);
      for (let i=0;i<na.slots.length;i++){
        const s = na.slots[i];
        if (typeof s.day === 'number' && s.day === idx) {
          entries.push({ key: `${t.id}-${i}`, todo: t, slot: s });
        }
      }
    }
    return entries;
  };

  // Only show in the bottom To-Do panel the items where time/day do NOT matter this week
  const weeklyUndatedTodos = useMemo(() => {
    return todosForWeek.filter(t => {
      const na = normalizeAssigned(t);
      if (!na.enabled) return true; // nothing specified
      return na.slots.every(s => (typeof s.day !== 'number') && !s.start && !s.end);
    });
  }, [todosForWeek]);

  // ---- UI ----
  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-slate-50 to-white p-4">
      <div className="mx-auto max-w-[1600px] space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2"><CalendarIcon className="h-6 w-6" /><h1 className="text-2xl font-bold tracking-tight">Weekly Schedule</h1></div>
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex rounded-xl border bg-white overflow-hidden">
              <button className={`px-3 py-1 text-sm ${viewMode==='week'?'bg-slate-900 text-white':'text-slate-700'}`} onClick={()=>setViewMode('week')}>Week</button>
              <button className={`px-3 py-1 text-sm ${viewMode==='day'?'bg-slate-900 text-white':'text-slate-700'}`} onClick={()=>setViewMode('day')}>Day</button>
            </div>
            {viewMode==='day' && (
              <div className="flex items-center gap-1">
                <Button variant="outline" size="sm" onClick={()=>setDayViewIdx((i)=>Math.max(0,i-1))}><ChevronLeft className="h-4 w-4"/></Button>
                <div className="text-sm w-24 text-center">{DAYS[dayViewIdx]}</div>
                <Button variant="outline" size="sm" onClick={()=>setDayViewIdx((i)=>Math.min(6,i+1))}><ChevronRight className="h-4 w-4"/></Button>
              </div>
            )}
            <Button variant="outline" onClick={prevWeek}><ChevronLeft className="mr-1 h-4 w-4"/>Prev</Button>
            <Button variant="secondary" onClick={thisWeek}>This Week</Button>
            <Button variant="outline" onClick={nextWeek}>Next<ChevronRight className="ml-1 h-4 w-4"/></Button>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm text-slate-600">{prettyWeek()}</div>
          <div className="flex flex-wrap items-center gap-2">
            <Dialog open={addOpen} onOpenChange={setAddOpen}>
              <DialogTrigger asChild><Button className="gap-2"><Plus className="h-4 w-4"/> Add Activity</Button></DialogTrigger>
              <DialogContent className="sm:max-w-[600px]"><DialogHeader><DialogTitle>Add Activity</DialogTitle></DialogHeader>
                <AddOrEditForm
                  initial={{title:"",category:"Other",day:draft.day,start:draft.start,end:draft.end,color:"#fde68a",isRecurring:false,showTimeOnly:false,notes:""}}
                  onSubmit={(data)=>{ handleAdd(data); setAddOpen(false); }}
                  showWeekend={showWeekend}
                />
              </DialogContent>
            </Dialog>

            {/* Add To-Do button */}
            <Dialog open={todoAddOpen} onOpenChange={setTodoAddOpen}>
              <DialogTrigger asChild><Button variant="outline" className="gap-2"><ListTodo className="h-4 w-4"/> Add To-Do</Button></DialogTrigger>
              <DialogContent className="sm:max-w-[680px]"><DialogHeader><DialogTitle>Add To-Do</DialogTitle></DialogHeader>
                <ToDoForm initial={{ title:"", color:"#e5e7eb", isRecurring:false, assigned:{ enabled:false, slots: [] } }}
                  onSubmit={(todo)=>{ addTodo(todo); setTodoAddOpen(false); }} />
              </DialogContent>
            </Dialog>

            {/* Edit existing activity dialog */}
            <Dialog open={!!editTarget} onOpenChange={(open)=>{ if(!open) setEditTarget(null); }}>
              <DialogContent className="sm:max-w-[600px]">
                <DialogHeader><DialogTitle>Edit Activity</DialogTitle></DialogHeader>
                {editTarget && (
                  <AddOrEditForm
                    initial={{ ...editTarget, notes: getNotesFor(editTarget) }}
                    onSubmit={(data)=>{
                      if (editTarget.isRecurring && data.isRecurring) {
                        setNotesFor(editTarget.id, data.notes || "");
                        const { notes, ...rest } = data;
                        handleUpdate({ ...editTarget, ...rest });
                      } else {
                        handleUpdate({ ...editTarget, ...data });
                      }
                      setEditTarget(null);
                    }}
                    onDelete={()=>setDeleteTarget(editTarget)}
                    showWeekend={showWeekend}
                  />
                )}
              </DialogContent>
            </Dialog>

            {/* Edit To-Do dialog */}
            <Dialog open={!!todoEditTarget} onOpenChange={(open)=>{ if(!open) setTodoEditTarget(null); }}>
              <DialogContent className="sm:max-w-[680px]">
                <DialogHeader><DialogTitle>Edit To-Do</DialogTitle></DialogHeader>
                {todoEditTarget && (
                  <ToDoForm initial={(() => { const na=normalizeAssigned(todoEditTarget); return { ...todoEditTarget, assigned: { enabled: na.enabled, slots: na.slots } }; })()}
                    onSubmit={(t)=>{ updateTodo({ ...todoEditTarget, ...t }); setTodoEditTarget(null); }}
                    onDelete={()=>setTodoDeleteTarget(todoEditTarget)} />
                )}
              </DialogContent>
            </Dialog>

            {/* Delete confirmation for activities */}
            <Dialog open={!!deleteTarget} onOpenChange={(open)=>{ if(!open) setDeleteTarget(null); }}>
              <DialogContent className="sm:max-w-[520px]">
                <DialogHeader><DialogTitle>Delete activity</DialogTitle></DialogHeader>
                {deleteTarget && deleteTarget.isRecurring ? (
                  <div className="space-y-3 text-sm">
                    <p className="text-slate-600">"{deleteTarget.title?.split("\\n")[0] || "Activity"}" is a <strong>recurring</strong> activity.</p>
                    <p className="text-slate-700">Delete it <strong>from this week only</strong> or <strong>from all weeks</strong>?</p>
                    <div className="flex justify-between gap-2 pt-2">
                      <Button variant="outline" onClick={()=>{ softDeleteRecurringThisWeek(deleteTarget); setDeleteTarget(null); setEditTarget(null); }}>This week only</Button>
                      <Button variant="destructive" onClick={()=>{ hardDeleteRecurringEverywhere(deleteTarget); setDeleteTarget(null); setEditTarget(null); }}>All weeks</Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3 text-sm">
                    <p className="text-slate-700">Delete this one-time activity from this week?</p>
                    <div className="flex justify-end gap-2 pt-2">
                      <Button variant="outline" onClick={()=>setDeleteTarget(null)}>Cancel</Button>
                      <Button variant="destructive" onClick={()=>{ deleteOneTimeThisWeek(deleteTarget); setDeleteTarget(null); setEditTarget(null); }}>Delete</Button>
                    </div>
                  </div>
                )}
              </DialogContent>
            </Dialog>

            {/* Delete confirmation for To-Do */}
            <Dialog open={!!todoDeleteTarget} onOpenChange={(open)=>{ if(!open) setTodoDeleteTarget(null); }}>
              <DialogContent className="sm:max-w-[520px]">
                <DialogHeader><DialogTitle>Delete to-do</DialogTitle></DialogHeader>
                {todoDeleteTarget && todoDeleteTarget.isRecurring ? (
                  <div className="space-y-3 text-sm">
                    <p className="text-slate-600">"{todoDeleteTarget.title}" is <strong>recurring</strong>.</p>
                    <p className="text-slate-700">Delete <strong>this week only</strong> or <strong>all weeks</strong>?</p>
                    <div className="flex justify-between gap-2 pt-2">
                      <Button variant="outline" onClick={()=>{ deleteTodoThisWeek(todoDeleteTarget); setTodoDeleteTarget(null); setTodoEditTarget(null); }}>This week only</Button>
                      <Button variant="destructive" onClick={()=>{ deleteTodoEverywhere(todoDeleteTarget); setTodoDeleteTarget(null); setTodoEditTarget(null); }}>All weeks</Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3 text-sm">
                    <p className="text-slate-700">Delete this one-time to-do from this week?</p>
                    <div className="flex justify-end gap-2 pt-2">
                      <Button variant="outline" onClick={()=>setTodoDeleteTarget(null)}>Cancel</Button>
                      <Button variant="destructive" onClick={()=>{ deleteTodoThisWeek(todoDeleteTarget); setTodoDeleteTarget(null); setTodoEditTarget(null); }}>Delete</Button>
                    </div>
                  </div>
                )}
              </DialogContent>
            </Dialog>

            <input ref={importRef} type="file" accept="application/json" className="hidden" onChange={importData} />
            <Button variant="outline" onClick={exportData} className="gap-2"><Download className="h-4 w-4"/>Export</Button>
            <Button variant="outline" onClick={()=>importRef.current?.click()} className="gap-2"><Upload className="h-4 w-4"/>Import</Button>
            <Button variant="outline" onClick={()=>setSettingsOpen(true)} className="gap-2"><Settings className="h-4 w-4"/>Settings</Button>
          </div>
        </div>

        <Card>
          <CardContent className="py-3 text-sm text-slate-600">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2"><span className="h-4 w-4 rounded-md bg-blue-200 border border-slate-300"/> Class</div>
              <div className="flex items-center gap-2"><span className="h-4 w-4 rounded-md bg-amber-200 border border-slate-300"/> Other Activity</div>
              <div className="flex items-center gap-2"><span className="text-[12px]">To-dos appear under each day (if assigned). A separate list keeps undated weekly items.</span></div>
            </div>
          </CardContent>
        </Card>

        {/* WEEK VIEW */}
        {viewMode==='week' && (
          <div className="overflow-x-auto -mx-4 md:mx-0">
            <div className="grid gap-3" style={{...gridTemplateWeek, width: `${gridWidthWeekPx}px`}}>
              <TimeColumn rows={rows} rowHeight={rowHeight} startM={startM} slotMins={slotMins} labelPx={timeLabelPx} highContrast={timeLabelContrast} />
              {visibleDays.map((d, idx)=> (
                <Card key={d} className="h-full">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center justify-between">
                      <span>{d}</span>
                      <span className="text-xs text-slate-500 font-normal">
                        {(()=>{const dt=new Date(weekStart); dt.setDate(dt.getDate()+idx); return dt.toLocaleDateString(undefined,{month:\"short\",day:\"numeric\"});})()}
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="relative">
                      <div className="relative rounded-2xl bg-white border border-slate-200 overflow-hidden" style={{height: rows*rowHeight}} >
                        {[...Array(rows)].map((_,i)=>(<div key={i} className="absolute left-0 right-0 border-t border-slate-100" style={{ top: i*rowHeight }} />))}
                        <div className="absolute inset-0">{renderBlocks(idx)}</div>
                      </div>
                    </div>
                    {/* Day's To-Dos list under the grid */}
                    <DayToDoList
                      items={todosForDay(idx)}
                      isSlotDone={(t,s)=> doneHas(keyForSlot(t,s))}
                      onToggleSlotDone={(t,s)=> doneToggle(keyForSlot(t,s))}
                      onEdit={(t)=>setTodoEditTarget(t)}
                      onDelete={(t)=>setTodoDeleteTarget(t)}
                    />
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* DAY VIEW */}
        {viewMode==='day' && (
          <div className="overflow-x-auto -mx-4 md:mx-0">
            <div className="grid gap-3" style={{...gridTemplateDay, width: `${gridWidthDayPx}px`}}>
              <TimeColumn rows={rows} rowHeight={rowHeight} startM={startM} slotMins={slotMins} labelPx={timeLabelPx} highContrast={timeLabelContrast} />
              <Card className="h-full">
                <CardHeader className="pb-2"><CardTitle className="text-base">{DAYS[dayViewIdx]}</CardTitle></CardHeader>
                <CardContent>
                  <div className="relative">
                    <div className="relative rounded-2xl bg-white border border-slate-200 overflow-hidden" style={{height: rows*rowHeight}} >
                      {[...Array(rows)].map((_,i)=>(<div key={i} className="absolute left-0 right-0 border-t border-slate-100" style={{ top: i*rowHeight }} />))}
                      <div className="absolute inset-0">{renderBlocks(dayViewIdx)}</div>
                    </div>
                  </div>
                  {/* Day's To-Dos list under the grid */}
                  <DayToDoList
                    items={todosForDay(dayViewIdx)}
                    isSlotDone={(t,s)=> doneHas(keyForSlot(t,s))}
                    onToggleSlotDone={(t,s)=> doneToggle(keyForSlot(t,s))}
                    onEdit={(t)=>setTodoEditTarget(t)}
                    onDelete={(t)=>setTodoDeleteTarget(t)}
                  />
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* To-Do panel: ONLY undated weekly items (no day & no time), compact list */}
        <Card>
          <CardHeader className="pb-2 flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2"><ListTodo className="h-4 w-4"/> This Week's To-Do</CardTitle>
            <Dialog open={todoAddOpen} onOpenChange={setTodoAddOpen}>
              <DialogTrigger asChild><Button size="sm" variant="outline" className="gap-2"><Plus className="h-4 w-4"/> Add To-Do</Button></DialogTrigger>
              <DialogContent className="sm:max-w-[680px]"><DialogHeader><DialogTitle>Add To-Do</DialogTitle></DialogHeader>
                <ToDoForm initial={{ title:"", color:"#e5e7eb", isRecurring:false, assigned:{ enabled:false, slots: [] } }}
                  onSubmit={(todo)=>{ addTodo(todo); setTodoAddOpen(false); }} />
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {weeklyUndatedTodos.map((t)=> (
                <ToDoRow key={t.id}
                  todo={t}
                  done={doneHas(keyForUndated(t))}
                  onToggleDone={()=> doneToggle(keyForUndated(t))}
                  onEdit={()=>setTodoEditTarget(t)}
                  onDelete={()=>setTodoDeleteTarget(t)}
                />
              ))}
              {weeklyUndatedTodos.length===0 && <div className="text-xs text-slate-400">No undated to-dos for this week.</div>}
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-xs text-slate-500">Total activities this week: {activities.length} · To-dos: {todosForWeek.length}</div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={clearThisWeekSingles} className="gap-2"><Trash2 className="h-4 w-4"/>Clear one-time (this week)</Button>
            <Button variant="outline" onClick={copyWeekSinglesForward} className="gap-2"><Copy className="h-4 w-4"/>Copy one-time → next week</Button>
          </div>
        </div>

        <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
          <DialogContent className="sm:max-w-[700px]">
            <DialogHeader><DialogTitle>Settings</DialogTitle></DialogHeader>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Day start</Label>
                <Input className="mt-1" type="time" step={60} value={dayStart} onChange={(e)=>setDayStart(e.target.value)} />
              </div>
              <div>
                <Label>Day end</Label>
                <Input className="mt-1" type="time" step={60} value={dayEnd} onChange={(e)=>setDayEnd(e.target.value)} />
              </div>
              <div>
                <Label>Slot minutes</Label>
                <Select value={String(slotMins)} onValueChange={(v)=>setSlotMins(Number(v))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>{[5,10,15,20,30,45,60,90].map((m)=>(<SelectItem key={m} value={String(m)}>{m}</SelectItem>))}</SelectContent>
                </Select>
              </div>
              <div className="flex items-end gap-2"><Checkbox id="weekend" checked={showWeekend} onCheckedChange={(v)=>setShowWeekend(Boolean(v))} /><Label htmlFor="weekend">Show weekend</Label></div>
              <div>
                <Label>Row height (px)</Label>
                <Input className="mt-1" type="range" min={24} max={56} step={2} value={rowHeight} onChange={(e)=>setRowHeight(Number(e.target.value))} />
                <div className="text-xs text-slate-500 mt-1">{rowHeight}px</div>
              </div>
              <div>
                <Label>Day column min width (px)</Label>
                <Input className="mt-1" type="number" min={160} max={380} value={colMinWidth} onChange={(e)=>setColMinWidth(Number(e.target.value||220))} />
              </div>
              <div>
                <Label>Time column width (px)</Label>
                <Input className="mt-1" type="number" min={100} max={260} value={timeColWidth} onChange={(e)=>setTimeColWidth(Number(e.target.value||140))} />
              </div>
              <div>
                <Label>Time label size (px)</Label>
                <Input className="mt-1" type="range" min={11} max={18} step={1} value={timeLabelPx} onChange={(e)=>setTimeLabelPx(Number(e.target.value))} />
                <div className="text-xs text-slate-500 mt-1">{timeLabelPx}px</div>
              </div>
              <div className="flex items-end gap-2"><Checkbox id="timeContrast" checked={timeLabelContrast} onCheckedChange={(v)=>setTimeLabelContrast(Boolean(v))} /><Label htmlFor="timeContrast">High-contrast time labels</Label></div>
              <div className="col-span-2">
                <Label>Default view</Label>
                <div className="flex gap-2 mt-1">
                  <Button type="button" size="sm" variant={viewMode==='week'? 'default':'outline'} onClick={()=>setViewMode('week')}>Week</Button>
                  <Button type="button" size="sm" variant={viewMode==='day'? 'default':'outline'} onClick={()=>setViewMode('day')}>Day</Button>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Quick tips</CardTitle></CardHeader>
          <CardContent className="text-sm text-slate-600 space-y-2">
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Exact times:</strong> Type any HH:MM in Start/End fields and in Settings.</li>
              <li><strong>Notes per week:</strong> Notes you add to recurring classes stay on the specific week only.</li>
              <li><strong>To-Do:</strong> Day/time are optional. You can add <strong>multiple day/time slots</strong> per to-do. Day-assigned items appear under the day; undated items appear only in the bottom list.</li>
              <li><strong>Mark done:</strong> Day-assigned items can be marked done <em>per day/slot</em>. Undated items are single checkboxes per week.</li>
              <li><strong>Delete options:</strong> For recurring items you can delete <em>this week only</em> or <em>all weeks</em>.</li>
              <li><strong>Layout:</strong> Settings → Row height & Day column width.</li>
              <li><strong>Backup:</strong> Export/Import to save or move your schedule.</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function TimeColumn({ rows, rowHeight, startM, slotMins, labelPx = 14, highContrast = true }){
  return (
    <Card className="h-full">
      <CardHeader className="pb-2"><CardTitle className="text-base">Time</CardTitle></CardHeader>
      <CardContent>
        <div className="relative">
          <div style={{height: rows*rowHeight}} className="relative">
            {[...Array(rows)].map((_,i)=>{ const labelMin=startM+i*slotMins; const showLabel=(labelMin%60===0); return (
              <div key={i} className="flex items-start" style={{height: rowHeight}}>
                <div className="w-full border-t border-slate-200" />
                <div
                  className={`absolute right-2 select-none ${highContrast ? 'text-slate-900 font-semibold' : 'text-slate-600'}`}
                  style={{ marginTop: -8, fontSize: labelPx, background: 'rgba(255,255,255,0.85)', padding: '0 4px', borderRadius: 6 }}
                >
                  {showLabel?minutesToTime(labelMin):""}
                </div>
              </div>
            );})}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function AddOrEditForm({ initial, onSubmit, onDelete, showWeekend }){
  const [title, setTitle] = useState(initial.title || "");
  const [category, setCategory] = useState(initial.category || "Other");
  const [day, setDay] = useState(initial.day ?? 0);
  const [start, setStart] = useState(initial.start || "08:00");
  const [end, setEnd] = useState(initial.end || "09:00");
  const [color, setColor] = useState(initial.color || "#dbeafe");
  const [isRecurring, setIsRecurring] = useState(Boolean(initial.isRecurring));
  const [showTimeOnly, setShowTimeOnly] = useState(Boolean(initial.showTimeOnly));
  const [notes, setNotes] = useState(initial.notes || "");

  const save = (e) => {
    e.preventDefault();
    if (!isValidHHMM(start) || !isValidHHMM(end)) { alert("Use HH:MM format for times (e.g., 13:05)."); return; }
    if (timeToMinutes(end) <= timeToMinutes(start)) { alert("End time must be after start time."); return; }
    onSubmit({ title, category, day: Number(day), start, end, color, isRecurring, showTimeOnly, notes });
  };

  return (
    <form onSubmit={save} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Category</Label>
          <Select value={category} onValueChange={setCategory}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="Class">Class</SelectItem><SelectItem value="Other">Other</SelectItem></SelectContent>
          </Select>
        </div>
        <div>
          <Label>Title</Label>
          <Textarea className="mt-1" value={title} onChange={(e)=>setTitle(e.target.value)} placeholder={"Course — Teacher\nAddress, Room"} />
        </div>
        <div>
          <Label>Day</Label>
          <Select value={String(day)} onValueChange={(v)=>setDay(Number(v))}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
            <SelectContent>{(showWeekend?DAYS:DAYS.slice(0,5)).map((d,idx)=>(<SelectItem key={d} value={String(idx)}>{d}</SelectItem>))}</SelectContent>
          </Select>
        </div>
        <div>
          <Label>Color</Label>
          <div className="mt-1 flex items-center gap-2">
            <input type="color" value={color} onChange={(e)=>setColor(e.target.value)} className="h-9 w-12 overflow-hidden rounded-md border" />
            <Input value={color} onChange={(e)=>setColor(e.target.value)} />
          </div>
        </div>
        <div>
          <Label>Start</Label>
          <Input className="mt-1" type="time" step={60} value={start} onChange={(e)=>setStart(e.target.value)} />
        </div>
        <div>
          <Label>End</Label>
          <Input className="mt-1" type="time" step={60} value={end} onChange={(e)=>setEnd(e.target.value)} />
        </div>
        <div className="col-span-2">
          <Label>Notes / Homework</Label>
          <Textarea className="mt-1" value={notes} onChange={(e)=>setNotes(e.target.value)} placeholder="e.g., Read ch. 3; problem set 1; bring printout" />
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2"><Checkbox id="rec" checked={isRecurring} onCheckedChange={(v)=>setIsRecurring(Boolean(v))} /><Label htmlFor="rec">Every week (permanent)</Label></div>
        <div className="flex items-center gap-2"><Checkbox id="showTime" checked={showTimeOnly} onCheckedChange={(v)=>setShowTimeOnly(Boolean(v))} /><Label htmlFor="showTime">Show only time (hide title)</Label></div>
      </div>

      <div className="flex items-center justify-between">
        {onDelete ? (<Button type="button" variant="destructive" onClick={onDelete} className="gap-2"><Trash2 className="h-4 w-4"/>Delete</Button>) : <div />}
        <div className="flex items-center gap-2"><Button type="submit">Save</Button></div>
      </div>
    </form>
  );
}

function ToDoForm({ initial, onSubmit, onDelete }){
  const initAssigned = normalizeAssigned(initial);
  const [title, setTitle] = useState(initial.title || "");
  const [color, setColor] = useState(initial.color || "#e5e7eb");
  const [isRecurring, setIsRecurring] = useState(Boolean(initial.isRecurring));
  const [enabled, setEnabled] = useState(Boolean(initAssigned.enabled));
  const [slots, setSlots] = useState(initAssigned.slots.length ? initAssigned.slots : [{ day: null, start: "", end: "" }]);

  const setSlot = (i, patch) => setSlots((arr)=> arr.map((s,idx)=> idx===i ? { ...s, ...patch } : s ));
  const addSlot = () => setSlots((arr)=> [...arr, { day: null, start: "", end: "" }]);
  const removeSlot = (i) => setSlots((arr)=> arr.filter((_,idx)=> idx!==i));

  const save = (e) => {
    e.preventDefault();
    if (!title.trim()) { alert("Please enter a title."); return; }
    // Validate times per slot (if one of start/end present, need both)
    for (const s of slots) {
      const hasStart = Boolean(s.start);
      const hasEnd = Boolean(s.end);
      if ((hasStart && !hasEnd) || (!hasStart && hasEnd)) { alert("Each slot must have both start and end, or neither."); return; }
      if (hasStart && hasEnd) {
        if (!isValidHHMM(s.start) || !isValidHHMM(s.end)) { alert("Use HH:MM times in slots."); return; }
        if (timeToMinutes(s.end) <= timeToMinutes(s.start)) { alert("Slot end must be after start."); return; }
      }
    }
    const cleaned = slots.filter((s)=> typeof s.day === 'number' || s.start || s.end);
    const assigned = { enabled: Boolean(enabled && cleaned.length), slots: cleaned };
    onSubmit({ title: title.trim(), color, isRecurring, assigned });
  };

  const slotLabel = (s) => {
    const day = (typeof s.day === 'number') ? DAYS[s.day] : 'No day';
    const time = (s.start && s.end) ? `${s.start}–${s.end}` : 'Any time';
    return `${day} • ${time}`;
  };

  return (
    <form onSubmit={save} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <Label>Title</Label>
          <Input className="mt-1" value={title} onChange={(e)=>setTitle(e.target.value)} placeholder="e.g., Finish essay draft" />
        </div>
        <div>
          <Label>Color</Label>
          <div className="mt-1 flex items-center gap-2">
            <input type="color" value={color} onChange={(e)=>setColor(e.target.value)} className="h-9 w-12 overflow-hidden rounded-md border" />
            <Input value={color} onChange={(e)=>setColor(e.target.value)} />
          </div>
        </div>
        <div className="flex items-end gap-2">
          <Checkbox id="recTodo" checked={isRecurring} onCheckedChange={(v)=>setIsRecurring(Boolean(v))} />
          <Label htmlFor="recTodo">Every week (permanent)</Label>
        </div>
        <div className="col-span-2">
          <div className="flex items:center gap-2">
            <Checkbox id="assign" checked={enabled} onCheckedChange={(v)=>setEnabled(Boolean(v))} />
            <Label htmlFor="assign">Assign (day and/or time) — you can add multiple</Label>
          </div>

          {enabled and (  // small tweak: show slots only when enabled
            <div className="mt-3 space-y-3">
              {slots.map((s, i) => (
                <div key={i} className="grid grid-cols-12 gap-3 items-end">
                  <div className="col-span-4">
                    <Label>Day (optional)</Label>
                    <Select value={(typeof s.day==='number'? String(s.day) : "none")} onValueChange={(v)=>setSlot(i,{ day: v==="none"? null : Number(v) })}>
                      <SelectTrigger className="mt-1"><SelectValue placeholder="None"/></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {DAYS.map((d,idx)=>(<SelectItem key={d} value={String(idx)}>{d}</SelectItem>))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-3">
                    <Label>Start (optional)</Label>
                    <Input className="mt-1" type="time" step={60} value={s.start||""} onChange={(e)=>setSlot(i,{ start:e.target.value })} />
                  </div>
                  <div className="col-span-3">
                    <Label>End (optional)</Label>
                    <Input className="mt-1" type="time" step={60} value={s.end||""} onChange={(e)=>setSlot(i,{ end:e.target.value })} />
                  </div>
                  <div className="col-span-2 flex items-center gap-2">
                    <Button type="button" variant="outline" onClick={()=>addSlot()}>Add</Button>
                    {slots.length>1 && <Button type="button" variant="destructive" onClick={()=>removeSlot(i)}>Remove</Button>}
                  </div>
                  <div className="col-span-12 text-[11px] text-slate-500">{slotLabel(s)}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between">
        {onDelete ? (<Button type="button" variant="destructive" onClick={onDelete} className="gap-2"><Trash2 className="h-4 w-4"/>Delete</Button>) : <div />}
        <div className="flex items-center gap-2"><Button type="submit">Save</Button></div>
      </div>
    </form>
  );
}

function DayToDoList({ items, isSlotDone, onToggleSlotDone, onEdit, onDelete }){
  return (
    <div className="mt-3">
      <div className="text-xs uppercase tracking-wide text-slate-500 mb-2">Day To-Dos</div>
      {items.length === 0 ? (
        <div className="text-xs text-slate-400">No to-dos for this day.</div>
      ) : (
        <div className="space-y-2">
          {items.map(({key, todo, slot})=>{
            const time = (slot?.start and slot?.end) ? `${slot.start}–${slot.end}` : "Any time";
            const done = isSlotDone(todo, slot);
            return (
              <div key={key} className="flex items-center justify-between gap-2 rounded-xl border bg-white px-3 py-2">
                <div className="flex items-center gap-3">
                  <button onClick={()=>onToggleSlotDone(todo, slot)} className="shrink-0" title={done?"Mark as not done":"Mark as done"}>
                    {done ? <CheckSquare className="h-5 w-5"/> : <Square className="h-5 w-5"/>}
                  </button>
                  <div className="leading-tight">
                    <div className={`font-medium ${done? 'line-through text-slate-400' : ''}`}>{todo.title}</div>
                    <div className="text-xs text-slate-500 flex items-center gap-2">
                      <span className="rounded bg-slate-100 px-1.5 py-0.5">{time}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full" style={{background: todo.color}} />
                  <Button size="sm" variant="outline" onClick={()=>onEdit(todo)} className="gap-1"><Pencil className="h-3.5 w-3.5"/> Edit</Button>
                  <Button size="sm" variant="destructive" onClick={()=>onDelete(todo)}><Trash2 className="h-3.5 w-3.5"/></Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ToDoRow({ todo, done, onToggleDone, onEdit, onDelete }){
  // For the weekly undated list, we intentionally suppress day labels.
  // If the item had slots, it wouldn't be in this list (filtered earlier).
  return (
    <div className="flex items-center justify-between gap-2 rounded-xl border bg-white px-3 py-2">
      <div className="flex items-center gap-3">
        <button onClick={onToggleDone} className="shrink-0" title={done?"Mark as not done":"Mark as done"}>
          {done ? <CheckSquare className="h-5 w-5"/> : <Square className="h-5 w-5"/>}
        </button>
        <div className="leading-tight">
          <div className={`font-medium ${done? 'line-through text-slate-400' : ''}`}>{todo.title}</div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <div className="h-3 w-3 rounded-full" style={{background: todo.color}} title="Color" />
        <Button size="sm" variant="outline" onClick={onEdit} className="gap-1"><Pencil className="h-3.5 w-3.5"/> Edit</Button>
        <Button size="sm" variant="destructive" onClick={onDelete}><Trash2 className="h-3.5 w-3.5"/></Button>
      </div>
    </div>
  );
}
