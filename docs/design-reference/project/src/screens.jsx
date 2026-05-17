(() => {
// Reminders, Tasks, Journal, More screens
const { coupl: C, fonts: F, Icon, CouplRings, Avatar, Overline, Display, BlockCard, DarkCard,
  Pill, Badge, IconTile, PrimaryButton, RoundBtn, ProgressRing, TripleRing,
  SectionHeader, GoldRule, WavyUnderline,
  ScreenHeader, StickyDate, DateSectioned } = window;

// ─────────────────────────────────────────────
// REMINDERS
// ─────────────────────────────────────────────
function ReminderRow({ item, onToggle }) {
  const done = item.done;
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 14,
      padding: '14px 16px', borderRadius: 18,
      background: C.card, border: `1px solid ${C.line}`,
    }}>
      <button onClick={onToggle} style={{
        width: 24, height: 24, borderRadius: 12,
        border: done ? 'none' : `1.5px solid ${C.ash}`,
        background: done ? C.reminders : 'transparent',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer', flexShrink: 0,
      }}>
        {done && <Icon name="check" size={14} color="#fff" strokeWidth={3}/>}
      </button>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 14, fontWeight: 500,
          color: done ? C.fog : C.bone,
          textDecoration: done ? 'line-through' : 'none',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>{item.title}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
          <Icon name="clock" size={10} color={item.overdue ? C.error : C.fog}/>
          <span style={{ fontSize: 10, color: item.overdue ? C.error : C.fog, fontWeight: 600, letterSpacing: 0.4 }}>
            {item.when}
          </span>
          {item.who && (
            <>
              <span style={{ color: C.ash }}>·</span>
              <span style={{ fontSize: 10, color: C.mist, fontWeight: 600, letterSpacing: 0.4, textTransform: 'uppercase' }}>
                {item.who}
              </span>
            </>
          )}
        </div>
      </div>
      <div style={{
        width: 8, height: 8, borderRadius: 4,
        background: item.priority === 'high' ? C.error : item.priority === 'med' ? C.butter : C.ash,
      }}/>
    </div>
  );
}

