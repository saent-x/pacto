(() => {
const { coupl: C, fonts: F, Icon,
  Overline, Display, Pill, PrimaryButton, RoundBtn, Sheet } = window;

const TEMPLATES = [
  { key: 'meals',   label: 'Meal plan',      icon: 'coffee',     color: '#F4A68C', ink: '#3A1F14', sample: 'Breakfast · Lunch · Dinner' },
  { key: 'workout', label: 'Workout',        icon: 'activity',   color: '#A8D8B9', ink: '#0F2C1A', sample: 'Push · Pull · Legs · Rest' },
  { key: 'study',   label: 'Study / work',   icon: 'briefcase',  color: '#9FC4DC', ink: '#0E2230', sample: 'Deep work · Meetings · Break' },
  { key: 'routine', label: 'Morning ritual', icon: 'sun',        color: '#F2D86A', ink: '#3A2E08', sample: 'Stretch · Journal · Coffee' },
  { key: 'sleep',   label: 'Sleep routine',  icon: 'moon',       color: '#B8A8E8', ink: '#1F1635', sample: 'Wind down · Read · Lights out' },
  { key: 'custom',  label: 'Blank',          icon: 'grid',       color: '#D89BA8', ink: '#3A1520', sample: 'Start from zero' },
];

const DAYS_LETTER = ['M','T','W','T','F','S','S'];

// ═════════════════════════════════════════════
// CREATE TIMETABLE SHEET
// ═════════════════════════════════════════════
function CreateTimetableSheet({ open, onClose, onSave }) {
  const [title, setTitle] = React.useState('');
  const [tmplKey, setTmplKey] = React.useState('meals');
  const [share, setShare] = React.useState('shared');
  const tmpl = TEMPLATES.find(t => t.key === tmplKey) || TEMPLATES[0];

  return (
    <Sheet open={open} onClose={onClose} height="94%">
      <div style={{ padding: '6px 20px 30px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <div>
            <Overline color={C.gold}>New timetable</Overline>
            <Display size={28} style={{ marginTop: 4 }}>Shape the week<span style={{ color: C.gold }}>.</span></Display>
          </div>
          <RoundBtn icon="x" size={36} onClick={onClose}/>
        </div>

        {/* Live preview card */}
        <div style={{
          background: tmpl.color, borderRadius: 22, padding: '18px 18px 16px',
          marginBottom: 22, color: tmpl.ink, position: 'relative', overflow: 'hidden',
        }}>
          {/* Faint week grid bg */}
          <div style={{ position: 'absolute', inset: 0, display: 'flex', gap: 2, padding: 4, opacity: 0.18 }}>
            {DAYS_LETTER.map((_, i) => (
              <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 3 }}>
                {[0,1,2].map(r => (
                  <div key={r} style={{ flex: 1, background: tmpl.ink, borderRadius: 3, opacity: (i + r) % 2 ? 0.4 : 0.8 }}/>
                ))}
              </div>
            ))}
          </div>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: 1.2, opacity: 0.55 }}>
                {share === 'shared' ? 'SHARED' : share === 'partner' ? "SOFIA'S" : 'SOLO'} · {tmpl.label.toUpperCase()}
              </div>
              <div style={{ fontFamily: F.display, fontSize: 22, fontWeight: 700, letterSpacing: -0.4, lineHeight: 1.1, marginTop: 6 }}>
                {title || `${tmpl.label} — our week`}
              </div>
              <div style={{ fontSize: 11, opacity: 0.65, marginTop: 4, fontWeight: 500 }}>{tmpl.sample}</div>
            </div>
            <div style={{ width: 44, height: 44, borderRadius: 14, background: `${tmpl.ink}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Icon name={tmpl.icon} size={20} color={tmpl.ink} strokeWidth={2.2}/>
            </div>
          </div>
        </div>

        <Overline style={{ marginBottom: 8 }}>Title</Overline>
        <input value={title} onChange={e => setTitle(e.target.value)}
          placeholder="Our meals this week..."
          style={{
            width: '100%', background: 'transparent', border: 'none',
            borderBottom: `2px solid ${title ? C.gold : C.line}`,
            outline: 'none', color: C.bone, fontFamily: F.display,
            fontSize: 22, fontWeight: 600, padding: '6px 0 10px',
          }}/>

        <div style={{ marginTop: 24 }}>
          <Overline style={{ marginBottom: 10 }}>Template</Overline>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {TEMPLATES.map(t => {
              const active = tmplKey === t.key;
              return (
                <button key={t.key} onClick={() => setTmplKey(t.key)} style={{
                  padding: '12px 12px', borderRadius: 14,
                  background: active ? t.color : C.card,
                  border: `1px solid ${active ? t.color : C.line}`,
                  cursor: 'pointer', textAlign: 'left',
                  display: 'flex', alignItems: 'center', gap: 10,
                  color: active ? t.ink : C.bone,
                }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: 10,
                    background: active ? `${t.ink}22` : t.color,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    <Icon name={t.icon} size={15} color={t.ink} strokeWidth={2.2}/>
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: -0.1 }}>{t.label}</div>
                    <div style={{ fontSize: 9, fontWeight: 500, opacity: 0.6, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.sample}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div style={{ marginTop: 22 }}>
          <Overline style={{ marginBottom: 10 }}>Share with</Overline>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
            {[
              { k: 'solo',    l: 'Just me',   s: 'private',   color: '#9FC4DC', icon: 'user' },
              { k: 'partner', l: "Sofia's",   s: 'for her',   color: '#B8A8E8', icon: 'heart' },
              { k: 'shared',  l: 'Together',  s: 'both edit', color: C.gold,    icon: 'users' },
            ].map(o => {
              const active = share === o.k;
              return (
                <button key={o.k} onClick={() => setShare(o.k)} style={{
                  padding: '12px 8px', borderRadius: 14,
                  background: active ? `${o.color}1F` : C.card,
                  border: `1px solid ${active ? o.color : C.line}`,
                  cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                }}>
                  <Icon name={o.icon} size={16} color={active ? o.color : C.mist}/>
                  <div style={{ fontSize: 11, fontWeight: 700, color: active ? o.color : C.bone }}>{o.l}</div>
                  <div style={{ fontSize: 9, fontWeight: 500, color: C.fog, letterSpacing: 0.3 }}>{o.s}</div>
                </button>
              );
            })}
          </div>
        </div>

        <PrimaryButton onClick={onSave} style={{ marginTop: 28 }} icon="plus">Create timetable</PrimaryButton>
      </div>
    </Sheet>
  );
}

// ═════════════════════════════════════════════
// ADD ITEM SHEET
// ═════════════════════════════════════════════
function AddTimetableItemSheet({ open, onClose, onSave, onOpenTimePicker }) {
  const [title, setTitle] = React.useState('');
  const [cat, setCat] = React.useState('Dinner');
  const [time, setTime] = React.useState('7:00 PM');
  const [dur, setDur] = React.useState(90);
  const [days, setDays] = React.useState([2]); // Wednesday
  const [who, setWho] = React.useState('both');
  const [repeat, setRepeat] = React.useState('weekly');

  const cats = [
    { k: 'Breakfast', color: '#F4A68C', ink: '#3A1F14', icon: 'coffee' },
    { k: 'Lunch',     color: '#A8D8B9', ink: '#0F2C1A', icon: 'leaf' },
    { k: 'Dinner',    color: '#F2D86A', ink: '#3A2E08', icon: 'utensils' },
    { k: 'Snack',     color: '#D89BA8', ink: '#3A1520', icon: 'apple' },
  ];
  const active = cats.find(c => c.k === cat) || cats[0];
  const durOpts = [15, 30, 45, 60, 90, 120];
  const toggleDay = (i) => setDays(d => d.includes(i) ? d.filter(x => x !== i) : [...d, i].sort());

  return (
    <Sheet open={open} onClose={onClose} height="94%">
      <div style={{ padding: '6px 20px 30px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <div>
            <Overline color={active.color}>New item · Meals</Overline>
            <Display size={28} style={{ marginTop: 4 }}>What's cooking<span style={{ color: C.gold }}>.</span></Display>
          </div>
          <RoundBtn icon="x" size={36} onClick={onClose}/>
        </div>

        {/* Preview */}
        <div style={{ background: active.color, borderRadius: 22, padding: '16px 16px 16px 18px', marginBottom: 22, color: active.ink, display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ minWidth: 60 }}>
            <div style={{ fontFamily: F.display, fontSize: 20, fontWeight: 700, letterSpacing: -0.6, lineHeight: 1 }}>{time.replace(' ', '')}</div>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 0.8, opacity: 0.55, marginTop: 3 }}>{dur} MIN</div>
          </div>
          <div style={{ width: 1, alignSelf: 'stretch', background: active.ink, opacity: 0.15 }}/>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: 1, opacity: 0.6 }}>{cat.toUpperCase()}</div>
            <div style={{ fontFamily: F.display, fontSize: 15, fontWeight: 600, letterSpacing: -0.2, lineHeight: 1.2, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {title || 'Item title'}
            </div>
          </div>
        </div>

        <Overline style={{ marginBottom: 8 }}>Title</Overline>
        <input value={title} onChange={e => setTitle(e.target.value)}
          placeholder="Risotto al limone..."
          style={{
            width: '100%', background: 'transparent', border: 'none',
            borderBottom: `2px solid ${title ? active.color : C.line}`,
            outline: 'none', color: C.bone, fontFamily: F.display,
            fontSize: 22, fontWeight: 600, padding: '6px 0 10px',
          }}/>

        <div style={{ marginTop: 22 }}>
          <Overline style={{ marginBottom: 10 }}>Category</Overline>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {cats.map(c => (
              <button key={c.k} onClick={() => setCat(c.k)} style={{
                padding: '8px 12px 8px 10px', borderRadius: 999,
                background: cat === c.k ? c.color : C.card,
                border: `1px solid ${cat === c.k ? c.color : C.line}`,
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
                color: cat === c.k ? c.ink : C.bone,
                fontSize: 12, fontWeight: 600,
              }}>
                <Icon name={c.icon} size={13} color={cat === c.k ? c.ink : C.mist} strokeWidth={2.2}/>
                {c.k}
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginTop: 22, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div>
            <Overline style={{ marginBottom: 8 }}>Time</Overline>
            <button onClick={onOpenTimePicker} style={{
              width: '100%', padding: '14px', borderRadius: 14,
              background: C.card, border: `1px solid ${C.line}`,
              cursor: 'pointer', textAlign: 'left',
              display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <Icon name="clock" size={16} color={active.color}/>
              <div style={{ fontFamily: F.display, fontSize: 18, fontWeight: 700, color: C.bone, letterSpacing: -0.3 }}>{time}</div>
            </button>
          </div>
          <div>
            <Overline style={{ marginBottom: 8 }}>Duration</Overline>
            <div style={{ display: 'flex', gap: 4, background: C.card, border: `1px solid ${C.line}`, borderRadius: 14, padding: 4, overflow: 'auto' }}>
              {durOpts.map(d => (
                <button key={d} onClick={() => setDur(d)} style={{
                  flexShrink: 0, padding: '8px 10px', borderRadius: 10,
                  background: dur === d ? active.color : 'transparent',
                  color: dur === d ? active.ink : C.mist,
                  border: 'none', cursor: 'pointer',
                  fontSize: 11, fontWeight: 700, letterSpacing: 0.2,
                }}>
                  {d < 60 ? `${d}m` : d === 60 ? '1h' : `${(d/60).toString().replace('.5','½')}h`}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div style={{ marginTop: 22 }}>
          <Overline style={{ marginBottom: 10 }}>Days</Overline>
          <div style={{ display: 'flex', gap: 6 }}>
            {DAYS_LETTER.map((d, i) => (
              <button key={i} onClick={() => toggleDay(i)} style={{
                flex: 1, padding: '12px 0', borderRadius: 12,
                background: days.includes(i) ? active.color : C.card,
                border: `1px solid ${days.includes(i) ? active.color : C.line}`,
                color: days.includes(i) ? active.ink : C.mist,
                cursor: 'pointer', fontFamily: F.display,
                fontSize: 14, fontWeight: 700, letterSpacing: -0.1,
              }}>
                {d}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
            {[
              { k: 'every', l: 'Every day', d: [0,1,2,3,4,5,6] },
              { k: 'week',  l: 'Weekdays',  d: [0,1,2,3,4] },
              { k: 'end',   l: 'Weekends',  d: [5,6] },
            ].map(p => (
              <Pill key={p.k} onClick={() => setDays(p.d)}>{p.l}</Pill>
            ))}
          </div>
        </div>

        <div style={{ marginTop: 22, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div>
            <Overline style={{ marginBottom: 8 }}>For</Overline>
            <div style={{ display: 'flex', gap: 4, background: C.card, border: `1px solid ${C.line}`, borderRadius: 14, padding: 4 }}>
              {[{k:'me',l:'Mattia'},{k:'sofia',l:'Sofia'},{k:'both',l:'Both'}].map(o => (
                <button key={o.k} onClick={() => setWho(o.k)} style={{
                  flex: 1, padding: '8px 0', borderRadius: 10,
                  background: who === o.k ? C.bone : 'transparent',
                  color: who === o.k ? C.ink : C.mist,
                  border: 'none', cursor: 'pointer',
                  fontSize: 11, fontWeight: 700,
                }}>
                  {o.l}
                </button>
              ))}
            </div>
          </div>
          <div>
            <Overline style={{ marginBottom: 8 }}>Repeats</Overline>
            <div style={{ display: 'flex', gap: 4, background: C.card, border: `1px solid ${C.line}`, borderRadius: 14, padding: 4 }}>
              {[{k:'weekly',l:'Weekly'},{k:'once',l:'Once'}].map(o => (
                <button key={o.k} onClick={() => setRepeat(o.k)} style={{
                  flex: 1, padding: '8px 0', borderRadius: 10,
                  background: repeat === o.k ? C.bone : 'transparent',
                  color: repeat === o.k ? C.ink : C.mist,
                  border: 'none', cursor: 'pointer',
                  fontSize: 11, fontWeight: 700,
                }}>
                  {o.l}
                </button>
              ))}
            </div>
          </div>
        </div>

        <PrimaryButton onClick={onSave} style={{ marginTop: 28 }} icon="plus">Add to timetable</PrimaryButton>
      </div>
    </Sheet>
  );
}

// ═════════════════════════════════════════════
// TIME PICKER — full screen dial
// ═════════════════════════════════════════════
function TimePickerSheet({ open, onClose, onSave }) {
  const [hour, setHour] = React.useState(7);
  const [minute, setMinute] = React.useState(0);
  const [pm, setPm] = React.useState(true);

  // Dial math
  const dialSize = 260;
  const R = dialSize / 2;
  const hourRadius = R - 36;
  const minuteRadius = R - 20;

  // Active mode: 'hour' or 'minute'
  const [mode, setMode] = React.useState('hour');

  const dispHour = String(hour).padStart(2, '0');
  const dispMin = String(minute).padStart(2, '0');

  // Hour positions 1-12 around circle (12 at top)
  const hourPositions = Array.from({ length: 12 }).map((_, i) => {
    const h = i + 1; // 1..12
    const angle = (h / 12) * 2 * Math.PI - Math.PI / 2;
    return { h, x: R + Math.cos(angle) * hourRadius, y: R + Math.sin(angle) * hourRadius };
  });

  // Minute positions 0, 5, 10 ... 55
  const minutePositions = Array.from({ length: 12 }).map((_, i) => {
    const m = i * 5;
    const angle = (m / 60) * 2 * Math.PI - Math.PI / 2;
    return { m, x: R + Math.cos(angle) * minuteRadius, y: R + Math.sin(angle) * minuteRadius };
  });

  // Hand angle
  const handAngle = mode === 'hour'
    ? (hour % 12) / 12 * 2 * Math.PI - Math.PI / 2
    : (minute / 60) * 2 * Math.PI - Math.PI / 2;
  const handLen = mode === 'hour' ? hourRadius : minuteRadius;
  const handX = R + Math.cos(handAngle) * handLen;
  const handY = R + Math.sin(handAngle) * handLen;

  return (
    <Sheet open={open} onClose={onClose} height="90%">
      <div style={{ padding: '6px 20px 30px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <div>
            <Overline color={C.gold}>Pick a time</Overline>
            <Display size={28} style={{ marginTop: 4 }}>When<span style={{ color: C.gold }}>?</span></Display>
          </div>
          <RoundBtn icon="x" size={36} onClick={onClose}/>
        </div>

        {/* Big clock readout */}
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 4, marginBottom: 22 }}>
          <button onClick={() => setMode('hour')} style={{
            fontFamily: F.display, fontSize: 72, fontWeight: 700,
            color: mode === 'hour' ? C.gold : C.mist, letterSpacing: -3,
            background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, lineHeight: 1,
          }}>
            {dispHour}
          </button>
          <div style={{ fontFamily: F.display, fontSize: 60, fontWeight: 300, color: C.fog, lineHeight: 1, margin: '0 -2px' }}>:</div>
          <button onClick={() => setMode('minute')} style={{
            fontFamily: F.display, fontSize: 72, fontWeight: 700,
            color: mode === 'minute' ? C.gold : C.mist, letterSpacing: -3,
            background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, lineHeight: 1,
          }}>
            {dispMin}
          </button>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginLeft: 12 }}>
            <button onClick={() => setPm(false)} style={{
              padding: '6px 12px', borderRadius: 10,
              background: !pm ? C.gold : 'transparent',
              color: !pm ? C.ink : C.mist,
              border: `1px solid ${!pm ? C.gold : C.line}`,
              cursor: 'pointer', fontSize: 11, fontWeight: 800, letterSpacing: 1,
            }}>AM</button>
            <button onClick={() => setPm(true)} style={{
              padding: '6px 12px', borderRadius: 10,
              background: pm ? C.gold : 'transparent',
              color: pm ? C.ink : C.mist,
              border: `1px solid ${pm ? C.gold : C.line}`,
              cursor: 'pointer', fontSize: 11, fontWeight: 800, letterSpacing: 1,
            }}>PM</button>
          </div>
        </div>

        {/* Clock dial */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 22 }}>
          <div style={{
            width: dialSize, height: dialSize, borderRadius: dialSize / 2,
            background: C.card, border: `1px solid ${C.line}`, position: 'relative',
          }}>
            {/* Clock hand */}
            <svg width={dialSize} height={dialSize} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
              <line x1={R} y1={R} x2={handX} y2={handY} stroke={C.gold} strokeWidth="1.5"/>
              <circle cx={R} cy={R} r="4" fill={C.gold}/>
              <circle cx={handX} cy={handY} r="16" fill={C.gold} fillOpacity="0.18" stroke={C.gold} strokeWidth="1.2"/>
            </svg>
            {/* Numbers */}
            {mode === 'hour' ? (
              hourPositions.map(p => {
                const active = hour === p.h || (hour === 0 && p.h === 12);
                return (
                  <button key={p.h} onClick={() => setHour(p.h)} style={{
                    position: 'absolute', left: p.x - 14, top: p.y - 14,
                    width: 28, height: 28, borderRadius: 14,
                    background: 'transparent', border: 'none', cursor: 'pointer',
                    fontFamily: F.display, fontSize: 14, fontWeight: 600,
                    color: active ? C.ink : C.bone,
                    zIndex: 2,
                  }}>
                    {p.h}
                  </button>
                );
              })
            ) : (
              minutePositions.map(p => {
                const active = minute === p.m;
                return (
                  <button key={p.m} onClick={() => setMinute(p.m)} style={{
                    position: 'absolute', left: p.x - 14, top: p.y - 14,
                    width: 28, height: 28, borderRadius: 14,
                    background: 'transparent', border: 'none', cursor: 'pointer',
                    fontFamily: F.display, fontSize: 12, fontWeight: 600,
                    color: active ? C.ink : C.bone, opacity: p.m % 15 === 0 ? 1 : 0.55,
                    zIndex: 2,
                  }}>
                    {String(p.m).padStart(2,'0')}
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Quick presets */}
        <div style={{ marginBottom: 22 }}>
          <Overline style={{ marginBottom: 10 }}>Quick picks</Overline>
          <div style={{ display: 'flex', gap: 6, overflow: 'auto', paddingBottom: 4 }}>
            {[
              { l: 'Breakfast', h: 7,  m: 30, pm: false },
              { l: 'Lunch',     h: 12, m: 30, pm: true },
              { l: 'Tea',       h: 4,  m: 0,  pm: true },
              { l: 'Dinner',    h: 7,  m: 0,  pm: true },
              { l: 'Late',      h: 10, m: 0,  pm: true },
            ].map(p => (
              <Pill key={p.l} onClick={() => { setHour(p.h); setMinute(p.m); setPm(p.pm); }}>{p.l}</Pill>
            ))}
          </div>
        </div>

        <PrimaryButton onClick={onSave} icon="check">Set time</PrimaryButton>
      </div>
    </Sheet>
  );
}

Object.assign(window, { CreateTimetableSheet, AddTimetableItemSheet, TimePickerSheet });
})();
