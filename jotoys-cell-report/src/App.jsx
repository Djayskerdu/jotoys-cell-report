import React, { useState, useEffect, useCallback } from "react";
import {
  Users, UserCircle2, Plus, X, Pencil, Trash2, MapPin,
  Loader2, RefreshCw, AlertCircle, ChevronRight, UserPlus,
  Home, Circle, Calendar, Clock
} from "lucide-react";

const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxQ0Lgp_NhBJgWZHbxA5q4Php-F5VaqMrfw270PBDHc-65fBmg-pOkig5m32PQYyTutig/exec";

const DAYS = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];

const TRACKS = [
  { key:"SUYNL",    label:"SUYNL"      },
  { key:"LIFECLASS",label:"Life Class" },
  { key:"SOL1",     label:"SOL 1"      },
  { key:"SOL2",     label:"SOL 2"      },
  { key:"SOL3",     label:"SOL 3"      },
];

function toBool(v) {
  return v === true || v === "TRUE" || v === "true" || v === 1;
}

// ── Count distinct lifegroups (unique day+time combos) ────────────────────────
function countLifegroups(list) {
  return new Set(list.map(m => {
    const d = (m.ScheduleDay||"").trim();
    const t = (m.ScheduleTime||"").trim();
    return d||t ? `${d}|${t}` : `__nosch__${m.ID}`;
  })).size;
}

async function apiGet() {
  const res  = await fetch(SCRIPT_URL, { method:"GET" });
  const json = await res.json();
  if (!json.success) throw new Error(json.error || "Failed to load");
  return json.data;
}

async function apiPost(body) {
  const res  = await fetch(SCRIPT_URL, {
    method:"POST",
    headers:{ "Content-Type":"text/plain;charset=utf-8" },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error || "Request failed");
  return json;
}

// ── Pathway ───────────────────────────────────────────────────────────────────
function Pathway({ member, size="md" }) {
  const d   = size==="sm" ? { r:5, gap:22, sw:1.5 } : { r:7, gap:34, sw:2 };
  const ok  = TRACKS.map(t => toBool(member[t.key]));
  const W   = d.gap*(TRACKS.length-1)+d.r*2+4;
  const H   = d.r*2+(size==="sm"?10:24);
  const cy  = d.r+(size==="sm"?5:12);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H}>
      {TRACKS.map((_,i) => {
        if (!i) return null;
        const x1=d.r+2+d.gap*(i-1), x2=d.r+2+d.gap*i;
        return <line key={i} x1={x1} y1={cy} x2={x2} y2={cy}
          stroke={ok[i-1]&&ok[i]?"#C99A4B":"#E4DDCC"} strokeWidth={d.sw}/>;
      })}
      {TRACKS.map((t,i) => {
        const cx=d.r+2+d.gap*i, done=ok[i];
        return (
          <g key={t.key}>
            <circle cx={cx} cy={cy} r={d.r}
              fill={done?"#C99A4B":"#FAF6EE"}
              stroke={done?"#C99A4B":"#9C9485"} strokeWidth={d.sw}/>
            {done && <path
              d={`M${cx-d.r*.45} ${cy} l${d.r*.4} ${d.r*.4} l${d.r*.65} -${d.r*.75}`}
              stroke="#FAF6EE" strokeWidth={d.sw} fill="none"
              strokeLinecap="round" strokeLinejoin="round"/>}
            {size!=="sm" && <text x={cx} y={H-2} textAnchor="middle"
              style={{fontSize:7,fill:"#9C9485"}}>{t.label}</text>}
          </g>
        );
      })}
    </svg>
  );
}

// ── Breadcrumb ────────────────────────────────────────────────────────────────
function Breadcrumb({ crumbs, current }) {
  return (
    <div className="bc">
      {crumbs.map((c,i) => (
        <React.Fragment key={i}>
          <button className="bc-btn" onClick={c.onClick}>{c.label}</button>
          <ChevronRight size={12}/>
        </React.Fragment>
      ))}
      <span className="bc-cur">{current}</span>
    </div>
  );
}

// ── Status Badge ──────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  if (!status) return null;
  return (
    <span className={status==="Active"?"badge badge-green":"badge badge-red"}>
      <Circle size={6} style={{fill:"currentColor"}}/>{status}
    </span>
  );
}

// ── Schedule Badge (day + time) ───────────────────────────────────────────────
function ScheduleBadge({ day, time }) {
  if (!day && !time) return null;
  return (
    <span className="day-badge">
      {day && <><Calendar size={10}/>{day}</>}
      {time && <><Clock size={10} style={{marginLeft: day ? 4 : 0}}/>{time}</>}
    </span>
  );
}