function RemindersScreen({ onCreate, onBack }) {
  const [filter, setFilter] = React.useState('All');
  const [items, setItems] = React.useState([
    { id: 1, title: 'Call mom for her birthday', bucket: 'Today', when: '18:00', who: 'Mattia', priority: 'high', done: false, overdue: false },
    { id: 2, title: 'Pick up flowers', bucket: 'Today', when: '12:30', who: 'Both', priority: 'med', done: false, overdue: false },
    { id: 3, title: 'Water the plants', bucket: 'Overdue', when: 'Yesterday', who: 'Both', priority: 'low', done: false, overdue: true },
    { id: 4, title: 'Book Venice flights', bucket: 'Tomorrow', when: '14:00', who: 'Both', priority: 'high', done: false, overdue: false },
    { id: 5, title: 'Renew gym membership', bucket: 'This week', when: 'Fri', who: 'Sofia', priority: 'med', done: false, overdue: false },
    { id: 6, title: 'Dentist appointment', bucket: 'This week', when: 'Sat · 10:00', who: 'Mattia', priority: 'high', done: false, overdue: false },
    { id: 7, title: 'Apr 28 · Sofia\u2019s mom birthday', bucket: 'Apr 28', when: '', who: 'Both', priority: 'high', done: false, overdue: false },
    { id: 8, title: 'Grandma\u2019s visit reminder', bucket: 'Apr 28', when: '09:00', who: 'Mattia', priority: 'med', done: false, overdue: false },
    { id: 9, title: 'Insurance renewal', bucket: 'May', when: 'May 3', who: 'Both', priority: 'high', done: false, overdue: false },
    { id: 10, title: 'Anniversary prep', bucket: 'May', when: 'May 18', who: 'Both', priority: 'high', done: false, overdue: false },
    { id: 11, title: 'Tax deadline', bucket: 'May', when: 'May 30', who: 'Mattia', priority: 'high', done: false, overdue: false },
    { id: 12, title: 'Summer rental check', bucket: 'Jun', when: 'Jun 6', who: 'Both', priority: 'med', done: false, overdue: false },
    { id: 13, title: 'Pay the rent', bucket: 'Done', when: 'Tue', who: 'Mattia', priority: 'high', done: true, overdue: false },
    { id: 14, title: 'Pick up dry cleaning', bucket: 'Done', when: 'Mon', who: 'Sofia', priority: 'low', done: true, overdue: false },
  ]);
  const toggle = (id) => setItems(xs => xs.map(x => x.id === id ? { ...x, done: !x.done } : x));

  const matchFilter = (x) => {
    if (filter === 'All') return true;
    if (filter === 'Mine') return x.who === 'Mattia';
    if (filter === "Sofia's") return x.who === 'Sofia';
    if (filter === 'Shared') return x.who === 'Both';
    if (filter === 'Overdue') return x.overdue;
    return true;
  };
  const active = items.filter(x => !x.done && matchFilter(x));
  const done = items.filter(x => x.done && matchFilter(x));

  // Smart-sort buckets: Overdue → Today → Tomorrow → This week → specific dates → Later
  const bucketOrder = ['Overdue', 'Today', 'Tomorrow', 'This week', 'Apr 28', 'May', 'Jun', 'Later'];
  const bucketColor = {
    Overdue: C.error, Today: C.gold, Tomorrow: C.peach, 'This week': C.lavender,
    'Apr 28': C.mint, May: C.sky, Jun: C.butter, Later: C.fog,
  };
  const sections = bucketOrder
    .map(b => ({ label: b.toUpperCase(), color: bucketColor[b], items: active.filter(x => x.bucket === b) }))
    .filter(s => s.items.length);

  return (
    <div style={{ padding: '70px 18px 110px', background: C.ink, minHeight: '100%' }}>
      {onBack && (
        <button onClick={onBack} style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          background: C.card, border: `1px solid ${C.line}`, borderRadius: 999,
          padding: '6px 12px 6px 8px', marginBottom: 14, cursor: 'pointer',
          color: C.mist, fontSize: 12, fontWeight: 600,
        }}>
          <Icon name="chevronLeft" size={14} color={C.mist}/> Back
        </button>
      )}
      <ScreenHeader
        eyebrow="06 · Reminders"
        title="REMIND"
        nativeTitle="Reminders"
        accent={C.reminders}
        underlineColor={C.reminders}
        meta={`${active.length} active · ${items.filter(x => x.overdue).length} overdue`}
        action={<RoundBtn icon="plus" bg={C.gold} color={C.peachInk} border={null} size={44} onClick={onCreate}/>}
      />

      {/* Summary block */}
      <BlockCard bg={C.lavender} ink={C.lavenderInk} style={{ marginBottom: 16, padding: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <Overline color="rgba(31,22,53,0.7)">This week</Overline>
            <div style={{ marginTop: 8, display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <Display size={54} color={C.lavenderInk}>{active.length}</Display>
              <span style={{ fontSize: 14, fontWeight: 600, color: 'rgba(31,22,53,0.6)' }}>active</span>
            </div>
            <div style={{ fontSize: 12, color: 'rgba(31,22,53,0.7)', marginTop: 6, fontWeight: 500 }}>
              {items.filter(x => x.bucket === 'Today').length} due today · {items.filter(x => x.overdue).length} overdue
            </div>
          </div>
          <IconTile icon="bell" bg="rgba(31,22,53,0.15)" color={C.lavenderInk} size={44} radius={14} iconSize={20}/>
        </div>
        <div style={{ marginTop: 16, display: 'flex', gap: 4, height: 6 }}>
          {[
            { w: 40, c: C.lavenderInk },
            { w: 25, c: 'rgba(31,22,53,0.45)' },
            { w: 20, c: 'rgba(31,22,53,0.3)' },
            { w: 15, c: 'rgba(31,22,53,0.18)' },
          ].map((s, i) => (
            <div key={i} style={{ flex: s.w, height: '100%', borderRadius: 3, background: s.c }}/>
          ))}
        </div>
        <div style={{ marginTop: 8, display: 'flex', justifyContent: 'space-between', fontSize: 10, fontWeight: 700, letterSpacing: 0.5, color: 'rgba(31,22,53,0.75)' }}>
          <span>DONE {done.length}</span><span>OPEN {active.length}</span><span>SNOOZED 2</span><span>PARTNER 4</span>
        </div>
      </BlockCard>

      {/* Filter */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 18, overflow: 'auto', paddingBottom: 4 }}>
        {['All', 'Mine', "Sofia's", 'Shared', 'Overdue'].map(f => (
          <Pill key={f}
            active={filter === f}
            activeBg={C.reminders} activeColor="#fff"
            onClick={() => setFilter(f)}>{f}</Pill>
        ))}
      </div>

      {/* Smart-sorted, sticky-date-sectioned list */}
      <DateSectioned sections={sections} maxOpen={3} renderItem={(it) => (
        <ReminderRow key={it.id} item={it} onToggle={() => toggle(it.id)}/>
      )}/>

      {/* Completed */}
      {done.length > 0 && (
        <div style={{ marginTop: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 4px', marginBottom: 12, color: C.fog, fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase' }}>
            <Icon name="chevronDown" size={12} color={C.fog}/>
            Completed · {done.length}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {done.map(it => <ReminderRow key={it.id} item={it} onToggle={() => toggle(it.id)}/>)}
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// TASKS
// ─────────────────────────────────────────────
function TaskListCard({ list, onClick }) {
  const pct = list.total === 0 ? 0 : list.done / list.total;
  return (
    <button onClick={onClick} style={{
      background: list.color, borderRadius: 22, border: 'none',
      padding: '18px 16px 16px', position: 'relative', cursor: 'pointer',
      textAlign: 'left', overflow: 'hidden',
      display: 'flex', flexDirection: 'column', gap: 28, minHeight: 136,
    }}>
      <div style={{ width: 36, height: 36, borderRadius: 12, background: 'rgba(0,0,0,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon name={list.icon} size={18} color={list.ink}/>
      </div>
      <div>
        <div style={{ fontFamily: F.display, fontSize: 18, fontWeight: 700, color: list.ink, letterSpacing: -0.4, lineHeight: 1.1, marginBottom: 10 }}>
          {list.name}
        </div>
        <div style={{ height: 4, background: 'rgba(0,0,0,0.12)', borderRadius: 2, overflow: 'hidden' }}>
          <div style={{ width: `${pct*100}%`, height: '100%', background: list.ink, borderRadius: 2 }}/>
        </div>
        <div style={{ marginTop: 8, display: 'flex', justifyContent: 'space-between', fontSize: 10, fontWeight: 800, letterSpacing: 1, color: list.ink, opacity: 0.6 }}>
          <span>{list.done}/{list.total}</span>
          <span>{Math.round(pct*100)}%</span>
        </div>
      </div>
    </button>
  );
}

function TasksScreen({ onOpenList, onCreate, remindersPlacement, onOpenReminders }) {
  const [filter, setFilter] = React.useState('All');
  const allLists = [
    { id: 1, name: 'Venice Trip', icon: 'mapPin', color: C.peach, ink: C.peachInk, done: 8, total: 14, cat: 'Travel', who: 'Both' },
    { id: 2, name: 'Apartment', icon: 'home', color: C.mint, ink: C.mintInk, done: 3, total: 7, cat: 'Home', who: 'Both' },
    { id: 3, name: 'Groceries', icon: 'shoppingBag', color: C.butter, ink: C.butterInk, done: 5, total: 9, cat: 'Home', who: 'Mine' },
    { id: 4, name: 'Anniversary', icon: 'heart', color: C.rose, ink: C.roseInk, done: 2, total: 6, cat: 'Date', who: 'Both' },
    { id: 5, name: 'Work', icon: 'briefcase', color: C.sky, ink: C.skyInk, done: 12, total: 18, cat: 'Work', who: 'Mine' },
    { id: 6, name: 'Reading', icon: 'book', color: C.lavender, ink: C.lavenderInk, done: 1, total: 4, cat: 'Solo', who: "Sofia's" },
  ];
  const lists = filter === 'All' ? allLists
              : filter === 'Mine' ? allLists.filter(l => l.who === 'Mine')
              : filter === "Sofia's" ? allLists.filter(l => l.who === "Sofia's")
              : filter === 'Shared' ? allLists.filter(l => l.who === 'Both')
              : allLists.filter(l => l.cat === filter);
  const totalDone = allLists.reduce((a, l) => a + l.done, 0);
  const totalAll = allLists.reduce((a, l) => a + l.total, 0);

  return (
    <div style={{ padding: '70px 18px 110px', background: C.ink, minHeight: '100%' }}>
      <ScreenHeader
        eyebrow="04 · Tasks"
        title="TASKS"
        nativeTitle="Tasks"
        accent={C.tasks}
        underlineColor={C.tasks}
        meta={`${totalDone} of ${totalAll} done across ${allLists.length} lists`}
        action={<RoundBtn icon="plus" bg={C.gold} color={C.peachInk} border={null} size={44} onClick={onCreate}/>}
      />

      {/* Overview */}
      <BlockCard bg={C.mint} ink={C.mintInk} style={{ marginBottom: 16, padding: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <Overline color="rgba(15,44,26,0.7)">Getting done</Overline>
            <div style={{ marginTop: 6, display: 'flex', alignItems: 'baseline', gap: 6 }}>
              <Display size={54} color={C.mintInk}>{totalDone}</Display>
              <span style={{ fontSize: 22, fontWeight: 600, color: 'rgba(15,44,26,0.55)', fontFamily: F.display }}>
                /{totalAll}
              </span>
            </div>
            <div style={{ fontSize: 12, color: 'rgba(15,44,26,0.75)', marginTop: 4, fontWeight: 500 }}>
              across {lists.length} lists · on fire 🔥 no, sorry — doing great.
            </div>
          </div>
          <ProgressRing size={80} stroke={8} value={totalDone/totalAll}
            colors={[C.mintInk, C.mintInk]}
            bg="rgba(15,44,26,0.2)"
            label={`${Math.round(100*totalDone/totalAll)}%`}
            labelColor={C.mintInk}/>
        </div>
      </BlockCard>

      {/* Tasks/Reminders segmented (when placement is tasks-filter) */}
      {remindersPlacement === 'tasks-filter' && (
        <div style={{ display: 'flex', gap: 6, background: C.card, border: `1px solid ${C.line}`, borderRadius: 14, padding: 4, marginBottom: 14 }}>
          <div style={{ flex: 1, padding: '9px 12px', borderRadius: 10, background: C.tasks, color: '#fff', textAlign: 'center', fontSize: 12, fontWeight: 700, letterSpacing: 0.6 }}>
            LISTS · {allLists.length}
          </div>
          <button onClick={onOpenReminders} style={{ flex: 1, padding: '9px 12px', borderRadius: 10, background: 'transparent', border: 'none', color: C.fog, textAlign: 'center', fontSize: 12, fontWeight: 700, letterSpacing: 0.6, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <Icon name="bell" size={12} color={C.fog}/>
            REMINDERS · 3
          </button>
        </div>
      )}

      {/* Filter */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 14, overflow: 'auto', paddingBottom: 4 }}>
        {['All', 'Mine', "Sofia's", 'Shared', 'Travel', 'Home', 'Date', 'Work'].map(f => (
          <Pill key={f}
            active={filter === f}
            activeBg={C.tasks} activeColor="#fff"
            onClick={() => setFilter(f)}>{f}</Pill>
        ))}
      </div>

      {/* Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {lists.map(l => <TaskListCard key={l.id} list={l} onClick={() => onOpenList(l)}/>)}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// TASK LIST DETAIL
// ─────────────────────────────────────────────
function TaskListDetail({ list, onBack, onCreate }) {
  const [tasks, setTasks] = React.useState([
    { id: 1, title: 'Book flights Milan → Venice', done: true, priority: 'high', due: 'MAR 20', bucket: 'Done' },
    { id: 2, title: 'Reserve hotel near San Marco', done: true, priority: 'high', due: 'MAR 22', bucket: 'Done' },
    { id: 3, title: 'Pack travel documents', done: false, priority: 'high', due: 'Today', bucket: 'Today' },
    { id: 4, title: 'Charge camera + power bank', done: false, priority: 'med', due: 'Today', bucket: 'Today' },
    { id: 5, title: 'Download offline maps', done: false, priority: 'med', due: 'Tomorrow', bucket: 'Tomorrow' },
    { id: 6, title: 'Confirm airport transfer', done: false, priority: 'high', due: 'Tomorrow', bucket: 'Tomorrow' },
    { id: 7, title: 'Make restaurant bookings', done: false, priority: 'med', due: 'Fri', bucket: 'This week' },
    { id: 8, title: 'Exchange currency', done: false, priority: 'low', due: 'Sat', bucket: 'This week' },
    { id: 9, title: 'Buy travel adapters', done: false, priority: 'low', due: 'May 4', bucket: 'May' },
    { id: 10, title: 'Print backup tickets', done: false, priority: 'med', due: 'May 8', bucket: 'May' },
    { id: 11, title: 'Pre-book gondola ride', done: false, priority: 'low', due: 'May 14', bucket: 'May' },
    { id: 12, title: 'Pack medicine kit', done: false, priority: 'med', due: null, bucket: 'Later' },
    { id: 13, title: 'Research gondola routes', done: false, priority: 'low', due: null, bucket: 'Later' },
  ]);
  const [quickAdd, setQuickAdd] = React.useState('');
  const toggle = (id) => setTasks(xs => xs.map(x => x.id === id ? { ...x, done: !x.done } : x));
  const add = () => {
    if (!quickAdd.trim()) return;
    setTasks(xs => [...xs, { id: Date.now(), title: quickAdd, done: false, priority: 'low', due: 'Today', bucket: 'Today' }]);
    setQuickAdd('');
  };
  const color = list?.color || C.peach;
  const doneCount = tasks.filter(t => t.done).length;
  const pct = tasks.length ? doneCount/tasks.length : 0;

  const active = tasks.filter(t => !t.done);
  const done = tasks.filter(t => t.done);
  const bucketOrder = ['Overdue', 'Today', 'Tomorrow', 'This week', 'May', 'Jun', 'Later'];
  const bucketColor = {
    Overdue: C.error, Today: C.gold, Tomorrow: C.peach, 'This week': C.lavender,
    May: C.sky, Jun: C.butter, Later: C.fog,
  };
  const sections = bucketOrder
    .map(b => ({ label: b.toUpperCase(), color: bucketColor[b], items: active.filter(t => t.bucket === b) }))
    .filter(s => s.items.length);

  const renderTaskRow = (t) => (
    <div key={t.id} style={{
      display: 'flex', alignItems: 'center', gap: 14,
      padding: '13px 14px', borderRadius: 16,
      background: C.card, border: `1px solid ${C.line}`,
    }}>
      <button onClick={() => toggle(t.id)} style={{
        width: 22, height: 22, borderRadius: 11,
        border: `1.5px solid ${C.ash}`,
        background: 'transparent',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer', flexShrink: 0,
      }}/>
      <span style={{ flex: 1, fontSize: 14, fontWeight: 500, color: C.bone }}>{t.title}</span>
      {t.due && (
        <span style={{ fontSize: 10, color: C.fog, fontWeight: 700, letterSpacing: 0.6, background: C.cardHi, padding: '3px 7px', borderRadius: 6 }}>
          {t.due.toUpperCase()}
        </span>
      )}
      <div style={{ width: 7, height: 7, borderRadius: 4,
        background: t.priority === 'high' ? C.error : t.priority === 'med' ? C.butter : C.ash }}/>
    </div>
  );

  return (
    <div style={{ background: C.ink, minHeight: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* header */}
      <div style={{ padding: '70px 18px 18px', background: C.coal, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <RoundBtn icon="chevronLeft" onClick={onBack} size={38}/>
          <Pill active bg={`${color}25`} color={color} size="sm">{list?.name || 'LIST'}</Pill>
          <RoundBtn icon="plus" onClick={onCreate} size={38}/>
        </div>
        <Display size={34} style={{ lineHeight: 1 }}>{list?.name || 'List'}</Display>
        <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ flex: 1, height: 4, background: C.line, borderRadius: 2, overflow: 'hidden' }}>
            <div style={{ width: `${pct*100}%`, height: '100%', background: color, transition: 'width .3s' }}/>
          </div>
          <span style={{ fontFamily: F.display, fontSize: 13, fontWeight: 700, color: C.bone }}>
            {doneCount}<span style={{ color: C.fog }}>/{tasks.length}</span>
          </span>
        </div>
      </div>

      {/* date-sectioned tasks */}
      <div style={{ flex: 1, padding: '18px 18px 18px', overflow: 'auto' }}>
        <DateSectioned sections={sections} maxOpen={3} renderItem={renderTaskRow}/>

        {done.length > 0 && (
          <div style={{ marginTop: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 4px', marginBottom: 10, color: C.fog, fontSize: 10, fontWeight: 800, letterSpacing: 1.6, textTransform: 'uppercase' }}>
              <Icon name="chevronDown" size={12} color={C.fog}/>
              Completed · {done.length}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, opacity: 0.55 }}>
              {done.map(t => (
                <div key={t.id} style={{
                  display: 'flex', alignItems: 'center', gap: 14,
                  padding: '13px 14px', borderRadius: 16,
                  background: 'transparent', border: `1px solid ${C.line}`,
                }}>
                  <button onClick={() => toggle(t.id)} style={{
                    width: 22, height: 22, borderRadius: 11, border: 'none',
                    background: color, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', flexShrink: 0,
                  }}><Icon name="check" size={12} color={C.ink} strokeWidth={3}/></button>
                  <span style={{ flex: 1, fontSize: 14, fontWeight: 500, color: C.fog, textDecoration: 'line-through' }}>{t.title}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* quick add */}
      <div style={{ padding: '10px 14px 110px', background: C.ink, borderTop: `1px solid ${C.line}` }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          background: C.card, border: `1px solid ${C.line}`,
          borderRadius: 999, padding: '6px 6px 6px 18px',
        }}>
          <Icon name="plus" size={14} color={C.fog}/>
          <input
            value={quickAdd}
            onChange={e => setQuickAdd(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && add()}
            placeholder="Add a task..."
            style={{
              flex: 1, background: 'transparent', border: 'none', outline: 'none',
              color: C.bone, fontSize: 14, fontFamily: F.body, padding: '8px 0',
            }}/>
          <button onClick={add} style={{
            width: 34, height: 34, borderRadius: 17,
            background: quickAdd.trim() ? color : C.cardHi,
            border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Icon name="arrowUp" size={16} color={quickAdd.trim() ? C.ink : C.fog} strokeWidth={2.5}/>
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// JOURNAL
// ─────────────────────────────────────────────
function JournalScreen({ onCreate }) {
  const [tab, setTab] = React.useState('All');
  const entries = [
    { id: 1, date: 'THU, APR 17', title: 'Morning light', body: 'The kitchen was glowing when I woke up. Sofia was still asleep. I made coffee quietly and watched the sun come in...',
      mood: { icon: 'sun', color: C.mint }, author: 'me', private: false },
    { id: 2, date: 'WED, APR 16', title: null, body: 'Something I couldn\'t say out loud today. Keeping it here for me.',
      mood: { icon: 'drizzle', color: C.rose }, author: 'me', private: true },
    { id: 3, date: 'TUE, APR 15', title: 'Our Venice plans', body: 'Today we finally decided. May 18, three days, one hotel near San Marco. I\'m excited in the quiet way...',
      mood: { icon: 'sun', color: C.mint }, author: 'sofia', private: false },
    { id: 4, date: 'MON, APR 14', title: 'Slow Sunday', body: 'We did nothing today. Nothing at all. It felt like everything.',
      mood: { icon: 'cloud', color: C.sky }, author: 'me', private: false },
  ];
  const filtered = tab === 'All' ? entries : tab === 'Shared' ? entries.filter(e => !e.private) : entries.filter(e => e.private);

  return (
    <div style={{ padding: '70px 18px 110px', background: C.ink, minHeight: '100%' }}>
      <ScreenHeader
        eyebrow="05 · Journal"
        title="JOURNAL"
        nativeTitle="Journal"
        accent={C.journal}
        underlineColor={C.journal}
        meta={`${entries.length} entries this week · ${entries.filter(e => !e.private).length} shared`}
        action={<RoundBtn icon="edit" bg={C.gold} color={C.peachInk} border={null} size={44} onClick={onCreate}/>}
      />

      {/* Featured quote card */}
      <BlockCard bg={C.butter} ink={C.butterInk} style={{ marginBottom: 16, padding: 22 }}>
        <div style={{ position: 'absolute', top: 16, right: 16, opacity: 0.6 }}>
          <svg width="28" height="20" viewBox="0 0 28 20">
            <path d="M6 20C2 20 0 16 0 12C0 6 4 0 12 0V4C8 4 6 8 6 10H10V20H6ZM22 20C18 20 16 16 16 12C16 6 20 0 28 0V4C24 4 22 8 22 10H26V20H22Z" fill={C.butterInk} fillOpacity="0.3"/>
          </svg>
        </div>
        <Overline color="rgba(58,46,8,0.7)">This week · 4 entries</Overline>
        <div style={{ marginTop: 12, fontFamily: F.serif, fontStyle: 'italic', fontSize: 20,
          lineHeight: 1.35, color: C.butterInk, maxWidth: 260 }}>
          "We did nothing today. Nothing at all. It felt like everything."
        </div>
        <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 18, height: 2, background: C.butterInk, borderRadius: 1, opacity: 0.6 }}/>
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, color: 'rgba(58,46,8,0.8)' }}>
            MATTIA · APR 14
          </span>
        </div>
      </BlockCard>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: `1px solid ${C.line}`, marginBottom: 16 }}>
        {['All', 'Shared', 'Private'].map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            flex: 1, padding: '10px 0',
            background: 'transparent', border: 'none', cursor: 'pointer',
            color: tab === t ? C.journal : C.fog,
            fontFamily: F.body, fontWeight: 600, fontSize: 12,
            letterSpacing: 1, textTransform: 'uppercase',
            borderBottom: `2px solid ${tab === t ? C.journal : 'transparent'}`,
            marginBottom: -1,
          }}>{t}</button>
        ))}
      </div>

      {/* Entries */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {filtered.map(e => (
          <div key={e.id} style={{
            background: C.card, border: `1px solid ${C.line}`,
            borderRadius: 18, padding: 18, position: 'relative',
            paddingLeft: e.author === 'sofia' ? 20 : 18,
            borderLeft: e.author === 'sofia' ? `3px solid ${C.gold}` : `1px solid ${C.line}`,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 10, color: C.fog, fontWeight: 700, letterSpacing: 1 }}>
                  {e.date}
                </span>
                {e.private && <Icon name="lock" size={10} color={C.fog}/>}
              </div>
              <div style={{
                width: 24, height: 24, borderRadius: 12,
                background: `${e.mood.color}22`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Icon name={e.mood.icon} size={12} color={e.mood.color}/>
              </div>
            </div>
            {e.title && (
              <div style={{ fontFamily: F.display, fontSize: 18, fontWeight: 700, color: C.bone, marginBottom: 4 }}>
                {e.title}
              </div>
            )}
            <div style={{
              fontSize: 13, color: C.mist, lineHeight: 1.5,
              display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}>{e.body}</div>
            {e.author === 'sofia' && (
              <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Avatar letter="S" size={18} bg={C.lavender} color={C.lavenderInk}/>
                <span style={{ fontSize: 10, color: C.gold, fontWeight: 600, letterSpacing: 0.6, textTransform: 'uppercase' }}>
                  Sofia
                </span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// MORE / PROFILE
// ─────────────────────────────────────────────
function MoreScreen({ theme, setTheme }) {
  const native = window.__nativeHeader;
  return (
    <div style={{ padding: '70px 18px 110px', background: C.ink, minHeight: '100%' }}>
      {/* Header */}
      {!native && (
        <div style={{ position: 'absolute', top: 70, right: 10, opacity: 0.08, pointerEvents: 'none' }}>
          <CouplRings size={140} a={C.gold} b={C.gold} opacity={1}/>
        </div>
      )}
      {native ? (
        <div style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.4, color: C.fog, textTransform: 'uppercase', marginBottom: 6 }}>Profile &amp; settings</div>
          <h1 style={{ fontFamily: F.display, fontSize: 34, fontWeight: 700, color: C.bone, margin: 0, lineHeight: 1.05, letterSpacing: -0.8 }}>
            You &amp; Sofia<span style={{ color: C.gold }}>.</span>
          </h1>
        </div>
      ) : (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 20 }}>
          <div>
            <Overline style={{ marginBottom: 6 }}>Profile &amp; settings</Overline>
            <Display size={40}>YOU<span style={{ color: C.gold }}> &amp; </span>SOFIA</Display>
          </div>
        </div>
      )}

      {/* Couple block */}
      <BlockCard bg={C.rose} ink={C.roseInk} style={{ marginBottom: 16, padding: 24, textAlign: 'center' }}>
        <Overline color="rgba(58,21,32,0.7)" style={{ marginBottom: 18 }}>847 days together</Overline>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0 }}>
          <Avatar letter="M" size={64} bg={C.peach} color={C.peachInk}
            style={{ fontSize: 28, border: `3px solid ${C.rose}` }}/>
          <div style={{ width: 24, height: 3, background: C.roseInk, margin: '0 -8px', zIndex: 1, borderRadius: 2 }}/>
          <Avatar letter="S" size={64} bg={C.lavender} color={C.lavenderInk}
            style={{ fontSize: 28, border: `3px solid ${C.rose}` }}/>
        </div>
        <div style={{ marginTop: 16, fontFamily: F.display, fontSize: 22, fontWeight: 700, color: C.roseInk, letterSpacing: -0.3 }}>
          Mattia &amp; Sofia
        </div>
        <div style={{ marginTop: 4, fontSize: 11, color: 'rgba(58,21,32,0.65)', fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase' }}>
          SINCE DEC 22, 2023
        </div>
        <div style={{ marginTop: 16, display: 'flex', justifyContent: 'space-around', paddingTop: 16, borderTop: '1px solid rgba(58,21,32,0.15)' }}>
          {[
            { n: '847', l: 'DAYS' },
            { n: '184', l: 'ENTRIES' },
            { n: '12', l: 'MILESTONES' },
          ].map(s => (
            <div key={s.l} style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: F.display, fontSize: 22, fontWeight: 700, color: C.roseInk }}>{s.n}</div>
              <div style={{ fontSize: 9, color: 'rgba(58,21,32,0.7)', fontWeight: 700, letterSpacing: 0.8, marginTop: 2 }}>{s.l}</div>
            </div>
          ))}
        </div>
      </BlockCard>

      {/* Appearance */}
      <SectionHeader label="Appearance"/>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
        {[
          { key: 'light', icon: 'sun', label: 'Light' },
          { key: 'dark', icon: 'moon', label: 'Dark' },
        ].map(t => (
          <button key={t.key} onClick={() => setTheme(t.key)} style={{
            padding: 16, borderRadius: 18,
            background: theme === t.key ? C.goldSoft : 'transparent',
            border: `1px solid ${theme === t.key ? C.gold : C.line}`,
            cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 10,
            color: theme === t.key ? C.gold : C.mist,
            fontFamily: F.display, fontWeight: 600, fontSize: 14,
          }}>
            <Icon name={t.icon} size={18} color={theme === t.key ? C.gold : C.mist}/>
            {t.label}
          </button>
        ))}
      </div>

      {/* Settings list */}
      <SectionHeader label="Settings"/>
      <DarkCard padding={0} style={{ marginBottom: 20, overflow: 'hidden' }}>
        {[
          { icon: 'user', color: C.peach, title: 'Edit profile', sub: 'Name, photo, email' },
          { icon: 'heart', color: C.rose, title: 'Couple settings', sub: 'Invite code, anniversary' },
          { icon: 'bell', color: C.lavender, title: 'Notifications', sub: 'Reminders, activity' },
          { icon: 'shield', color: C.mint, title: 'Privacy', sub: 'Journal visibility, data' },
        ].map((r, i, arr) => (
          <div key={r.title} style={{
            display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px',
            borderBottom: i < arr.length - 1 ? `1px solid ${C.line}` : 'none',
            cursor: 'pointer',
          }}>
            <IconTile icon={r.icon} bg={`${r.color}22`} color={r.color} size={38} iconSize={17}/>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, color: C.bone, fontWeight: 600 }}>{r.title}</div>
              <div style={{ fontSize: 11, color: C.fog, marginTop: 2 }}>{r.sub}</div>
            </div>
            <Icon name="chevronRight" size={16} color={C.ash}/>
          </div>
        ))}
      </DarkCard>

      {/* Support */}
      <SectionHeader label="Support"/>
      <DarkCard padding={0} style={{ marginBottom: 30, overflow: 'hidden' }}>
        {[
          { icon: 'helpCircle', title: 'Help &amp; FAQ' },
          { icon: 'messageCircle', title: 'Send feedback' },
          { icon: 'info', title: 'About Coupl' },
        ].map((r, i, arr) => (
          <div key={r.title} style={{
            display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px',
            borderBottom: i < arr.length - 1 ? `1px solid ${C.line}` : 'none',
            cursor: 'pointer',
          }}>
            <Icon name={r.icon} size={18} color={C.mist}/>
            <div style={{ flex: 1, fontSize: 14, color: C.bone, fontWeight: 500 }} dangerouslySetInnerHTML={{ __html: r.title }}/>
            <Icon name="chevronRight" size={16} color={C.ash}/>
          </div>
        ))}
      </DarkCard>

      <button style={{
        width: '100%', background: 'transparent', border: 'none',
        color: C.error, fontSize: 13, fontWeight: 600, letterSpacing: 0.5,
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        cursor: 'pointer', padding: '12px',
      }}>
        <Icon name="logOut" size={15} color={C.error}/>
        Sign out
      </button>
      <div style={{ textAlign: 'center', fontSize: 10, color: C.ash, marginTop: 8, letterSpacing: 1 }}>
        COUPL · v1.0.0
      </div>
    </div>
  );
}

Object.assign(window, { RemindersScreen, TasksScreen, TaskListDetail, JournalScreen, MoreScreen });

})();
