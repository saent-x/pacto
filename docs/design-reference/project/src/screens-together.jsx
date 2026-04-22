(() => {
const { coupl: C, fonts: F, Icon, SubScreenHeader, ScreenHeader, Overline, Display, BlockCard, IconTile, WavyUnderline, Pill, RoundBtn, DateSectioned } = window;

// ─────────────────────────────────────────────
// CALENDAR
// ─────────────────────────────────────────────
function CalendarScreen({ onCreate }) {
  const [selectedDay, setSelectedDay] = React.useState(17);
  const days = ['MON','TUE','WED','THU','FRI','SAT','SUN'];
  const monthDays = Array.from({length: 30}, (_, i) => i + 1);

  const events = [
    { id: 1, time: '18:00', title: "Sofia's mom dinner", loc: 'Nonna\'s · Venice', who: 'BOTH', cat: 'family', color: C.peach },
    { id: 2, time: '20:30', title: 'Film night — Past Lives', loc: 'Home', who: 'BOTH', cat: 'date', color: C.rose },
    { id: 3, time: 'All day', title: 'Venice trip planning', loc: '', who: 'MATTIA', cat: 'travel', color: C.sky },
  ];

  return (
    <div style={{ height: '100%', overflow: 'auto', padding: '68px 0 110px', background: C.ink }}>
      {/* Header */}
      <div style={{ padding: '0 24px 18px' }}>
        {window.__nativeHeader ? (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', minHeight: 36, marginBottom: 14 }}>
              <div style={{ fontSize: 11, color: C.fog, fontWeight: 700, letterSpacing: 1.4, textTransform: 'uppercase' }}>April 2026</div>
              <button onClick={onCreate} style={{ width: 36, height: 36, borderRadius: 18, background: C.card, border: `1px solid ${C.line}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                <Icon name="plus" size={16} color={C.bone} strokeWidth={2.2}/>
              </button>
            </div>
            <h1 style={{ fontFamily: F.display, fontSize: 34, fontWeight: 700, color: C.bone, margin: 0, lineHeight: 1.05, letterSpacing: -0.8 }}>
              Calendar<span style={{ color: C.gold }}>.</span>
            </h1>
          </div>
        ) : (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: 11, color: C.fog, fontWeight: 700, letterSpacing: 1.4, textTransform: 'uppercase', marginBottom: 4 }}>April 2026</div>
              <div style={{ fontFamily: F.display, fontSize: 44, fontWeight: 700, color: C.bone, letterSpacing: -1.2, lineHeight: 1 }}>CAL<span style={{ color: C.gold }}>.</span></div>
              <div style={{ width: 78, height: 3, marginTop: 8, background: `linear-gradient(90deg, ${C.gold}, transparent)`, borderRadius: 2 }}/>
            </div>
            <button onClick={onCreate} style={{ width: 44, height: 44, borderRadius: 22, background: C.gold, border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <Icon name="plus" size={20} color={C.ink} strokeWidth={2.5}/>
            </button>
          </div>
        )}
      </div>

      {/* Butter month overview card */}
      <div style={{ padding: '0 20px', marginBottom: 20 }}>
        <div style={{ background: C.butter, borderRadius: 26, padding: '20px 22px', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: 0, right: 0, width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,255,255,0.18)', transform: 'translate(30%,-30%)' }}/>
          <div style={{ fontSize: 10, color: C.butterInk, fontWeight: 800, letterSpacing: 1.4, marginBottom: 8, opacity: 0.6 }}>THIS MONTH</div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, marginBottom: 10 }}>
            <div style={{ fontFamily: F.display, fontSize: 60, fontWeight: 700, color: C.butterInk, lineHeight: 0.9, letterSpacing: -2 }}>8</div>
            <div style={{ fontFamily: F.display, fontSize: 22, fontWeight: 700, color: C.butterInk, lineHeight: 1, marginBottom: 6 }}>events</div>
          </div>
          <div style={{ display: 'flex', gap: 16, fontSize: 11, color: C.butterInk, fontWeight: 600, opacity: 0.75 }}>
            <span>3 shared</span><span>·</span><span>2 upcoming</span><span>·</span><span>next in 6h</span>
          </div>
        </div>
      </div>

      {/* Week strip */}
      <div style={{ padding: '0 20px', marginBottom: 22 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 4px 10px' }}>
          {days.map(d => <span key={d} style={{ fontSize: 10, color: C.fog, fontWeight: 700, letterSpacing: 1.2, width: 40, textAlign: 'center' }}>{d}</span>)}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          {[14,15,16,17,18,19,20].map((n, i) => {
            const active = n === selectedDay;
            const hasEvent = [15,17,19].includes(n);
            return (
              <button key={n} onClick={() => setSelectedDay(n)} style={{
                width: 40, height: 54, borderRadius: 14,
                background: active ? C.gold : 'transparent',
                border: 'none', cursor: 'pointer', position: 'relative',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: F.display, fontSize: 18, fontWeight: 700,
                color: active ? C.ink : C.bone,
              }}>
                {n}
                {hasEvent && !active && <span style={{ position: 'absolute', bottom: 8, width: 4, height: 4, borderRadius: 2, background: C.gold }}/>}
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected day label */}
      <div style={{ padding: '0 24px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: 11, color: C.fog, fontWeight: 700, letterSpacing: 1.4 }}>THURSDAY · 17 APR</div>
        <div style={{ fontSize: 11, color: C.gold, fontWeight: 700 }}>3 events</div>
      </div>

      {/* Events timeline */}
      <div style={{ padding: '0 20px' }}>
        {events.map((e, i) => (
          <div key={e.id} style={{ display: 'flex', gap: 14, marginBottom: 14 }}>
            <div style={{ width: 56, flexShrink: 0, paddingTop: 14 }}>
              <div style={{ fontFamily: F.display, fontSize: e.time === 'All day' ? 12 : 18, fontWeight: 700, color: C.bone, letterSpacing: -0.3 }}>{e.time}</div>
              <div style={{ fontSize: 9, color: C.fog, fontWeight: 700, letterSpacing: 1, marginTop: 2 }}>{e.who}</div>
            </div>
            <div style={{ flex: 1, background: e.color, borderRadius: 20, padding: '16px 18px', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 12, right: 14, fontSize: 9, fontWeight: 700, letterSpacing: 1, color: '#000', opacity: 0.45, textTransform: 'uppercase' }}>{e.cat}</div>
              <div style={{ fontFamily: F.display, fontSize: 18, fontWeight: 700, color: '#1A0F0A', letterSpacing: -0.3, marginBottom: e.loc ? 3 : 0, lineHeight: 1.15, paddingRight: 40 }}>{e.title}</div>
              {e.loc && <div style={{ fontSize: 11, color: '#1A0F0A', opacity: 0.6, fontWeight: 500 }}>{e.loc}</div>}
            </div>
          </div>
        ))}
      </div>

      <div style={{ padding: '18px 24px 6px' }}>
        <div style={{ fontSize: 11, color: C.fog, fontWeight: 700, letterSpacing: 1.4 }}>TOMORROW</div>
      </div>
      <div style={{ padding: '0 20px' }}>
        <div style={{ background: C.card, borderRadius: 20, padding: '14px 18px', border: `1px solid ${C.line}`, display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: C.mintInk, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="heart" size={16} color={C.mint}/>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: F.display, fontSize: 15, fontWeight: 700, color: C.bone, letterSpacing: -0.2 }}>Anniversary · 3 yrs</div>
            <div style={{ fontSize: 11, color: C.fog, fontWeight: 500 }}>Fri 18 · All day</div>
          </div>
          <span style={{ fontSize: 10, color: C.mint, fontWeight: 800, letterSpacing: 1 }}>MILESTONE</span>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// TOGETHER HUB
// ─────────────────────────────────────────────
function TogetherScreen({ onOpenSub, remindersPlacement }) {
  const features = [
    { key: 'notes', label: 'Love notes', sub: '2 new', icon: 'heart', color: C.rose, ink: C.roseInk },
    { key: 'checkins', label: 'Check-ins', sub: 'You · good', icon: 'sun', color: C.butter, ink: C.butterInk },
    { key: 'expenses', label: 'Expenses', sub: 'Sofia owes €42', icon: 'dollarSign', color: C.mint, ink: C.mintInk },
    { key: 'wishlists', label: 'Wishlists', sub: '6 items', icon: 'gift', color: C.lavender, ink: C.lavenderInk },
    { key: 'milestones', label: 'Milestones', sub: '3 yrs Fri', icon: 'flag', color: C.peach, ink: C.peachInk },
    { key: 'plans', label: 'Plans', sub: 'Venice · 3d', icon: 'map', color: C.sky, ink: C.skyInk },
    { key: 'timetables', label: 'Timetables', sub: '4 rhythms', icon: 'calendar', color: '#F4A68C', ink: '#3A1F14' },
  ];
  if (remindersPlacement === 'us-child') {
    features.push({ key: 'reminders', label: 'Reminders', sub: '3 today', icon: 'bell', color: '#E4B24A22', ink: C.gold });
  }

  return (
    <div style={{ height: '100%', overflow: 'auto', padding: '68px 0 110px', background: C.ink }}>
      {/* Header */}
      <div style={{ padding: '0 24px 20px' }}>
        <div style={{ fontSize: 11, color: C.fog, fontWeight: 700, letterSpacing: 1.4, textTransform: 'uppercase', marginBottom: 4 }}>Day 847 together</div>
        <div style={{ fontFamily: F.display, fontSize: 48, fontWeight: 700, color: C.bone, letterSpacing: -1.4, lineHeight: 1 }}>US<span style={{ color: C.gold }}>.</span></div>
        <div style={{ width: 62, height: 3, marginTop: 8, background: `linear-gradient(90deg, ${C.gold}, transparent)`, borderRadius: 2 }}/>
      </div>

      {/* Paired couple card */}
      <div style={{ padding: '0 20px', marginBottom: 22 }}>
        <div style={{ background: C.rose, borderRadius: 28, padding: '24px 22px', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(ellipse at 80% 20%, rgba(255,255,255,0.35), transparent 50%)` }}/>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18 }}>
            <div style={{ display: 'flex' }}>
              <div style={{ width: 44, height: 44, borderRadius: 22, background: C.peach, border: `3px solid ${C.rose}`, fontFamily: F.display, fontWeight: 700, color: C.peachInk, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>M</div>
              <div style={{ width: 44, height: 44, borderRadius: 22, background: C.butter, border: `3px solid ${C.rose}`, fontFamily: F.display, fontWeight: 700, color: C.butterInk, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, marginLeft: -14 }}>S</div>
            </div>
            <div>
              <div style={{ fontSize: 10, color: C.roseInk, fontWeight: 800, letterSpacing: 1.2, opacity: 0.55 }}>MATTIA & SOFIA</div>
              <div style={{ fontFamily: F.display, fontSize: 14, fontWeight: 700, color: C.roseInk, marginTop: 1 }}>since 18 Apr 2023</div>
            </div>
          </div>
          <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', gap: 12 }}>
            {[{n:'847', l:'DAYS'}, {n:'124', l:'NOTES'}, {n:'€1.2k', l:'SHARED'}, {n:'12', l:'PLANS'}].map(s => (
              <div key={s.l}>
                <div style={{ fontFamily: F.display, fontSize: 22, fontWeight: 700, color: C.roseInk, letterSpacing: -0.5, lineHeight: 1 }}>{s.n}</div>
                <div style={{ fontSize: 8.5, color: C.roseInk, fontWeight: 700, letterSpacing: 1.2, opacity: 0.55, marginTop: 3 }}>{s.l}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Features grid */}
      <div style={{ padding: '0 20px' }}>
        <div style={{ fontSize: 11, color: C.fog, fontWeight: 700, letterSpacing: 1.4, marginBottom: 12 }}>OUR SHARED SPACES</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {features.map(f => (
            <button key={f.key} onClick={() => onOpenSub(f.key)} style={{
              background: f.color, borderRadius: 22, padding: '18px 16px 16px',
              border: 'none', cursor: 'pointer', textAlign: 'left',
              display: 'flex', flexDirection: 'column', gap: 28, minHeight: 124, position: 'relative', overflow: 'hidden',
            }}>
              <div style={{ width: 36, height: 36, borderRadius: 12, background: 'rgba(0,0,0,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name={f.icon} size={18} color={f.ink}/>
              </div>
              <div>
                <div style={{ fontFamily: F.display, fontSize: 18, fontWeight: 700, color: f.ink, letterSpacing: -0.4, lineHeight: 1.1 }}>{f.label}</div>
                <div style={{ fontSize: 11, color: f.ink, opacity: 0.6, fontWeight: 600, marginTop: 3 }}>{f.sub}</div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// LOVE NOTES
// ─────────────────────────────────────────────
function LoveNotesScreen({ onBack, onCreate }) {
  const notes = [
    { from: 'sofia', text: 'Morning sunshine. Coffee\'s on, your socks are in the dryer. I love our Thursdays.', time: '7:14 AM', fresh: true },
    { from: 'me', text: 'Thinking about Venice already. Book the gondola that passes your favorite window?', time: 'Wed · 11:30 PM', fresh: false },
    { from: 'sofia', text: 'The way you sang along to Caetano last night. Record that voice of yours. I\'m keeping it.', time: 'Wed · 10:12 PM', fresh: false },
    { from: 'me', text: 'Lunch was so good. Thank you for remembering I hate cilantro.', time: 'Tue · 1:47 PM', fresh: false },
  ];
  return (
    <div style={{ height: '100%', overflow: 'auto', padding: '68px 0 110px', background: C.ink }}>
      <div style={{ padding: '0 20px 18px', display: 'flex', alignItems: 'center', gap: 14 }}>
        <button onClick={onBack} style={{ width: 38, height: 38, borderRadius: 19, background: C.card, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="chevronLeft" size={18} color={C.bone}/>
        </button>
        <div>
          <div style={{ fontSize: 10, color: C.fog, fontWeight: 700, letterSpacing: 1.2 }}>US · NOTES</div>
          <div style={{ fontFamily: F.display, fontSize: 24, fontWeight: 700, color: C.bone, letterSpacing: -0.6, lineHeight: 1 }}>Love notes</div>
        </div>
      </div>

      <div style={{ padding: '0 20px 18px' }}>
        <div style={{ background: C.rose, borderRadius: 24, padding: '22px 22px 20px', position: 'relative' }}>
          <div style={{ fontSize: 10, color: C.roseInk, fontWeight: 800, letterSpacing: 1.4, opacity: 0.55, marginBottom: 10 }}>FROM SOFIA · 7:14 AM</div>
          <div style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic', fontSize: 19, fontWeight: 400, color: C.roseInk, lineHeight: 1.35, letterSpacing: -0.2 }}>
            "Morning sunshine. Coffee's on, your socks are in the dryer. I love our Thursdays."
          </div>
          <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
            <button style={{ padding: '7px 14px', borderRadius: 999, background: 'rgba(0,0,0,0.14)', border: 'none', color: C.roseInk, fontSize: 11, fontWeight: 700, letterSpacing: 0.8, cursor: 'pointer' }}>♥ REACT</button>
            <button style={{ padding: '7px 14px', borderRadius: 999, background: 'rgba(0,0,0,0.14)', border: 'none', color: C.roseInk, fontSize: 11, fontWeight: 700, letterSpacing: 0.8, cursor: 'pointer' }}>REPLY</button>
          </div>
        </div>
      </div>

      <div style={{ padding: '0 24px 10px', fontSize: 11, color: C.fog, fontWeight: 700, letterSpacing: 1.4 }}>EARLIER</div>
      <div style={{ padding: '0 20px' }}>
        {notes.slice(1).map((n, i) => (
          <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 10, justifyContent: n.from === 'me' ? 'flex-end' : 'flex-start' }}>
            <div style={{
              maxWidth: '80%', padding: '12px 16px', borderRadius: 18,
              background: n.from === 'me' ? C.butterInk : C.card,
              border: n.from === 'me' ? 'none' : `1px solid ${C.line}`,
              borderBottomRightRadius: n.from === 'me' ? 6 : 18,
              borderBottomLeftRadius: n.from === 'me' ? 18 : 6,
            }}>
              <div style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic', fontSize: 14, color: n.from === 'me' ? C.butter : C.bone, lineHeight: 1.4 }}>{n.text}</div>
              <div style={{ fontSize: 9, color: C.fog, fontWeight: 700, letterSpacing: 0.8, marginTop: 6 }}>{n.time}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// CHECK-INS
// ─────────────────────────────────────────────
function CheckinsScreen({ onBack, onCreate }) {
  const moods = ['sun','cloud','minus','cloudRain','zap'];
  const week = [
    { day: 'MON', me: 0, them: 1 },
    { day: 'TUE', me: 1, them: 0 },
    { day: 'WED', me: 1, them: 1 },
    { day: 'THU', me: 0, them: 1 },
    { day: 'FRI', me: null, them: null },
    { day: 'SAT', me: null, them: null },
    { day: 'SUN', me: null, them: null },
  ];
  return (
    <div style={{ height: '100%', overflow: 'auto', padding: '68px 0 110px', background: C.ink }}>
      <div style={{ padding: '0 20px 18px', display: 'flex', alignItems: 'center', gap: 14 }}>
        <button onClick={onBack} style={{ width: 38, height: 38, borderRadius: 19, background: C.card, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="chevronLeft" size={18} color={C.bone}/>
        </button>
        <div>
          <div style={{ fontSize: 10, color: C.fog, fontWeight: 700, letterSpacing: 1.2 }}>US · CHECK-INS</div>
          <div style={{ fontFamily: F.display, fontSize: 24, fontWeight: 700, color: C.bone, letterSpacing: -0.6, lineHeight: 1 }}>How we are</div>
        </div>
      </div>

      <div style={{ padding: '0 20px 18px' }}>
        <div style={{ background: C.butter, borderRadius: 24, padding: '20px 22px' }}>
          <div style={{ fontSize: 10, color: C.butterInk, fontWeight: 800, letterSpacing: 1.2, opacity: 0.55, marginBottom: 6 }}>THIS WEEK · IN SYNC</div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, marginBottom: 10 }}>
            <div style={{ fontFamily: F.display, fontSize: 54, fontWeight: 700, color: C.butterInk, lineHeight: 0.85, letterSpacing: -2 }}>86<span style={{ fontSize: 28 }}>%</span></div>
            <div style={{ flex: 1, marginBottom: 8, fontSize: 12, color: C.butterInk, opacity: 0.6, fontWeight: 600, lineHeight: 1.3 }}>4 of 4 days you've both checked in — a streak.</div>
          </div>
          <div style={{ display: 'flex', gap: 4, height: 6, background: 'rgba(0,0,0,0.12)', borderRadius: 3, overflow: 'hidden' }}>
            <div style={{ width: '86%', background: C.butterInk, borderRadius: 3 }}/>
          </div>
        </div>
      </div>

      <div style={{ padding: '0 24px 12px', fontSize: 11, color: C.fog, fontWeight: 700, letterSpacing: 1.4 }}>THIS WEEK</div>

      <div style={{ padding: '0 20px 22px' }}>
        <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 22, padding: 18 }}>
          <div style={{ display: 'flex', gap: 14, marginBottom: 12, fontSize: 10, color: C.fog, fontWeight: 700, letterSpacing: 1 }}>
            <span style={{ width: 14, height: 14, borderRadius: 7, background: C.peach, display: 'inline-block' }}/>YOU
            <span style={{ width: 14, height: 14, borderRadius: 7, background: C.lavender, marginLeft: 8, display: 'inline-block' }}/>SOFIA
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            {week.map(d => (
              <div key={d.day} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <div style={{ fontSize: 9, color: C.fog, fontWeight: 700, letterSpacing: 0.8, marginBottom: 4 }}>{d.day}</div>
                <div style={{ width: 26, height: 26, borderRadius: 13, background: d.me !== null ? C.peach : 'transparent', border: d.me === null ? `1.5px dashed ${C.line}` : 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {d.me !== null && <Icon name={moods[d.me]} size={12} color={C.peachInk} strokeWidth={2.5}/>}
                </div>
                <div style={{ width: 26, height: 26, borderRadius: 13, background: d.them !== null ? C.lavender : 'transparent', border: d.them === null ? `1.5px dashed ${C.line}` : 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {d.them !== null && <Icon name={moods[d.them]} size={12} color={C.lavenderInk} strokeWidth={2.5}/>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ padding: '0 24px 10px', fontSize: 11, color: C.fog, fontWeight: 700, letterSpacing: 1.4 }}>TODAY · NOT CHECKED IN YET</div>
      <div style={{ padding: '0 20px' }}>
        <button style={{ width: '100%', background: C.gold, border: 'none', borderRadius: 18, padding: '16px 18px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontFamily: F.display }}>
          <span style={{ color: C.ink, fontSize: 15, fontWeight: 700, letterSpacing: -0.2 }}>Share how today feels</span>
          <Icon name="arrowRight" size={18} color={C.ink} strokeWidth={2.5}/>
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// EXPENSES
// ─────────────────────────────────────────────
function ExpensesScreen({ onBack, onCreate }) {
  const items = [
    { t: 'Groceries · Coop', amt: 64.50, by: 'mattia', split: '50/50', day: 'TODAY', cat: 'food' },
    { t: 'Airbnb deposit · Venice', amt: 240.00, by: 'sofia', split: '50/50', day: 'WED', cat: 'travel' },
    { t: 'Date night — Osteria', amt: 78.00, by: 'mattia', split: '50/50', day: 'TUE', cat: 'date' },
    { t: 'Electric bill', amt: 142.00, by: 'sofia', split: '50/50', day: 'MON', cat: 'home' },
  ];
  return (
    <div style={{ height: '100%', overflow: 'auto', padding: '68px 0 110px', background: C.ink }}>
      <div style={{ padding: '0 20px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <button onClick={onBack} style={{ width: 38, height: 38, borderRadius: 19, background: C.card, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="chevronLeft" size={18} color={C.bone}/>
          </button>
          <div>
            <div style={{ fontSize: 10, color: C.fog, fontWeight: 700, letterSpacing: 1.2 }}>US · EXPENSES</div>
            <div style={{ fontFamily: F.display, fontSize: 24, fontWeight: 700, color: C.bone, letterSpacing: -0.6, lineHeight: 1 }}>Shared</div>
          </div>
        </div>
        <button style={{ width: 38, height: 38, borderRadius: 19, background: C.gold, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="plus" size={18} color={C.ink} strokeWidth={2.5}/>
        </button>
      </div>

      <div style={{ padding: '0 20px 18px' }}>
        <div style={{ background: C.mint, borderRadius: 26, padding: '22px 22px 20px' }}>
          <div style={{ fontSize: 10, color: C.mintInk, fontWeight: 800, letterSpacing: 1.4, opacity: 0.55, marginBottom: 6 }}>SOFIA OWES YOU</div>
          <div style={{ fontFamily: F.display, fontSize: 56, fontWeight: 700, color: C.mintInk, lineHeight: 0.9, letterSpacing: -2.5 }}>
            €42<span style={{ fontSize: 28, opacity: 0.6 }}>.25</span>
          </div>
          <div style={{ marginTop: 14, display: 'flex', justifyContent: 'space-between', fontSize: 11, color: C.mintInk, fontWeight: 600, opacity: 0.7 }}>
            <span>This month · €524 total</span>
            <span style={{ fontWeight: 800, letterSpacing: 0.8 }}>SETTLE →</span>
          </div>
          <div style={{ marginTop: 12, height: 6, background: 'rgba(0,0,0,0.12)', borderRadius: 3, overflow: 'hidden', display: 'flex' }}>
            <div style={{ width: '58%', background: C.mintInk }}/>
            <div style={{ width: '42%', background: 'rgba(15,44,26,0.45)' }}/>
          </div>
          <div style={{ marginTop: 8, display: 'flex', justifyContent: 'space-between', fontSize: 10, color: C.mintInk, opacity: 0.6, fontWeight: 700, letterSpacing: 0.8 }}>
            <span>YOU · €305</span><span>SOFIA · €219</span>
          </div>
        </div>
      </div>

      <div style={{ padding: '0 24px 10px', fontSize: 11, color: C.fog, fontWeight: 700, letterSpacing: 1.4 }}>RECENT</div>
      <div style={{ padding: '0 20px' }}>
        {items.map((x, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', background: C.card, borderRadius: 18, border: `1px solid ${C.line}`, marginBottom: 8 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: C.mintInk, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="dollarSign" size={16} color={C.mint}/>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: F.display, fontSize: 14, fontWeight: 700, color: C.bone, letterSpacing: -0.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{x.t}</div>
              <div style={{ fontSize: 10, color: C.fog, fontWeight: 600, marginTop: 2, letterSpacing: 0.5, textTransform: 'uppercase' }}>{x.day} · {x.by} paid · {x.split}</div>
            </div>
            <div style={{ fontFamily: F.display, fontSize: 16, fontWeight: 700, color: C.bone, letterSpacing: -0.3 }}>€{x.amt.toFixed(2)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// WISHLISTS
// ─────────────────────────────────────────────
function WishlistsScreen({ onBack, onCreate }) {
  const items = [
    { t: 'Linen throw · oatmeal', price: '€80', who: 'sofia', tag: 'HOME', claimed: false },
    { t: 'Analog film · Portra 400', price: '€18 × 5', who: 'mattia', tag: 'HOBBY', claimed: true },
    { t: 'Pasta maker', price: '€160', who: 'both', tag: 'KITCHEN', claimed: false },
    { t: 'Weekend in Puglia', price: '€680', who: 'both', tag: 'TRAVEL', claimed: false },
    { t: 'Concert · Caetano Veloso', price: '€95', who: 'sofia', tag: 'DATE', claimed: false },
  ];
  return (
    <div style={{ height: '100%', overflow: 'auto', padding: '68px 0 110px', background: C.ink }}>
      <div style={{ padding: '0 20px 18px', display: 'flex', alignItems: 'center', gap: 14 }}>
        <button onClick={onBack} style={{ width: 38, height: 38, borderRadius: 19, background: C.card, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="chevronLeft" size={18} color={C.bone}/>
        </button>
        <div>
          <div style={{ fontSize: 10, color: C.fog, fontWeight: 700, letterSpacing: 1.2 }}>US · WISHLISTS</div>
          <div style={{ fontFamily: F.display, fontSize: 24, fontWeight: 700, color: C.bone, letterSpacing: -0.6, lineHeight: 1 }}>Drop hints</div>
        </div>
      </div>

      <div style={{ padding: '0 20px 18px' }}>
        <div style={{ background: C.lavender, borderRadius: 24, padding: '20px 22px' }}>
          <div style={{ fontSize: 10, color: C.lavenderInk, fontWeight: 800, letterSpacing: 1.2, opacity: 0.55, marginBottom: 6 }}>ON YOUR LISTS</div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 20 }}>
            <div><div style={{ fontFamily: F.display, fontSize: 44, fontWeight: 700, color: C.lavenderInk, lineHeight: 1, letterSpacing: -1.5 }}>14</div><div style={{ fontSize: 9, color: C.lavenderInk, opacity: 0.55, fontWeight: 800, letterSpacing: 1, marginTop: 4 }}>ITEMS</div></div>
            <div><div style={{ fontFamily: F.display, fontSize: 44, fontWeight: 700, color: C.lavenderInk, lineHeight: 1, letterSpacing: -1.5 }}>3</div><div style={{ fontSize: 9, color: C.lavenderInk, opacity: 0.55, fontWeight: 800, letterSpacing: 1, marginTop: 4 }}>CLAIMED</div></div>
            <div><div style={{ fontFamily: F.display, fontSize: 44, fontWeight: 700, color: C.lavenderInk, lineHeight: 1, letterSpacing: -1.5 }}>€1.4k</div><div style={{ fontSize: 9, color: C.lavenderInk, opacity: 0.55, fontWeight: 800, letterSpacing: 1, marginTop: 4 }}>WORTH</div></div>
          </div>
        </div>
      </div>

      <div style={{ padding: '0 24px 10px', display: 'flex', gap: 6, overflowX: 'auto' }}>
        {['ALL','SOFIA\'S','MINE','SHARED','CLAIMED'].map((t, i) => (
          <button key={t} style={{
            padding: '7px 14px', borderRadius: 999, border: 'none',
            background: i === 0 ? C.goldSoft : C.card,
            color: i === 0 ? C.gold : C.mist, fontSize: 10, fontWeight: 700, letterSpacing: 1, cursor: 'pointer', flexShrink: 0,
          }}>{t}</button>
        ))}
      </div>

      <div style={{ padding: '12px 20px 0' }}>
        {items.map((it, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', background: C.card, borderRadius: 18, border: `1px solid ${C.line}`, marginBottom: 8, opacity: it.claimed ? 0.5 : 1 }}>
            <div style={{ width: 42, height: 42, borderRadius: 12, background: C.lavenderInk, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="gift" size={16} color={C.lavender}/>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: F.display, fontSize: 14, fontWeight: 700, color: C.bone, letterSpacing: -0.2, textDecoration: it.claimed ? 'line-through' : 'none' }}>{it.t}</div>
              <div style={{ fontSize: 10, color: C.fog, fontWeight: 600, marginTop: 3, letterSpacing: 0.8, textTransform: 'uppercase' }}>
                {it.who === 'both' ? 'SHARED' : it.who} · {it.tag}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontFamily: F.display, fontSize: 14, fontWeight: 700, color: C.bone }}>{it.price}</div>
              {it.claimed && <div style={{ fontSize: 9, color: C.mint, fontWeight: 800, letterSpacing: 1, marginTop: 2 }}>CLAIMED</div>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// MILESTONES
// ─────────────────────────────────────────────
function MilestonesScreen({ onBack, onCreate }) {
  const stones = [
    { y: '2026', m: 'APR 18', t: '3 years', sub: 'Anniversary', color: C.peach, ink: C.peachInk, fut: true },
    { y: '2025', m: 'DEC 24', t: 'First Christmas alone', sub: 'Gnocchi. Candles. Just us.', color: C.rose, ink: C.roseInk, fut: false },
    { y: '2025', m: 'AUG 12', t: 'Moved in — Ostiense', sub: 'The green door. The cat followed.', color: C.mint, ink: C.mintInk, fut: false },
    { y: '2024', m: 'MAY 03', t: 'First trip · Puglia', sub: 'Got lost finding orecchiette.', color: C.sky, ink: C.skyInk, fut: false },
    { y: '2023', m: 'APR 18', t: 'First date', sub: 'You wore the red scarf.', color: C.butter, ink: C.butterInk, fut: false },
  ];
  return (
    <div style={{ height: '100%', overflow: 'auto', padding: '68px 0 110px', background: C.ink }}>
      <div style={{ padding: '0 20px 18px', display: 'flex', alignItems: 'center', gap: 14 }}>
        <button onClick={onBack} style={{ width: 38, height: 38, borderRadius: 19, background: C.card, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="chevronLeft" size={18} color={C.bone}/>
        </button>
        <div>
          <div style={{ fontSize: 10, color: C.fog, fontWeight: 700, letterSpacing: 1.2 }}>US · MILESTONES</div>
          <div style={{ fontFamily: F.display, fontSize: 24, fontWeight: 700, color: C.bone, letterSpacing: -0.6, lineHeight: 1 }}>Moments</div>
        </div>
      </div>

      <div style={{ padding: '0 20px 22px' }}>
        <div style={{ background: C.peach, borderRadius: 26, padding: '22px 22px', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: -10, right: -10, fontFamily: F.display, fontSize: 140, fontWeight: 800, color: 'rgba(0,0,0,0.06)', lineHeight: 0.9, letterSpacing: -4 }}>3</div>
          <div style={{ position: 'relative' }}>
            <div style={{ fontSize: 10, color: C.peachInk, fontWeight: 800, letterSpacing: 1.4, opacity: 0.55, marginBottom: 8 }}>NEXT · IN 1 DAY</div>
            <div style={{ fontFamily: F.display, fontSize: 32, fontWeight: 700, color: C.peachInk, letterSpacing: -1, lineHeight: 1 }}>Three<br/>years.</div>
            <div style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic', fontSize: 13, color: C.peachInk, opacity: 0.7, marginTop: 10, maxWidth: 240 }}>
              "And somehow, it still feels like the first week." — Sofia, journal
            </div>
          </div>
        </div>
      </div>

      <div style={{ padding: '0 20px' }}>
        {stones.map((s, i) => (
          <div key={i} style={{ display: 'flex', gap: 14, marginBottom: 12, opacity: 1 }}>
            <div style={{ width: 50, flexShrink: 0, textAlign: 'right', paddingTop: 16 }}>
              <div style={{ fontFamily: F.display, fontSize: 18, fontWeight: 700, color: C.bone, letterSpacing: -0.4, lineHeight: 1 }}>{s.y}</div>
              <div style={{ fontSize: 9, color: C.fog, fontWeight: 700, letterSpacing: 1, marginTop: 3 }}>{s.m}</div>
            </div>
            <div style={{ flex: 1, background: s.color, borderRadius: 18, padding: '14px 18px', opacity: s.fut ? 0.55 : 1, border: s.fut ? `1.5px dashed rgba(0,0,0,0.3)` : 'none' }}>
              <div style={{ fontFamily: F.display, fontSize: 17, fontWeight: 700, color: s.ink, letterSpacing: -0.3, lineHeight: 1.1 }}>{s.t}</div>
              <div style={{ fontSize: 11, color: s.ink, opacity: 0.65, fontWeight: 500, marginTop: 3 }}>{s.sub}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// PLANS
// ─────────────────────────────────────────────
function PlansScreen({ onBack, onCreate }) {
  const plans = [
    { t: 'Venice weekend', sub: '3 days · this Fri', color: C.sky, ink: C.skyInk, prog: 0.8, tag: 'SOON', items: '12 tasks · 8 done', bucket: 'This month', icon: 'mapPin' },
    { t: 'Summer road trip', sub: 'Aug · Amalfi → Sicily', color: C.peach, ink: C.peachInk, prog: 0.35, tag: 'AUG', items: '18 tasks · 6 done', bucket: 'This month', icon: 'compass' },
    { t: 'Learn to make fresh pasta', sub: 'weekends', color: C.butter, ink: C.butterInk, prog: 0.5, tag: 'ONGOING', items: '6 tasks · 3 done', bucket: 'Ongoing', icon: 'coffee' },
    { t: 'Sofia’s birthday surprise', sub: 'Sep 14', color: C.rose, ink: C.roseInk, prog: 0.15, tag: 'SEP', items: '9 tasks · 1 done', bucket: 'Later this year', icon: 'gift' },
    { t: 'Buy the apartment', sub: 'target: late 2026', color: C.mint, ink: C.mintInk, prog: 0.25, tag: '8 MONTHS', items: '23 tasks · 5 done', bucket: 'Later this year', icon: 'home' },
    { t: 'Vow renewal · 5 yrs', sub: 'April 2028', color: C.lavender, ink: C.lavenderInk, prog: 0.05, tag: 'DREAMY', items: '0 tasks · 0 done', bucket: 'Someday', icon: 'star' },
    { t: 'Year-long sabbatical', sub: '2029', color: C.sky, ink: C.skyInk, prog: 0.02, tag: 'BIG', items: 'Idea stage', bucket: 'Someday', icon: 'compass' },
  ];

  const totalTasks = plans.reduce((a, p) => {
    const m = /(\d+) tasks/.exec(p.items); return a + (m ? parseInt(m[1]) : 0);
  }, 0);
  const totalDone = plans.reduce((a, p) => {
    const m = /(\d+) done/.exec(p.items); return a + (m ? parseInt(m[1]) : 0);
  }, 0);
  const avgProg = plans.reduce((a, p) => a + p.prog, 0) / plans.length;

  const bucketOrder = ['This month', 'Ongoing', 'Later this year', 'Someday'];
  const bucketColor = {
    'This month': C.peach, Ongoing: C.butter, 'Later this year': C.mint, Someday: C.lavender,
  };

  const renderPlan = (p) => (
    <div key={p.t} style={{ background: p.color, borderRadius: 24, padding: '20px 22px', position: 'relative', overflow: 'hidden' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: 9, color: p.ink, fontWeight: 800, letterSpacing: 1.4, opacity: 0.55, marginBottom: 4 }}>{p.tag}</div>
          <div style={{ fontFamily: F.display, fontSize: 22, fontWeight: 700, color: p.ink, letterSpacing: -0.6, lineHeight: 1.05 }}>{p.t}</div>
          <div style={{ fontSize: 11, color: p.ink, opacity: 0.65, fontWeight: 500, marginTop: 3 }}>{p.sub}</div>
        </div>
        <div style={{ width: 38, height: 38, borderRadius: 12, background: 'rgba(0,0,0,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Icon name={p.icon} size={18} color={p.ink} strokeWidth={2}/>
        </div>
      </div>
      <div style={{ height: 5, background: 'rgba(0,0,0,0.12)', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ width: `${p.prog*100}%`, height: '100%', background: p.ink, borderRadius: 3 }}/>
      </div>
      <div style={{ marginTop: 8, display: 'flex', justifyContent: 'space-between', fontSize: 10, color: p.ink, fontWeight: 800, letterSpacing: 1, opacity: 0.65 }}>
        <span>{p.items}</span><span>{Math.round(p.prog*100)}%</span>
      </div>
    </div>
  );

  const sections = bucketOrder
    .map(b => ({ label: b.toUpperCase(), color: bucketColor[b], items: plans.filter(p => p.bucket === b) }))
    .filter(s => s.items.length);

  return (
    <div style={{ height: '100%', overflow: 'auto', padding: '68px 0 110px', background: C.ink }}>
      <SubScreenHeader eyebrow="Us · Plans" title="Dream & do" accent={C.sky} onBack={onBack} onAdd={() => {}}/>

      {/* Stats hero — matches other screens' pastel summary card */}
      <div style={{ padding: '0 20px 16px' }}>
        <BlockCard bg={C.sky} ink={C.skyInk} style={{ padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <Overline color="rgba(14,34,48,0.7)">Things we’re building</Overline>
              <div style={{ marginTop: 8, display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <Display size={54} color={C.skyInk}>{plans.length}</Display>
                <span style={{ fontSize: 14, fontWeight: 600, color: 'rgba(14,34,48,0.6)' }}>plans</span>
              </div>
              <div style={{ fontSize: 12, color: 'rgba(14,34,48,0.7)', marginTop: 6, fontWeight: 500 }}>
                {totalDone} of {totalTasks} tasks done · {Math.round(avgProg*100)}% avg progress
              </div>
            </div>
            <IconTile icon="compass" bg="rgba(14,34,48,0.15)" color={C.skyInk} size={44} radius={14} iconSize={20}/>
          </div>
          <div style={{ marginTop: 16, height: 6, background: 'rgba(14,34,48,0.15)', borderRadius: 3, overflow: 'hidden' }}>
            <div style={{ width: `${avgProg*100}%`, height: '100%', background: C.skyInk, borderRadius: 3 }}/>
          </div>
          <div style={{ marginTop: 8, display: 'flex', justifyContent: 'space-between', fontSize: 10, fontWeight: 700, letterSpacing: 0.5, color: 'rgba(14,34,48,0.75)' }}>
            <span>SOON 2</span><span>ONGOING 1</span><span>LATER 2</span><span>SOMEDAY 2</span>
          </div>
        </BlockCard>
      </div>

      {/* Date-sectioned plans */}
      <div style={{ padding: '0 20px' }}>
        <DateSectioned sections={sections} maxOpen={3} renderItem={renderPlan}/>
      </div>
    </div>
  );
}

Object.assign(window, { CalendarScreen, TogetherScreen, LoveNotesScreen, CheckinsScreen, ExpensesScreen, WishlistsScreen, MilestonesScreen, PlansScreen });
})();
