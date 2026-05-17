(() => {
// Home Dashboard screen for Coupl
const { coupl: C, fonts: F, Icon, CouplRings, Avatar, Overline, Display, BlockCard, DarkCard,
  Pill, Badge, IconTile, PrimaryButton, RoundBtn, ProgressRing, TripleRing,
  SectionHeader, GoldRule, WavyUnderline } = window;

function MoodChip({ icon, color, bg, label, selected, onClick }) {
  return (
    <button onClick={onClick} style={{
      width: 46, height: 46, borderRadius: 23,
      background: selected ? bg : 'transparent',
      border: selected ? 'none' : `1px solid ${C.line}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      cursor: 'pointer', transition: 'all 0.2s',
      transform: selected ? 'scale(1.05)' : 'scale(1)',
    }} title={label}>
      <Icon name={icon} size={18} color={selected ? color : C.fog}/>
    </button>
  );
}

function WeekDay({ name, num, selected, isToday, onClick }) {
  return (
    <button onClick={onClick} style={{
      flex: 1, padding: '10px 0', borderRadius: 14,
      background: selected ? C.gold : 'transparent',
      border: 'none', cursor: 'pointer',
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
    }}>
      <div style={{
        fontSize: 9, fontWeight: 700, letterSpacing: 1,
        color: selected ? C.peachInk : C.fog, textTransform: 'uppercase',
      }}>{name}</div>
      <div style={{
        fontFamily: F.display, fontSize: 18, fontWeight: 700,
        color: selected ? C.peachInk : (isToday ? C.gold : C.bone),
      }}>{num}</div>
      {isToday && !selected && (
        <div style={{ width: 4, height: 4, borderRadius: 2, background: C.gold }}/>
      )}
    </button>
  );
}

function HomeScreen({ mood, setMood, selectedDay, setSelectedDay, partnerMood, onOpenProfile, remindersPlacement, onOpenReminders, nativeHeader }) {
  const moods = [
    { key: 'great', icon: 'sun', color: C.mint, bg: 'rgba(168,216,185,0.18)' },
    { key: 'good', icon: 'cloud', color: C.sky, bg: 'rgba(159,196,220,0.18)' },
    { key: 'okay', icon: 'minus', color: C.butter, bg: 'rgba(242,216,106,0.18)' },
    { key: 'low', icon: 'drizzle', color: C.rose, bg: 'rgba(216,155,168,0.18)' },
    { key: 'rough', icon: 'zap', color: C.peach, bg: 'rgba(244,166,140,0.18)' },
  ];
  const week = [
    { n: 'MON', d: 14, isToday: false },
    { n: 'TUE', d: 15, isToday: false },
    { n: 'WED', d: 16, isToday: false },
    { n: 'THU', d: 17, isToday: true },
    { n: 'FRI', d: 18, isToday: false },
    { n: 'SAT', d: 19, isToday: false },
    { n: 'SUN', d: 20, isToday: false },
  ];
  const selectedMood = moods.find(m => m.key === mood);

  return (
    <div style={{ padding: nativeHeader ? '0 18px 110px' : '70px 18px 110px', background: C.ink, minHeight: '100%' }}>
      {nativeHeader ? (
        <window.NativeHeader
          title="Mattia"
          eyebrow="Good morning"
          chip={<><div style={{ width: 5, height: 5, borderRadius: 3, background: C.mint }}/> THU · 17 APR · DAY 847</>}
          right={
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <window.HeaderBtn icon="bell"/>
              <button onClick={onOpenProfile} style={{ display: 'flex', marginLeft: -2, background: 'transparent', border: 'none', padding: 0, cursor: 'pointer' }}>
                <Avatar letter="M" size={32} bg={C.peach} color={C.peachInk}/>
                <Avatar letter="S" size={32} bg={C.lavender} color={C.lavenderInk} style={{ marginLeft: -10, border: `2px solid ${C.ink}` }}/>
              </button>
            </div>
          }
        />
      ) : (
        <>
          {/* Greeting */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
            <div>
              <Overline style={{ marginBottom: 6 }}>Good morning</Overline>
              <Display size={38}>MATTIA<span style={{ color: C.gold }}>.</span></Display>
              <div style={{ marginTop: 4 }}><WavyUnderline width={110}/></div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <RoundBtn icon="bell" size={40}/>
              <button onClick={onOpenProfile} style={{ display: 'flex', marginLeft: -4, background: 'transparent', border: 'none', padding: 0, cursor: 'pointer' }}>
                <Avatar letter="M" size={36} bg={C.peach} color={C.peachInk}/>
                <Avatar letter="S" size={36} bg={C.lavender} color={C.lavenderInk}
                  style={{ marginLeft: -12, border: `2px solid ${C.ink}` }}/>
              </button>
            </div>
          </div>

          {/* Date pill */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8,
            background: C.card, border: `1px solid ${C.line}`, borderRadius: 999,
            padding: '6px 12px', marginBottom: 18,
          }}>
            <div style={{ width: 5, height: 5, borderRadius: 3, background: C.mint }}/>
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.2, color: C.mist, textTransform: 'uppercase' }}>
              THU · 17 APR · DAY 847 TOGETHER
            </span>
          </div>
        </>
      )}

      {/* HERO — Today's Rings */}
      <BlockCard bg={C.peach} ink={C.peachInk} style={{ marginBottom: 14, padding: 22 }}>
        <div style={{ position: 'absolute', top: 12, right: 12 }}>
          <Badge bg="rgba(58,31,20,0.15)" color={C.peachInk}>
            <Icon name="trendingUp" size={10} color={C.peachInk} strokeWidth={2.5}/>+12% WK
          </Badge>
        </div>
        <Overline color="rgba(58,31,20,0.65)">Today's rings</Overline>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginTop: 10 }}>
          <div style={{ position: 'relative' }}>
            <TripleRing size={108} values={[0.82, 0.68, 0.95]}
              colors={[C.peachInk, C.gold, C.lavender]}
              bg="rgba(58,31,20,0.15)"/>
            <div style={{ position: 'absolute', inset: 0, display: 'flex',
              alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
              <div style={{ fontFamily: F.display, fontSize: 26, fontWeight: 800, color: C.peachInk, lineHeight: 1 }}>82<span style={{fontSize:16}}>%</span></div>
            </div>
          </div>
          <div style={{ flex: 1 }}>
            <Display size={28} color={C.peachInk}>CRUSH IT</Display>
            <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { lbl: 'CONNECT', v: '3/4', dot: C.peachInk },
                { lbl: 'SHARED', v: '7/10', dot: C.gold },
                { lbl: 'PRESENT', v: '9/9', dot: C.lavender },
              ].map(r => (
                <div key={r.lbl} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, fontWeight: 700, letterSpacing: 0.6 }}>
                  <div style={{ width: 7, height: 7, borderRadius: 4, background: r.dot }}/>
                  <span style={{ flex: 1, color: 'rgba(58,31,20,0.85)' }}>{r.lbl}</span>
                  <span style={{ fontFamily: F.display, fontWeight: 700, color: C.peachInk }}>{r.v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </BlockCard>

      {/* Mood row */}
      <DarkCard style={{ marginBottom: 14, padding: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <Overline>How are you today?</Overline>
          {partnerMood && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Avatar letter="S" size={18} bg={C.lavender} color={C.lavenderInk}/>
              <span style={{ fontSize: 10, color: C.mist, letterSpacing: 0.6, fontWeight: 600, textTransform: 'uppercase' }}>
                {partnerMood}
              </span>
            </div>
          )}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 6 }}>
          {moods.map(m => (
            <MoodChip key={m.key} {...m}
              selected={mood === m.key}
              onClick={() => setMood(m.key === mood ? null : m.key)}/>
          ))}
        </div>
        {selectedMood && (
          <div style={{ marginTop: 12, padding: '10px 12px', borderRadius: 12,
            background: selectedMood.bg, display: 'flex', alignItems: 'center', gap: 10 }}>
            <Icon name={selectedMood.icon} size={14} color={selectedMood.color}/>
            <span style={{ fontSize: 12, color: C.bone, fontWeight: 500 }}>
              Logged — <span style={{ color: selectedMood.color, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>{selectedMood.key}</span>
            </span>
          </div>
        )}
      </DarkCard>

      {/* Reminders entry (when placement is home-child) */}
      {remindersPlacement === 'home-child' && (
        <button onClick={onOpenReminders} style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 12,
          background: C.card, border: `1px solid ${C.line}`, borderRadius: 18,
          padding: '14px 14px', marginBottom: 14, cursor: 'pointer', textAlign: 'left',
        }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: C.goldSoft, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Icon name="bell" size={18} color={C.gold}/>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: F.display, fontSize: 14, fontWeight: 600, color: C.bone }}>Reminders</div>
            <div style={{ fontSize: 11, color: C.fog, marginTop: 2 }}>3 today · next in 2h · Sofia's birthday Fri</div>
          </div>
          <Icon name="chevronRight" size={16} color={C.fog}/>
        </button>
      )}

      {/* Week calendar */}
      <DarkCard style={{ marginBottom: 14, padding: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, padding: '0 4px' }}>
          <div style={{ fontFamily: F.display, fontSize: 15, fontWeight: 600, color: C.bone }}>April 2026</div>
          <Pill size="sm" active bg={C.goldSoft} color={C.gold}>TODAY</Pill>
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          {week.map(d => (
            <WeekDay key={d.d} name={d.n} num={d.d} isToday={d.isToday}
              selected={selectedDay === d.d}
              onClick={() => setSelectedDay(d.d)}/>
          ))}
        </div>
      </DarkCard>

      {/* Verse card */}
      <DarkCard style={{ marginBottom: 14, padding: 16, display: 'flex', gap: 14 }}>
        <div style={{ width: 2, background: C.gold, borderRadius: 1, flexShrink: 0 }}/>
        <div>
          <div style={{ fontFamily: F.serif, fontStyle: 'italic', fontSize: 14,
            lineHeight: 1.5, color: C.bone }}>
            "Do not be anxious about anything, but in every situation, by prayer and petition, present your requests to God."
          </div>
          <div style={{ marginTop: 8, fontSize: 11, color: C.gold, fontWeight: 600, letterSpacing: 0.6 }}>
            Philippians 4:6–7
          </div>
        </div>
      </DarkCard>

      {/* Timeline */}
      <SectionHeader label="Today · 4 items"/>
      <div style={{ position: 'relative', paddingLeft: 20 }}>
        <div style={{ position: 'absolute', left: 7, top: 10, bottom: 10, width: 1.5, background: C.line }}/>
        {[
          { time: '09:30', title: 'Morning coffee together', type: 'reminder', done: true, color: C.lavender },
          { time: '12:00', title: 'Lunch with Sofia\'s parents', type: 'plan', done: false, color: C.peach },
          { time: '18:00', title: 'Pick up groceries', type: 'task', done: false, color: C.mint },
          { time: '21:00', title: 'Anniversary planning', type: 'plan', done: false, color: C.gold },
        ].map((item, i) => (
          <div key={i} style={{ display: 'flex', gap: 14, padding: '10px 0', position: 'relative' }}>
            <div style={{
              position: 'absolute', left: -20, top: 14,
              width: 15, height: 15, borderRadius: 8,
              background: item.done ? C.success : item.color,
              border: `3px solid ${C.ink}`,
            }}/>
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 10, color: C.fog, fontWeight: 700, letterSpacing: 1 }}>{item.time}</div>
                <div style={{ fontSize: 14, color: item.done ? C.fog : C.bone, fontWeight: 500,
                  textDecoration: item.done ? 'line-through' : 'none', marginTop: 2 }}>
                  {item.title}
                </div>
              </div>
              <IconTile
                icon={item.type === 'task' ? 'checkSquare' : item.type === 'plan' ? 'compass' : 'bell'}
                bg={`${item.color}26`} color={item.color} size={30} iconSize={14}/>
            </div>
          </div>
        ))}
      </div>

      {/* Explore together */}
      <div style={{ marginTop: 18 }}>
        <SectionHeader label="Explore together"/>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {[
            { icon: 'star', label: 'Wishlists', color: C.wish },
            { icon: 'compass', label: 'Plans', color: C.plans },
            { icon: 'clipboard', label: 'Checklists', color: C.sky },
            { icon: 'creditCard', label: 'Expenses', color: C.rose },
            { icon: 'flag', label: 'Milestones', color: C.journal },
          ].map(p => (
            <button key={p.label} style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              background: `${p.color}1f`, color: p.color,
              border: `1px solid ${p.color}33`, borderRadius: 999,
              padding: '8px 14px', cursor: 'pointer',
              fontFamily: F.body, fontSize: 12, fontWeight: 600,
              letterSpacing: 0.3,
            }}>
              <Icon name={p.icon} size={12} color={p.color}/>
              {p.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

window.HomeScreen = HomeScreen;

})();