// ── Member Modal ──────────────────────────────────────────────────────────────
function MemberModal({ open, onClose, onSave, initial, leaderName, defaultStatus, saving, existingDays=[] }) {
  const blank = () => ({
    Name:"", LifegroupLocation:"", ScheduleDay:"", ScheduleTime:"",
    Status: defaultStatus||"Open Cell", LifegroupStatus:"Active",
    SUYNL:"FALSE",LIFECLASS:"FALSE",SOL1:"FALSE",SOL2:"FALSE",SOL3:"FALSE",
  });
  const [form, setForm] = useState(blank());
  const [dayMode, setDayMode] = useState("pick");

  useEffect(() => {
    if (!open) return;
    if (initial) {
      setForm({
        Name: initial.Name||"",
        LifegroupLocation: initial.LifegroupLocation||"",
        ScheduleDay: initial.ScheduleDay||"",
        ScheduleTime: initial.ScheduleTime||"",
        Status: initial.Status||defaultStatus||"Open Cell",
        LifegroupStatus: initial.LifegroupStatus||"",
        SUYNL:     toBool(initial.SUYNL)    ?"TRUE":"FALSE",
        LIFECLASS: toBool(initial.LIFECLASS)?"TRUE":"FALSE",
        SOL1:      toBool(initial.SOL1)     ?"TRUE":"FALSE",
        SOL2:      toBool(initial.SOL2)     ?"TRUE":"FALSE",
        SOL3:      toBool(initial.SOL3)     ?"TRUE":"FALSE",
      });
      setDayMode("type");
    } else {
      setForm(blank());
      setDayMode(existingDays.length ? "pick" : "type");
    }
  }, [open, initial, defaultStatus]);

  if (!open) return null;
  const set = (k,v) => setForm(f=>({...f,[k]:v}));

  const dayOptions = [...new Set([...existingDays, ...DAYS])];

  return (
    <div className="overlay" onMouseDown={e=>{if(e.target===e.currentTarget)onClose();}}>
      <div className="modal">
        <div className="modal-head">
          <h2>{initial?"Edit member":"Add member"}</h2>
          <button className="icon-btn" onClick={onClose}><X size={18}/></button>
        </div>
        <form className="modal-body" onSubmit={e=>{
          e.preventDefault();
          if (!form.Name.trim()) return;
          onSave(form);
        }}>
          <p className="modal-sub">Under <strong>{leaderName}</strong></p>

          <label className="field">
            <span>Name</span>
            <input autoFocus type="text" value={form.Name} required placeholder="Full name"
              onChange={e=>set("Name",e.target.value)}/>
          </label>

          {/* ── Schedule Day ── */}
          <fieldset className="field">
            <span>Schedule day</span>
            <div className="day-toggle">
              <button type="button" className={dayMode==="pick"?"dtog dtog-on":"dtog"}
                onClick={()=>setDayMode("pick")}>Pick a day</button>
              <button type="button" className={dayMode==="type"?"dtog dtog-on":"dtog"}
                onClick={()=>setDayMode("type")}>Type freely</button>
            </div>
            {dayMode==="pick" ? (
              <div className="day-grid">
                {dayOptions.map(d=>(
                  <button key={d} type="button"
                    className={form.ScheduleDay===d?"day-chip day-chip-on":"day-chip"}
                    onClick={()=>set("ScheduleDay",d)}>{d}</button>
                ))}
              </div>
            ) : (
              <input type="text" value={form.ScheduleDay} placeholder="e.g. Saturday"
                onChange={e=>set("ScheduleDay",e.target.value)}/>
            )}
          </fieldset>

          {/* ── Schedule Time ── */}
          <label className="field">
            <span>Schedule time <span className="hint-inline">(optional)</span></span>
            <input type="time" value={form.ScheduleTime}
              onChange={e=>set("ScheduleTime",e.target.value)}
              style={{fontFamily:"inherit"}}/>
            <p className="hint">Add a time if you have multiple lifegroups on the same day.</p>
          </label>

          <label className="field">
            <span>Lifegroup location</span>
            <input type="text" value={form.LifegroupLocation} placeholder="Where this cell meets"
              onChange={e=>set("LifegroupLocation",e.target.value)}/>
          </label>

          <fieldset className="field">
            <span>Cell status</span>
            <div className="seg-group">
              {["Open Cell","Close Cell"].map(s=>(
                <button key={s} type="button"
                  className={form.Status===s?"seg seg-on":"seg"}
                  onClick={()=>set("Status",s)}>{s}</button>
              ))}
            </div>
            <p className="hint">{form.Status==="Open Cell"
              ?"Still under discipleship — no lifegroup yet."
              :"Now leading their own lifegroup."}</p>
          </fieldset>

          <fieldset className="field">
            <span>Lifegroup status</span>
            <div className="seg-group">
              <button type="button"
                className={form.LifegroupStatus==="Active"?"seg seg-green":"seg"}
                onClick={()=>set("LifegroupStatus","Active")}>Active</button>
              <button type="button"
                className={form.LifegroupStatus==="Inactive"?"seg seg-red":"seg"}
                onClick={()=>set("LifegroupStatus","Inactive")}>Inactive</button>
            </div>
          </fieldset>

          <fieldset className="field">
            <span>Track progress</span>
            <div className="track-row">
              {TRACKS.map(t=>{
                const on=form[t.key]==="TRUE";
                return (
                  <label key={t.key} className={on?"chip chip-on":"chip"}>
                    <input type="checkbox" checked={on}
                      onChange={e=>set(t.key,e.target.checked?"TRUE":"FALSE")}/>
                    {t.label}
                  </label>
                );
              })}
            </div>
          </fieldset>

          <div className="modal-foot">
            <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving&&<Loader2 size={15} className="spin"/>}
              {initial?"Save changes":"Add member"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Leader Modal ──────────────────────────────────────────────────────────────
function LeaderModal({ open, onClose, onSave, gender, saving }) {
  const [name, setName] = useState("");
  useEffect(()=>{ if(open) setName(""); },[open]);
  if (!open) return null;
  return (
    <div className="overlay" onMouseDown={e=>{if(e.target===e.currentTarget)onClose();}}>
      <div className="modal modal-sm">
        <div className="modal-head">
          <h2>Add lifegroup leader</h2>
          <button className="icon-btn" onClick={onClose}><X size={18}/></button>
        </div>
        <form className="modal-body" onSubmit={e=>{
          e.preventDefault(); if(!name.trim()) return; onSave({Name:name.trim(),Gender:gender});
        }}>
          <label className="field">
            <span>Leader name</span>
            <input autoFocus type="text" value={name} required placeholder="Full name"
              onChange={e=>setName(e.target.value)}/>
          </label>
          <p className="hint">Added under {gender}.</p>
          <div className="modal-foot">
            <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving&&<Loader2 size={15} className="spin"/>}Add leader
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Confirm Delete ────────────────────────────────────────────────────────────
function ConfirmDelete({ open, name, onCancel, onConfirm, deleting }) {
  if (!open) return null;
  return (
    <div className="overlay" onMouseDown={e=>{if(e.target===e.currentTarget)onCancel();}}>
      <div className="modal modal-sm">
        <div className="modal-head">
          <h2>Remove member?</h2>
          <button className="icon-btn" onClick={onCancel}><X size={18}/></button>
        </div>
        <div className="modal-body">
          <p className="confirm-txt">This removes <strong>{name}</strong> from the sheet. This can't be undone.</p>
          <div className="modal-foot">
            <button className="btn-ghost" onClick={onCancel}>Cancel</button>
            <button className="btn-danger" onClick={onConfirm} disabled={deleting}>
              {deleting?<Loader2 size={15} className="spin"/>:<Trash2 size={14}/>}Remove
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Format time for display ───────────────────────────────────────────────────
function formatTime(t) {
  if (!t) return "";
  const [h, m] = t.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const hr = h % 12 || 12;
  return `${hr}:${String(m).padStart(2,"0")} ${ampm}`;
}

// ── Member Row ────────────────────────────────────────────────────────────────
function MemberRow({ member, onEdit, onDelete }) {
  const isClose = member.Status === "Close Cell";
  return (
    <div className={`member-row${isClose?" member-row-close":""}`}>
      <div className="member-main">
        <div className="member-name-line">
          <span className="member-name">{member.Name}</span>
          {isClose && <span className="badge badge-close">Close Cell</span>}
          <StatusBadge status={member.LifegroupStatus}/>
          {member.LifegroupLocation && (
            <span className="member-loc"><MapPin size={11}/>{member.LifegroupLocation}</span>
          )}
        </div>
        <Pathway member={member} size="sm"/>
      </div>
      <div className="member-side">
        <button className="icon-btn" onClick={()=>onEdit(member)}><Pencil size={14}/></button>
        <button className="icon-btn icon-btn-danger" onClick={()=>onDelete(member)}><Trash2 size={14}/></button>
      </div>
    </div>
  );
}

// ── Grouped member list by day + time ────────────────────────────────────────
function GroupedMembers({ members, onEdit, onDelete, onAdd }) {
  const groups = {};
  members.forEach(m => {
    const day  = (m.ScheduleDay||"").trim()  || "";
    const time = (m.ScheduleTime||"").trim() || "";
    const key  = day || time ? `${day}||${time}` : "||";
    if (!groups[key]) groups[key] = { day, time, members: [] };
    groups[key].members.push(m);
  });

  const sorted = Object.keys(groups).sort((a, b) => {
    const ga = groups[a], gb = groups[b];
    if (!ga.day && !ga.time) return 1;
    if (!gb.day && !gb.time) return -1;
    const ai = DAYS.indexOf(ga.day), bi = DAYS.indexOf(gb.day);
    if (ai !== bi) {
      if (ai === -1) return 1; if (bi === -1) return -1; return ai - bi;
    }
    return (ga.time||"").localeCompare(gb.time||"");
  });

  return (
    <div className="groups">
      {sorted.map(key => {
        const { day, time, members: list } = groups[key];
        const hasSchedule = day || time;
        return (
          <div key={key} className="day-group">
            <div className="day-group-head">
              <span className="day-group-label">
                {hasSchedule ? (
                  <>
                    {day && <><Calendar size={13}/>{day}</>}
                    {time && <><Clock size={13} style={{marginLeft: day ? 6 : 0}}/>{formatTime(time)}</>}
                  </>
                ) : (
                  <span style={{color:"var(--faint)"}}>No schedule</span>
                )}
              </span>
              <span className="day-group-count">{list.length} {list.length===1?"member":"members"}</span>
            </div>
            <div className="member-list">
              {list.map(m=>(
                <MemberRow key={m.ID} member={m} onEdit={onEdit} onDelete={onDelete}/>
              ))}
            </div>
          </div>
        );
      })}
      <button className="btn-add-more" onClick={onAdd}>
        <Plus size={14}/> Add another member
      </button>
    </div>
  );
}

// ── Helper: lifegroup count label ─────────────────────────────────────────────
function lgLabel(n) {
  return `${n} lifegroup${n !== 1 ? "s" : ""}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// SCREENS
// ─────────────────────────────────────────────────────────────────────────────

function HomeScreen({ members, leaders, loading, error, onRetry, onEnter }) {
  const allNonRoot = members.filter(m => m.ParentID);
  const closed = allNonRoot.filter(m=>m.Status==="Close Cell").length;

  return (
    <div className="home-wrap">
      <div className="home-hero">
        <span className="eyebrow">Jotoy's Cell Report</span>
        <h1>Every disciple,<br/>walking the path.</h1>
        <p className="lede">Track every lifegroup leader's disciples — who's still under their wing,
          and who's already leading a lifegroup of their own.</p>
      </div>
      {error && (
        <div className="error-box">
          <AlertCircle size={15}/>{error}
          <button className="link-btn" onClick={onRetry}>Try again</button>
        </div>
      )}
      <div className="stats">
        {[
          {n: allNonRoot.length, l:"Total disciples"},
          {n: leaders.length,    l:"Lifegroup leaders"},
          {n: closed,            l:"Leading their own cell"},
        ].map(s=>(
          <div key={s.l} className="stat">
            <span className="stat-n">{loading?"—":s.n}</span>
            <span className="stat-l">{s.l}</span>
          </div>
        ))}
      </div>
      <div className="doors">
        {[
          {g:"Boys",  Icon:UserCircle2, count: members.filter(m=>!m.ParentID && m.Gender==="Boys").length,  cls:"door-boys"},
          {g:"Girls", Icon:Users,       count: members.filter(m=>!m.ParentID && m.Gender==="Girls").length, cls:"door-girls"},
        ].map(({g,Icon,count,cls})=>(
          <button key={g} className={`door ${cls}`} onClick={()=>onEnter(g)}>
            <Icon size={34} strokeWidth={1.6}/>
            <span className="door-title">{g}</span>
            <span className="door-count">{loading?"…":`${count} leader${count!==1?"s":""}`}</span>
            <span className="door-go">Open <ChevronRight size={14}/></span>
          </button>
        ))}
      </div>
    </div>
  );
}

function GenderScreen({ gender, leaders, members, loading, goHome, onPickLeader, onAddLeader }) {
  const list = leaders.filter(l=>l.Gender===gender);
  const acc  = gender==="Boys"?"acc-boys":"acc-girls";
  return (
    <div className={`screen ${acc}`}>
      <Breadcrumb crumbs={[{label:"Home",onClick:goHome}]} current={gender}/>
      <div className="screen-head">
        <div>
          <h1>{gender}</h1>
          <p className="sub">{list.length} lifegroup {list.length===1?"leader":"leaders"}</p>
        </div>
        <button className="btn-primary" onClick={onAddLeader}><UserPlus size={15}/>Add leader</button>
      </div>
      {loading ? <div className="empty"><Loader2 size={22} className="spin"/></div>
      : list.length===0 ? (
        <div className="empty">
          <p className="empty-title">No leaders yet</p>
          <p className="empty-sub">Add the first {gender.toLowerCase()} lifegroup leader to get started.</p>
          <button className="btn-primary" onClick={onAddLeader}><Plus size={15}/>Add leader</button>
        </div>
      ) : (
        <div className="card-grid">
          {list.map(l=>{
            const mine  = members.filter(m=>String(m.ParentID)===String(l.ID));
            const openList  = mine.filter(m=>(m.Status||"Open Cell")==="Open Cell");
            const closeList = mine.filter(m=>m.Status==="Close Cell");
            // Count lifegroups (unique day+time combos) for pills
            const openLG  = countLifegroups(openList);
            const closeLG = countLifegroups(closeList);
            const schedules = [...new Map(mine.map(m => {
              const d = (m.ScheduleDay||"").trim();
              const t = (m.ScheduleTime||"").trim();
              return [`${d}|${t}`, {day:d, time:t}];
            })).values()].filter(s=>s.day||s.time);
            return (
              <button key={l.ID} className="leader-card" onClick={()=>onPickLeader(l)}>
                <span className="lc-tag">Lifegroup Leader</span>
                <span className="lc-name">{l.Name}</span>
                <div className="lc-counts">
                  <span className="lc-pill lc-open">{openLG} Open Cell</span>
                  <span className="lc-pill lc-close">{closeLG} Close Cell</span>
                </div>
                {schedules.length>0 && (
                  <div className="lc-days">
                    {schedules.slice(0,3).map((s,i)=>(
                      <span key={i} className="day-badge">
                        {s.day && <><Calendar size={10}/>{s.day}</>}
                        {s.time && <><Clock size={10} style={{marginLeft: s.day?3:0}}/>{formatTime(s.time)}</>}
                      </span>
                    ))}
                    {schedules.length>3 && <span className="day-badge">+{schedules.length-3}</span>}
                  </div>
                )}
                <span className="go-lnk">View <ChevronRight size={13}/></span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function LeaderScreen({ gender, leader, members, goHome, goGender, onPickCell }) {
  const acc  = gender==="Boys"?"acc-boys":"acc-girls";
  const mine = members.filter(m=>String(m.ParentID)===String(leader.ID));
  const open  = mine.filter(m=>(m.Status||"Open Cell")==="Open Cell");
  const close = mine.filter(m=>m.Status==="Close Cell");
  const getSchedules = list => [...new Map(list.map(m=>{
    const d=(m.ScheduleDay||"").trim(), t=(m.ScheduleTime||"").trim();
    return [`${d}|${t}`,{day:d,time:t}];
  })).values()].filter(s=>s.day||s.time);
  return (
    <div className={`screen ${acc}`}>
      <Breadcrumb crumbs={[{label:"Home",onClick:goHome},{label:gender,onClick:goGender}]} current={leader.Name}/>
      <div className="screen-head">
        <div>
          <span className="eyebrow-sm">Lifegroup Leader</span>
          <h1>{leader.Name}</h1>
          <p className="sub">{mine.length} {mine.length===1?"disciple":"disciples"} total</p>
        </div>
      </div>
      <div className="cell-split">
        <button className="cell-card cell-open" onClick={()=>onPickCell("Open Cell")}>
          <div className="cc-top">
            <span className="cc-count">{countLifegroups(open)}</span>
            <span className="cc-label">Open Cell</span>
          </div>
          {getSchedules(open).length>0 && (
            <div className="cc-days">
              {getSchedules(open).map((s,i)=>(
                <span key={i} className="day-badge">
                  {s.day && <><Calendar size={10}/>{s.day}</>}
                  {s.time && <><Clock size={10} style={{marginLeft:s.day?3:0}}/>{formatTime(s.time)}</>}
                </span>
              ))}
            </div>
          )}
          <p className="cc-desc">Members still under {leader.Name}'s discipleship.</p>
          <span className="go-lnk">View members <ChevronRight size={13}/></span>
        </button>
        <button className="cell-card cell-close" onClick={()=>onPickCell("Close Cell")}>
          <div className="cc-top">
            <span className="cc-count">{countLifegroups(close)}</span>
            <span className="cc-label">Close Cell</span>
          </div>
          {getSchedules(close).length>0 && (
            <div className="cc-days">
              {getSchedules(close).map((s,i)=>(
                <span key={i} className="day-badge">
                  {s.day && <><Calendar size={10}/>{s.day}</>}
                  {s.time && <><Clock size={10} style={{marginLeft:s.day?3:0}}/>{formatTime(s.time)}</>}
                </span>
              ))}
            </div>
          )}
          <p className="cc-desc">Disciples who now lead their own lifegroup.</p>
          <span className="go-lnk">View leaders <ChevronRight size={13}/></span>
        </button>
      </div>
    </div>
  );
}

function OpenCellScreen({ gender, leader, members, loading, goHome, goGender, goLeader, onAdd, onEdit, onDelete }) {
  const acc  = gender==="Boys"?"acc-boys":"acc-girls";
  const list = members.filter(m=>
    String(m.ParentID)===String(leader.ID)
    &&(m.Status||"Open Cell")==="Open Cell"
  );
  const existingDays = [...new Set(list.map(m=>(m.ScheduleDay||"").trim()).filter(Boolean))];
  return (
    <div className={`screen ${acc}`}>
      <Breadcrumb crumbs={[
        {label:"Home",onClick:goHome},
        {label:gender,onClick:goGender},
        {label:leader.Name,onClick:goLeader},
      ]} current="Open Cell"/>
      <div className="screen-head">
        <div>
          <span className="eyebrow-sm">Open Cell · {leader.Name}</span>
          <h1>Members</h1>
          <p className="sub">Tracking their SUYNL → SOL journey.</p>
        </div>
        <button className="btn-primary" onClick={onAdd}><Plus size={15}/>Add member</button>
      </div>
      {loading ? <div className="empty"><Loader2 size={22} className="spin"/></div>
      : list.length===0 ? (
        <div className="empty">
          <p className="empty-title">No open cell members yet</p>
          <p className="empty-sub">Add a member under {leader.Name} to start tracking.</p>
          <button className="btn-primary" onClick={onAdd}><Plus size={15}/>Add member</button>
        </div>
      ) : (
        <GroupedMembers members={list} onEdit={onEdit} onDelete={onDelete} onAdd={onAdd}
          existingDays={existingDays}/>
      )}
    </div>
  );
}

function CloseCellScreen({ gender, leader, members, loading, goHome, goGender, goLeader, onAdd, onEdit, onDelete, onPickSubLeader }) {
  const acc  = gender==="Boys"?"acc-boys":"acc-girls";
  const list = members.filter(m=>
    String(m.ParentID)===String(leader.ID)
    && m.Status==="Close Cell"
  );

  const groups = {};
  list.forEach(m=>{
    const day=(m.ScheduleDay||"").trim(), time=(m.ScheduleTime||"").trim();
    const key = day||time ? `${day}||${time}` : "||";
    if(!groups[key]) groups[key]={day,time,members:[]};
    groups[key].members.push(m);
  });
  const sorted = Object.keys(groups).sort((a,b)=>{
    const ga=groups[a],gb=groups[b];
    if(!ga.day&&!ga.time) return 1; if(!gb.day&&!gb.time) return -1;
    const ai=DAYS.indexOf(ga.day),bi=DAYS.indexOf(gb.day);
    if(ai!==bi){if(ai===-1) return 1; if(bi===-1) return -1; return ai-bi;}
    return (ga.time||"").localeCompare(gb.time||"");
  });

  return (
    <div className={`screen ${acc}`}>
      <Breadcrumb crumbs={[
        {label:"Home",onClick:goHome},
        {label:gender,onClick:goGender},
        {label:leader.Name,onClick:goLeader},
      ]} current="Close Cell"/>
      <div className="screen-head">
        <div>
          <span className="eyebrow-sm">Close Cell · {leader.Name}</span>
          <h1>Leaders</h1>
          <p className="sub">Disciples who now lead their own lifegroup.</p>
        </div>
        <button className="btn-primary" onClick={onAdd}><Plus size={15}/>Add leader</button>
      </div>
      {loading ? <div className="empty"><Loader2 size={22} className="spin"/></div>
      : list.length===0 ? (
        <div className="empty">
          <p className="empty-title">No close cell leaders yet</p>
          <p className="empty-sub">When a member starts their own lifegroup, add them here.</p>
          <button className="btn-primary" onClick={onAdd}><Plus size={15}/>Add leader</button>
        </div>
      ) : (
        <div className="groups">
          {sorted.map(key=>{
            const {day,time,members:grpMembers}=groups[key];
            const hasSchedule=day||time;
            return (
              <div key={key} className="day-group">
                <div className="day-group-head">
                  <span className="day-group-label">
                    {hasSchedule ? (
                      <>
                        {day && <><Calendar size={13}/>{day}</>}
                        {time && <><Clock size={13} style={{marginLeft:day?6:0}}/>{formatTime(time)}</>}
                      </>
                    ) : (
                      <span style={{color:"var(--faint)"}}>No schedule</span>
                    )}
                  </span>
                  <span className="day-group-count">{grpMembers.length} {grpMembers.length===1?"leader":"leaders"}</span>
                </div>
                <div className="subldr-list">
                  {grpMembers.map(m=>{
                    const ownMembers=members.filter(x=>String(x.ParentID)===String(m.ID));
                    const ownLG = countLifegroups(ownMembers);
                    return (
                      <div key={m.ID} className="subldr-row">
                        <button className="subldr-main" onClick={()=>onPickSubLeader(m)}>
                          <div className="subldr-info">
                            <span className="subldr-name">{m.Name}</span>
                            {m.LifegroupLocation&&(
                              <span className="subldr-loc"><MapPin size={11}/>{m.LifegroupLocation}</span>
                            )}
                          </div>
                          <div className="subldr-meta">
                            <StatusBadge status={m.LifegroupStatus}/>
                            <span className="subldr-count">{lgLabel(ownLG)}</span>
                            <ChevronRight size={15} style={{color:"var(--faint)"}}/>
                          </div>
                        </button>
                        <div className="subldr-actions">
                          <Pathway member={m} size="sm"/>
                          <button className="icon-btn" onClick={()=>onEdit(m)}><Pencil size={14}/></button>
                          <button className="icon-btn icon-btn-danger" onClick={()=>onDelete(m)}><Trash2 size={14}/></button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
          <button className="btn-add-more" onClick={onAdd}><Plus size={14}/>Add another leader</button>
        </div>
      )}
    </div>
  );
}

// ── SubLeader split screen (mirrors LeaderScreen) ────────────────────────────
function SubLeaderScreen({ gender, leader, subLeader, members, goHome, goGender, goLeader, goCloseCell, onPickCell }) {
  const acc  = gender==="Boys"?"acc-boys":"acc-girls";
  const mine = members.filter(m=>String(m.ParentID)===String(subLeader.ID));
  const open  = mine.filter(m=>(m.Status||"Open Cell")==="Open Cell");
  const close = mine.filter(m=>m.Status==="Close Cell");
  const getSchedules = list => [...new Map(list.map(m=>{
    const d=(m.ScheduleDay||"").trim(), t=(m.ScheduleTime||"").trim();
    return [`${d}|${t}`,{day:d,time:t}];
  })).values()].filter(s=>s.day||s.time);
  return (
    <div className={`screen ${acc}`}>
      <Breadcrumb crumbs={[
        {label:"Home",onClick:goHome},
        {label:gender,onClick:goGender},
        {label:leader.Name,onClick:goLeader},
        {label:"Close Cell",onClick:goCloseCell},
      ]} current={subLeader.Name}/>
      <div className="screen-head">
        <div>
          <span className="eyebrow-sm">Close Cell Leader</span>
          <h1>{subLeader.Name}</h1>
          <div style={{display:"flex",alignItems:"center",gap:8,marginTop:4,flexWrap:"wrap"}}>
            <StatusBadge status={subLeader.LifegroupStatus}/>
            {subLeader.LifegroupLocation&&(
              <span className="sub" style={{display:"flex",alignItems:"center",gap:4}}>
                <MapPin size={12}/>{subLeader.LifegroupLocation}
              </span>
            )}
          </div>
          <p className="sub" style={{marginTop:6}}>{mine.length} {mine.length===1?"disciple":"disciples"} total</p>
        </div>
      </div>

      <div className="subl-track-card">
        <p className="subl-track-label">Discipleship track</p>
        <Pathway member={subLeader} size="md"/>
      </div>

      <div className="cell-split">
        <button className="cell-card cell-open" onClick={()=>onPickCell("Open Cell")}>
          <div className="cc-top">
            <span className="cc-count">{countLifegroups(open)}</span>
            <span className="cc-label">Open Cell</span>
          </div>
          {getSchedules(open).length>0 && (
            <div className="cc-days">
              {getSchedules(open).map((s,i)=>(
                <span key={i} className="day-badge">
                  {s.day && <><Calendar size={10}/>{s.day}</>}
                  {s.time && <><Clock size={10} style={{marginLeft:s.day?3:0}}/>{formatTime(s.time)}</>}
                </span>
              ))}
            </div>
          )}
          <p className="cc-desc">Members still under {subLeader.Name}'s discipleship.</p>
          <span className="go-lnk">View members <ChevronRight size={13}/></span>
        </button>
        <button className="cell-card cell-close" onClick={()=>onPickCell("Close Cell")}>
          <div className="cc-top">
            <span className="cc-count">{countLifegroups(close)}</span>
            <span className="cc-label">Close Cell</span>
          </div>
          {getSchedules(close).length>0 && (
            <div className="cc-days">
              {getSchedules(close).map((s,i)=>(
                <span key={i} className="day-badge">
                  {s.day && <><Calendar size={10}/>{s.day}</>}
                  {s.time && <><Clock size={10} style={{marginLeft:s.day?3:0}}/>{formatTime(s.time)}</>}
                </span>
              ))}
            </div>
          )}
          <p className="cc-desc">Disciples who now lead their own lifegroup.</p>
          <span className="go-lnk">View leaders <ChevronRight size={13}/></span>
        </button>
      </div>
    </div>
  );
}

// ── SubLeader Open Cell members ───────────────────────────────────────────────
function SubLeaderOpenScreen({ gender, leader, subLeader, members, loading, goHome, goGender, goLeader, goCloseCell, goSubLeader, onAdd, onEdit, onDelete }) {
  const acc  = gender==="Boys"?"acc-boys":"acc-girls";
  const list = members.filter(m=>
    String(m.ParentID)===String(subLeader.ID)
    &&(m.Status||"Open Cell")==="Open Cell"
  );
  const existingDays = [...new Set(list.map(m=>(m.ScheduleDay||"").trim()).filter(Boolean))];
  return (
    <div className={`screen ${acc}`}>
      <Breadcrumb crumbs={[
        {label:"Home",onClick:goHome},
        {label:gender,onClick:goGender},
        {label:leader.Name,onClick:goLeader},
        {label:"Close Cell",onClick:goCloseCell},
        {label:subLeader.Name,onClick:goSubLeader},
      ]} current="Open Cell"/>
      <div className="screen-head">
        <div>
          <span className="eyebrow-sm">Open Cell · {subLeader.Name}</span>
          <h1>Members</h1>
          <p className="sub">Tracking their SUYNL → SOL journey.</p>
        </div>
        <button className="btn-primary" onClick={onAdd}><Plus size={15}/>Add member</button>
      </div>
      {loading ? <div className="empty"><Loader2 size={22} className="spin"/></div>
      : list.length===0 ? (
        <div className="empty">
          <p className="empty-title">No open cell members yet</p>
          <p className="empty-sub">Add a member under {subLeader.Name} to start tracking.</p>
          <button className="btn-primary" onClick={onAdd}><Plus size={15}/>Add member</button>
        </div>
      ) : (
        <GroupedMembers members={list} onEdit={onEdit} onDelete={onDelete} onAdd={onAdd}
          existingDays={existingDays}/>
      )}
    </div>
  );
}

// ── SubLeader Close Cell leaders ──────────────────────────────────────────────
function SubLeaderCloseScreen({ gender, leader, subLeader, members, loading, goHome, goGender, goLeader, goCloseCell, goSubLeader, onAdd, onEdit, onDelete, onPickDeepLeader }) {
  const acc  = gender==="Boys"?"acc-boys":"acc-girls";
  const list = members.filter(m=>
    String(m.ParentID)===String(subLeader.ID)
    && m.Status==="Close Cell"
  );

  const groups = {};
  list.forEach(m=>{
    const day=(m.ScheduleDay||"").trim(), time=(m.ScheduleTime||"").trim();
    const key=day||time?`${day}||${time}`:"||";
    if(!groups[key]) groups[key]={day,time,members:[]};
    groups[key].members.push(m);
  });
  const sorted=Object.keys(groups).sort((a,b)=>{
    const ga=groups[a],gb=groups[b];
    if(!ga.day&&!ga.time) return 1; if(!gb.day&&!gb.time) return -1;
    const ai=DAYS.indexOf(ga.day),bi=DAYS.indexOf(gb.day);
    if(ai!==bi){if(ai===-1) return 1; if(bi===-1) return -1; return ai-bi;}
    return (ga.time||"").localeCompare(gb.time||"");
  });

  return (
    <div className={`screen ${acc}`}>
      <Breadcrumb crumbs={[
        {label:"Home",onClick:goHome},
        {label:gender,onClick:goGender},
        {label:leader.Name,onClick:goLeader},
        {label:"Close Cell",onClick:goCloseCell},
        {label:subLeader.Name,onClick:goSubLeader},
      ]} current="Close Cell"/>
      <div className="screen-head">
        <div>
          <span className="eyebrow-sm">Close Cell · {subLeader.Name}</span>
          <h1>Leaders</h1>
          <p className="sub">Disciples who now lead their own lifegroup.</p>
        </div>
        <button className="btn-primary" onClick={onAdd}><Plus size={15}/>Add leader</button>
      </div>
      {loading ? <div className="empty"><Loader2 size={22} className="spin"/></div>
      : list.length===0 ? (
        <div className="empty">
          <p className="empty-title">No close cell leaders yet</p>
          <p className="empty-sub">When a member starts their own lifegroup, add them here.</p>
          <button className="btn-primary" onClick={onAdd}><Plus size={15}/>Add leader</button>
        </div>
      ) : (
        <div className="groups">
          {sorted.map(key=>{
            const {day,time,members:grpMembers}=groups[key];
            const hasSchedule=day||time;
            return (
              <div key={key} className="day-group">
                <div className="day-group-head">
                  <span className="day-group-label">
                    {hasSchedule?(
                      <>
                        {day&&<><Calendar size={13}/>{day}</>}
                        {time&&<><Clock size={13} style={{marginLeft:day?6:0}}/>{formatTime(time)}</>}
                      </>
                    ):<span style={{color:"var(--faint)"}}>No schedule</span>}
                  </span>
                  <span className="day-group-count">{grpMembers.length} {grpMembers.length===1?"leader":"leaders"}</span>
                </div>
                <div className="subldr-list">
                  {grpMembers.map(m=>{
                    const ownMembers=members.filter(x=>String(x.ParentID)===String(m.ID));
                    const ownLG = countLifegroups(ownMembers);
                    return (
                      <div key={m.ID} className="subldr-row">
                        <button className="subldr-main" onClick={()=>onPickDeepLeader(m)}>
                          <div className="subldr-info">
                            <span className="subldr-name">{m.Name}</span>
                            {m.LifegroupLocation&&(
                              <span className="subldr-loc"><MapPin size={11}/>{m.LifegroupLocation}</span>
                            )}
                          </div>
                          <div className="subldr-meta">
                            <StatusBadge status={m.LifegroupStatus}/>
                            <span className="subldr-count">{lgLabel(ownLG)}</span>
                            <ChevronRight size={15} style={{color:"var(--faint)"}}/>
                          </div>
                        </button>
                        <div className="subldr-actions">
                          <Pathway member={m} size="sm"/>
                          <button className="icon-btn" onClick={()=>onEdit(m)}><Pencil size={14}/></button>
                          <button className="icon-btn icon-btn-danger" onClick={()=>onDelete(m)}><Trash2 size={14}/></button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
          <button className="btn-add-more" onClick={onAdd}><Plus size={14}/>Add another leader</button>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ROOT APP
// ─────────────────────────────────────────────────────────────────────────────
export default function App() {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");
  const [route,   setRoute]   = useState({screen:"home"});

  const [modalOpen, setModalOpen] = useState(false);
  const [editing,   setEditing]   = useState(null);
  const [saving,    setSaving]    = useState(false);
  const [delTarget, setDelTarget] = useState(null);
  const [deleting,  setDeleting]  = useState(false);
  const [ldrModal,  setLdrModal]  = useState(false);
  const [savingLdr, setSavingLdr] = useState(false);

  const leaders = members.filter(m => !m.ParentID || String(m.ParentID).trim() === "");

  const load = useCallback(async()=>{
    setLoading(true); setError("");
    try {
      const data = await apiGet();
      setMembers(data.members || []);
    } catch { setError("Couldn't load from the sheet. Check connection and try again."); }
    finally  { setLoading(false); }
  },[]);

  useEffect(()=>{load();},[load]);

  const goHome         = ()           => setRoute({screen:"home"});
  const goGender       = g            => setRoute({screen:"gender",gender:g});
  const goLeader       = (g,l)        => setRoute({screen:"leader",gender:g,leader:l});
  const goOpenCell     = (g,l)        => setRoute({screen:"open",gender:g,leader:l});
  const goCloseCell    = (g,l)        => setRoute({screen:"close",gender:g,leader:l});
  const goSubLeader    = (g,l,sub)    => setRoute({screen:"subleader",gender:g,leader:l,subLeader:sub});
  const goSubOpen      = (g,l,sub)    => setRoute({screen:"subopen",gender:g,leader:l,subLeader:sub});
  const goSubClose     = (g,l,sub)    => setRoute({screen:"subclose",gender:g,leader:l,subLeader:sub});

  function currentParentId() {
    if (route.screen==="open")      return String(route.leader.ID);
    if (route.screen==="close")     return String(route.leader.ID);
    if (route.screen==="subleader") return String(route.subLeader.ID);
    if (route.screen==="subopen")   return String(route.subLeader.ID);
    if (route.screen==="subclose")  return String(route.subLeader.ID);
    return "";
  }
  function currentDefaultStatus() {
    if (route.screen==="close")    return "Close Cell";
    if (route.screen==="subclose") return "Close Cell";
    return "Open Cell";
  }
  function currentLeaderName() {
    if (route.screen==="subleader") return route.subLeader.Name;
    if (route.screen==="subopen")   return route.subLeader.Name;
    if (route.screen==="subclose")  return route.subLeader.Name;
    if (route.screen==="open"||route.screen==="close") return route.leader.Name;
    return "";
  }
  function currentExistingDays() {
    const pid = currentParentId();
    const status = currentDefaultStatus();
    return [...new Set(
      members
        .filter(m=>String(m.ParentID)===pid && (m.Status||"Open Cell")===status)
        .map(m=>(m.ScheduleDay||"").trim())
        .filter(Boolean)
    )];
  }

  async function handleSaveMember(form) {
    setSaving(true);
    const pid = currentParentId();
    try {
      if (editing) {
        await apiPost({action:"updateMember",id:editing.ID,member:form});
        setMembers(prev=>prev.map(m=>String(m.ID)===String(editing.ID)?{...m,...form}:m));
      } else {
        const res = await apiPost({action:"createMember",member:{...form,ParentID:pid}});
        setMembers(prev=>[...prev,{...form,ParentID:pid,ID:res.id}]);
      }
      setModalOpen(false); setEditing(null);
    } catch { setError("Couldn't save. Try again."); }
    finally  { setSaving(false); }
  }

  async function handleDelete() {
    if(!delTarget) return;
    setDeleting(true);
    try {
      await apiPost({action:"deleteMember",id:delTarget.ID});
      setMembers(prev=>prev.filter(m=>String(m.ID)!==String(delTarget.ID)));
      setDelTarget(null);
    } catch { setError("Couldn't remove. Try again."); }
    finally  { setDeleting(false); }
  }

  async function handleSaveLeader(form) {
    setSavingLdr(true);
    try {
      const res = await apiPost({action:"createRoot",member:form});
      setMembers(prev=>[...prev,{...form,ID:res.id,ParentID:"",Status:"Close Cell",LifegroupStatus:"Active"}]);
      setLdrModal(false);
    } catch { setError("Couldn't add leader. Try again."); }
    finally  { setSavingLdr(false); }
  }

  return (
    <div className="shell">
      <style>{CSS}</style>
      <header className="topbar">
        <button className="brand" onClick={goHome}>
          <span className="brand-mark">JCR</span>
          <span className="brand-name">Jotoy's Cell Report</span>
        </button>
        <div style={{display:"flex",gap:6}}>
          {route.screen!=="home"&&
            <button className="icon-btn" onClick={goHome} title="Home"><Home size={15}/></button>}
          <button className="icon-btn" onClick={load} title="Refresh">
            <RefreshCw size={15} className={loading?"spin":""}/>
          </button>
        </div>
      </header>

      <main className="main">
        {route.screen==="home"&&(
          <HomeScreen members={members} leaders={leaders} loading={loading}
            error={error} onRetry={load} onEnter={goGender}/>
        )}
        {route.screen==="gender"&&(
          <GenderScreen gender={route.gender} leaders={leaders} members={members}
            loading={loading} goHome={goHome}
            onPickLeader={l=>goLeader(route.gender,l)}
            onAddLeader={()=>setLdrModal(true)}/>
        )}
        {route.screen==="leader"&&(
          <LeaderScreen gender={route.gender} leader={route.leader} members={members}
            goHome={goHome} goGender={()=>goGender(route.gender)}
            onPickCell={cell=>cell==="Open Cell"
              ?goOpenCell(route.gender,route.leader)
              :goCloseCell(route.gender,route.leader)}/>
        )}
        {route.screen==="open"&&(
          <OpenCellScreen gender={route.gender} leader={route.leader} members={members}
            loading={loading} goHome={goHome}
            goGender={()=>goGender(route.gender)}
            goLeader={()=>goLeader(route.gender,route.leader)}
            onAdd={()=>{setEditing(null);setModalOpen(true);}}
            onEdit={m=>{setEditing(m);setModalOpen(true);}}
            onDelete={m=>setDelTarget(m)}/>
        )}
        {route.screen==="close"&&(
          <CloseCellScreen gender={route.gender} leader={route.leader} members={members}
            loading={loading} goHome={goHome}
            goGender={()=>goGender(route.gender)}
            goLeader={()=>goLeader(route.gender,route.leader)}
            onAdd={()=>{setEditing(null);setModalOpen(true);}}
            onEdit={m=>{setEditing(m);setModalOpen(true);}}
            onDelete={m=>setDelTarget(m)}
            onPickSubLeader={sub=>goSubLeader(route.gender,route.leader,sub)}/>
        )}
        {route.screen==="subleader"&&(
          <SubLeaderScreen gender={route.gender} leader={route.leader} subLeader={route.subLeader}
            members={members}
            goHome={goHome} goGender={()=>goGender(route.gender)}
            goLeader={()=>goLeader(route.gender,route.leader)}
            goCloseCell={()=>goCloseCell(route.gender,route.leader)}
            onPickCell={cell=>cell==="Open Cell"
              ?goSubOpen(route.gender,route.leader,route.subLeader)
              :goSubClose(route.gender,route.leader,route.subLeader)}/>
        )}
        {route.screen==="subopen"&&(
          <SubLeaderOpenScreen gender={route.gender} leader={route.leader} subLeader={route.subLeader}
            members={members} loading={loading}
            goHome={goHome} goGender={()=>goGender(route.gender)}
            goLeader={()=>goLeader(route.gender,route.leader)}
            goCloseCell={()=>goCloseCell(route.gender,route.leader)}
            goSubLeader={()=>goSubLeader(route.gender,route.leader,route.subLeader)}
            onAdd={()=>{setEditing(null);setModalOpen(true);}}
            onEdit={m=>{setEditing(m);setModalOpen(true);}}
            onDelete={m=>setDelTarget(m)}/>
        )}
        {route.screen==="subclose"&&(
          <SubLeaderCloseScreen gender={route.gender} leader={route.leader} subLeader={route.subLeader}
            members={members} loading={loading}
            goHome={goHome} goGender={()=>goGender(route.gender)}
            goLeader={()=>goLeader(route.gender,route.leader)}
            goCloseCell={()=>goCloseCell(route.gender,route.leader)}
            goSubLeader={()=>goSubLeader(route.gender,route.leader,route.subLeader)}
            onAdd={()=>{setEditing(null);setModalOpen(true);}}
            onEdit={m=>{setEditing(m);setModalOpen(true);}}
            onDelete={m=>setDelTarget(m)}
            onPickDeepLeader={deep=>setRoute({screen:"subleader",gender:route.gender,leader:route.leader,subLeader:deep})}/>
        )}
      </main>

      <MemberModal
        open={modalOpen}
        onClose={()=>{if(!saving){setModalOpen(false);setEditing(null);}}}
        onSave={handleSaveMember}
        initial={editing}
        leaderName={currentLeaderName()}
        defaultStatus={currentDefaultStatus()}
        existingDays={currentExistingDays()}
        saving={saving}
      />
      <LeaderModal open={ldrModal} onClose={()=>setLdrModal(false)}
        onSave={handleSaveLeader} gender={route.gender} saving={savingLdr}/>
      <ConfirmDelete open={!!delTarget} name={delTarget?.Name}
        onCancel={()=>setDelTarget(null)} onConfirm={handleDelete} deleting={deleting}/>
    </div>
  );
}

const CSS = `
:root {
  --paper:  #FAF6EE; --raised: #FFFFFF; --ink: #1F2A24;
  --faint:  #9C9485; --line:   #E4DDCC;
  --sage:   #5B7A63; --sage-d: #44604C;
  --gold:   #C99A4B;
  --rose:   #B8757A; --rose-d: #9C5B61;
  --blue:   #5C7C9C; --blue-d: #46647F;
  --danger: #B23B3B; --green:  #3A7D5C;
}
*{box-sizing:border-box;margin:0;padding:0;}
body{background:var(--paper);color:var(--ink);
  font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;}
.spin{animation:spin .9s linear infinite;}
@keyframes spin{to{transform:rotate(360deg);}}

.topbar{position:sticky;top:0;z-index:10;display:flex;align-items:center;
  justify-content:space-between;padding:16px 28px;
  border-bottom:1px solid var(--line);background:var(--paper);}
.brand{display:flex;align-items:center;gap:10px;background:none;border:none;cursor:pointer;}
.brand-mark{background:var(--sage);color:var(--paper);font-weight:700;font-size:13px;
  letter-spacing:.04em;padding:6px 9px;border-radius:6px;}
.brand-name{font-size:16px;font-weight:700;color:var(--ink);}
.main{max-width:880px;margin:0 auto;padding:40px 24px 80px;}

.bc{display:flex;align-items:center;gap:6px;font-size:13px;color:var(--faint);
  margin-bottom:22px;flex-wrap:wrap;}
.bc-btn{background:none;border:none;font-size:13px;color:var(--faint);cursor:pointer;}
.bc-btn:hover{color:var(--ink);text-decoration:underline;}
.bc-cur{font-size:13px;color:var(--ink);font-weight:600;}

.screen-head{display:flex;align-items:flex-end;justify-content:space-between;
  margin-bottom:28px;gap:16px;flex-wrap:wrap;}
.screen-head h1{font-size:30px;font-weight:700;margin-bottom:4px;}
.eyebrow-sm{font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;
  color:var(--faint);display:block;margin-bottom:4px;}
.sub{font-size:14px;color:var(--faint);}
.acc-boys  .screen-head h1{color:var(--blue-d);}
.acc-girls .screen-head h1{color:var(--rose-d);}

.error-box{display:flex;align-items:center;gap:8px;background:#F8E9E5;color:var(--danger);
  border:1px solid #E5BDB5;border-radius:10px;padding:12px 16px;font-size:14px;margin-bottom:28px;}
.error-box .link-btn{color:var(--danger);text-decoration:underline;margin-left:auto;}
.link-btn{background:none;border:none;font-size:13px;color:var(--faint);cursor:pointer;}

/* HOME */
.home-wrap{max-width:640px;}
.home-hero{margin-bottom:36px;}
.eyebrow{display:inline-block;font-size:12px;letter-spacing:.12em;text-transform:uppercase;
  color:var(--sage-d);font-weight:700;margin-bottom:14px;}
.home-hero h1{font-size:42px;line-height:1.08;font-weight:700;
  letter-spacing:-.01em;margin-bottom:16px;}
.lede{font-size:16px;line-height:1.6;color:#5B5447;}
.stats{display:grid;grid-template-columns:repeat(3,1fr);gap:0;margin-bottom:40px;padding-bottom:32px;
  border-bottom:1px solid var(--line);}
.stat{display:flex;flex-direction:column;padding:0 0 0 0;border-right:1px solid var(--line);}
.stat:last-child{border-right:none;}
.stat{padding:0 20px 0 0;}
.stat:not(:first-child){padding:0 20px;}
.stat-n{font-size:34px;font-weight:700;color:var(--sage-d);}
.stat-l{font-size:13px;color:var(--faint);margin-top:2px;}
.doors{display:grid;grid-template-columns:1fr 1fr;gap:18px;}
.door{display:flex;flex-direction:column;align-items:flex-start;gap:6px;text-align:left;
  background:var(--raised);border:1px solid var(--line);border-radius:16px;padding:28px 24px;
  cursor:pointer;transition:transform .15s,box-shadow .15s,border-color .15s;}
.door:hover{transform:translateY(-2px);box-shadow:0 8px 24px rgba(31,42,36,.08);}
.door-boys{color:var(--blue-d);} .door-boys:hover{border-color:var(--blue);}
.door-girls{color:var(--rose-d);} .door-girls:hover{border-color:var(--rose);}
.door-title{font-size:24px;font-weight:700;color:var(--ink);margin-top:8px;}
.door-count{font-size:13px;color:var(--faint);}
.door-go{margin-top:10px;font-size:13px;font-weight:700;display:flex;align-items:center;gap:2px;}

/* LEADER CARDS */
.card-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:14px;}
.leader-card{text-align:left;background:var(--raised);border:1px solid var(--line);
  border-radius:14px;padding:20px;cursor:pointer;display:flex;flex-direction:column;gap:8px;
  transition:transform .15s,box-shadow .15s;}
.leader-card:hover{transform:translateY(-2px);box-shadow:0 8px 22px rgba(31,42,36,.08);}
.lc-tag{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:var(--faint);}
.lc-name{font-size:18px;font-weight:700;}
.lc-counts{display:flex;gap:6px;flex-wrap:wrap;}
.lc-pill{font-size:11px;font-weight:700;border-radius:20px;padding:3px 10px;}
.lc-open{background:#EAF4F0;color:var(--sage-d);}
.lc-close{background:#F0F4FA;color:var(--blue-d);}
.lc-days{display:flex;gap:4px;flex-wrap:wrap;}
.go-lnk{font-size:12px;font-weight:700;color:var(--sage-d);display:flex;align-items:center;margin-top:4px;}

/* CELL SPLIT */
.cell-split{display:grid;grid-template-columns:1fr 1fr;gap:18px;}
.cell-card{text-align:left;background:var(--raised);border:1px solid var(--line);
  border-radius:16px;padding:24px;cursor:pointer;display:flex;flex-direction:column;gap:12px;
  transition:transform .15s,box-shadow .15s;}
.cell-card:hover{transform:translateY(-2px);box-shadow:0 8px 22px rgba(31,42,36,.08);}
.cell-open:hover{border-color:var(--sage);}
.cell-close:hover{border-color:var(--blue);}
.cc-top{display:flex;align-items:baseline;gap:10px;}
.cc-count{font-size:36px;font-weight:700;}
.cell-open  .cc-count{color:var(--sage-d);}
.cell-close .cc-count{color:var(--blue-d);}
.cc-label{font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:var(--faint);}
.cc-days{display:flex;gap:4px;flex-wrap:wrap;}
.cc-desc{font-size:14px;color:#5B5447;line-height:1.5;}

/* DAY GROUPS */
.groups{display:flex;flex-direction:column;gap:24px;}
.day-group{display:flex;flex-direction:column;gap:10px;}
.day-group-head{display:flex;align-items:center;justify-content:space-between;padding:0 2px;}
.day-group-label{display:flex;align-items:center;gap:6px;font-size:13px;font-weight:700;color:var(--ink);}
.day-group-count{font-size:12px;color:var(--faint);}

/* DAY/TIME BADGE */
.day-badge{display:inline-flex;align-items:center;gap:4px;font-size:11px;font-weight:700;
  background:#EEF4FF;color:var(--blue-d);border-radius:20px;padding:3px 8px;}

/* MEMBER LIST */
.member-list{display:flex;flex-direction:column;gap:1px;background:var(--line);
  border:1px solid var(--line);border-radius:12px;overflow:hidden;}
.member-row{display:flex;align-items:center;justify-content:space-between;gap:16px;
  background:var(--raised);padding:16px 18px;}
.member-main{display:flex;flex-direction:column;gap:8px;flex:1;min-width:0;}
.member-name-line{display:flex;align-items:center;gap:8px;flex-wrap:wrap;}
.member-name{font-weight:700;font-size:15px;}
.member-loc{display:flex;align-items:center;gap:3px;font-size:12px;color:var(--faint);}
.member-side{display:flex;align-items:center;gap:8px;flex-shrink:0;}

/* CLOSE CELL SUB-LEADERS */
.subldr-list{display:flex;flex-direction:column;gap:1px;background:var(--line);
  border:1px solid var(--line);border-radius:12px;overflow:hidden;}
.subldr-row{background:var(--raised);display:flex;flex-direction:column;}
.subldr-main{display:flex;align-items:center;justify-content:space-between;
  padding:14px 18px 8px;cursor:pointer;background:none;border:none;text-align:left;width:100%;gap:12px;}
.subldr-main:hover{background:#F8F5EF;}
.subldr-info{display:flex;flex-direction:column;gap:2px;}
.subldr-name{font-size:15px;font-weight:700;}
.subldr-loc{font-size:12px;color:var(--faint);display:flex;align-items:center;gap:3px;}
.subldr-meta{display:flex;align-items:center;gap:8px;flex-shrink:0;}
.subldr-count{font-size:12px;color:var(--faint);font-weight:700;}
.subldr-actions{display:flex;align-items:center;gap:8px;
  padding:4px 18px 12px;border-top:1px solid var(--line);}

/* SUB-LEADER TRACK */
.subl-track-card{background:var(--raised);border:1px solid var(--line);
  border-radius:12px;padding:16px 20px;margin-bottom:24px;display:inline-flex;flex-direction:column;gap:8px;}
.subl-track-label{font-size:11px;font-weight:700;text-transform:uppercase;
  letter-spacing:.08em;color:var(--faint);}

.btn-add-more{display:flex;align-items:center;gap:6px;width:100%;margin-top:2px;
  padding:12px 18px;background:none;border:1.5px dashed var(--line);border-radius:10px;
  font-size:14px;font-weight:700;color:var(--sage);cursor:pointer;
  transition:background .15s,border-color .15s;font-family:inherit;}
.btn-add-more:hover{background:#F0F7F2;border-color:var(--sage);}

/* BADGES */
.badge{display:inline-flex;align-items:center;gap:4px;font-size:11px;
  font-weight:700;border-radius:20px;padding:3px 8px;}
.badge-green{background:#E6F4ED;color:var(--green);}
.badge-red{background:#F8E9E5;color:var(--danger);}
.badge-close{background:#EEF4FF;color:var(--blue-d);}
.member-row-close{background:#F5F8FF;}

/* BUTTONS */
.btn-primary{display:inline-flex;align-items:center;gap:6px;background:var(--sage);
  color:var(--paper);border:none;border-radius:9px;padding:10px 16px;font-size:14px;
  font-weight:700;cursor:pointer;transition:background .15s;font-family:inherit;}
.btn-primary:hover{background:var(--sage-d);}
.btn-primary:disabled{opacity:.6;cursor:default;}
.btn-ghost{background:none;border:1px solid var(--line);border-radius:9px;padding:10px 16px;
  font-size:14px;font-weight:700;color:var(--ink);cursor:pointer;font-family:inherit;}
.btn-ghost:hover{background:#F1ECDF;}
.btn-danger{display:inline-flex;align-items:center;gap:6px;background:var(--danger);
  color:#fff;border:none;border-radius:9px;padding:10px 16px;font-size:14px;
  font-weight:700;cursor:pointer;font-family:inherit;}
.btn-danger:disabled{opacity:.6;}
.icon-btn{display:inline-flex;align-items:center;justify-content:center;background:none;
  border:none;color:var(--faint);cursor:pointer;padding:6px;border-radius:6px;}
.icon-btn:hover{background:#F1ECDF;color:var(--ink);}
.icon-btn-danger:hover{background:#F8E9E5;color:var(--danger);}

/* EMPTY */
.empty{display:flex;flex-direction:column;align-items:center;gap:10px;padding:60px 20px;
  text-align:center;border:1px dashed var(--line);border-radius:14px;color:var(--faint);}
.empty-title{font-weight:700;color:var(--ink);}
.empty-sub{font-size:14px;margin-bottom:4px;}

/* MODAL */
.overlay{position:fixed;inset:0;background:rgba(31,42,36,.45);display:flex;
  align-items:center;justify-content:center;padding:20px;z-index:50;}
.modal{background:var(--raised);border-radius:16px;width:100%;max-width:460px;
  max-height:90vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,.25);}
.modal-sm{max-width:380px;}
.modal-head{display:flex;align-items:center;justify-content:space-between;padding:20px 22px 12px;}
.modal-head h2{font-size:19px;font-weight:700;}
.modal-body{padding:4px 22px 22px;display:flex;flex-direction:column;gap:18px;}
.modal-sub{font-size:13px;color:var(--faint);margin-top:-8px;}
.modal-foot{display:flex;justify-content:flex-end;gap:10px;margin-top:6px;}
.field{display:flex;flex-direction:column;gap:6px;border:none;}
.field>span{font-size:13px;font-weight:700;}
.field input[type=text],.field input[type=time]{font-size:14px;padding:10px 12px;
  border:1px solid var(--line);border-radius:8px;background:var(--paper);
  color:var(--ink);font-family:inherit;}
.field input[type=text]:focus,.field input[type=time]:focus{outline:2px solid var(--sage);outline-offset:1px;}
.hint{font-size:12px;color:var(--faint);}
.hint-inline{font-size:12px;color:var(--faint);font-weight:400;}

/* DAY PICKER */
.day-toggle{display:flex;border:1px solid var(--line);border-radius:8px;overflow:hidden;width:fit-content;}
.dtog{background:var(--paper);border:none;padding:7px 14px;font-size:12px;font-weight:700;
  color:var(--faint);cursor:pointer;font-family:inherit;}
.dtog-on{background:var(--sage);color:var(--paper);}
.day-grid{display:flex;flex-wrap:wrap;gap:6px;}
.day-chip{background:var(--paper);border:1px solid var(--line);border-radius:20px;
  padding:6px 14px;font-size:13px;font-weight:700;color:var(--faint);cursor:pointer;font-family:inherit;}
.day-chip-on{background:var(--blue-d);border-color:var(--blue-d);color:#fff;}

.seg-group{display:flex;border:1px solid var(--line);border-radius:9px;overflow:hidden;}
.seg{flex:1;background:var(--paper);border:none;padding:9px 10px;font-size:13px;
  font-weight:700;color:var(--faint);cursor:pointer;font-family:inherit;}
.seg-on{background:var(--sage);color:var(--paper);}
.seg-green{background:var(--green);color:#fff;}
.seg-red{background:var(--danger);color:#fff;}

.track-row{display:flex;flex-wrap:wrap;gap:8px;}
.chip{display:flex;align-items:center;gap:6px;border:1px solid var(--line);
  border-radius:20px;padding:7px 12px;font-size:13px;cursor:pointer;color:var(--faint);}
.chip-on{border-color:var(--gold);background:#FBF0DC;color:var(--ink);}
.chip input{accent-color:var(--gold);}
.confirm-txt{font-size:14px;line-height:1.5;color:#5B5447;}

@media(max-width:560px){
  .doors,.cell-split{grid-template-columns:1fr;}
  .home-hero h1{font-size:32px;}
  .main{padding:28px 16px 60px;}
  .member-row{flex-wrap:wrap;}
}
`;