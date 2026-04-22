(() => {
const { coupl: C, fonts: F, Icon } = window;

// Reuse data from screens-timetables.jsx
const DAYS_FULL = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
const DAYS_SHORT = ['MON','TUE','WED','THU','FRI','SAT','SUN'];
const DAYS_LETTER = ['M','T','W','T','F','S','S'];

const TEMPLATES = [
  { key: 'meals',   label: 'Meal plan',      icon: 'coffee',     color: '#F4A68C', ink: '#3A1F14', sample: 'Breakfast · Lunch · Dinner' },
  { key: 'workout', label: 'Workout',        icon: 'activity',   color: '#A8D8B9', ink: '#0F2C1A', sample: 'Push · Pull · Legs · Rest' },
  { key: 'study',   label: 'Study / work',   icon: 'briefcase',  color: '#9FC4DC', ink: '#0E2230', sample: 'Deep work · Meetings · Break' },
  { key: 'routine', label: 'Morning ritual', icon: 'sun',        color: '#F2D86A', ink: '#3A2E08', sample: 'Stretch · Journal · Coffee' },
  { key: 'sleep',   label: 'Sleep routine',  icon: 'moon',       color: '#B8A8E8', ink: '#1F1635', sample: 'Wind down · Read · Lights out' },
  { key: 'custom',  label: 'Blank',          icon: 'grid',       color: '#D89BA8', ink: '#3A1520', sample: 'Start from zero' },
];

const DEMO_ITEMS = [
  { id: 1, day: 0, start: 7,  dur: 1,   title: 'Oat porridge + berries', icon: 'coffee', color: '#F4A68C', ink: '#3A1F14', cat: 'Breakfast', who: 'both' },
  { id: 2, day: 0, start: 13, dur: 1,   title: 'Quinoa bowl · avocado',  icon: 'leaf',   color: '#A8D8B9', ink: '#0F2C1A', cat: 'Lunch',     who: 'me'   },
  { id: 3, day: 0, start: 19, dur: 1.5, title: 'Risotto al limone',      icon: 'utensils', color: '#F2D86A', ink: '#3A2E08', cat: 'Dinner',    who: 'both' },
  { id: 4, day: 1, start: 7,  dur: 1,   title: 'Greek yogurt · honey',   icon: 'coffee', color: '#F4A68C', ink: '#3A1F14', cat: 'Breakfast', who: 'me'   },
  { id: 5, day: 1, start: 12.5,dur: 1,  title: 'Caprese sandwich',       icon: 'leaf',   color: '#A8D8B9', ink: '#0F2C1A', cat: 'Lunch',     who: 'sofia'},
  { id: 6, day: 1, start: 19.5,dur: 1.5,title: 'Miso-glazed salmon',     icon: 'utensils', color: '#F2D86A', ink: '#3A2E08', cat: 'Dinner',    who: 'both' },
  { id: 7, day: 2, start: 7.5,dur: 0.75,title: 'Espresso + toast',       icon: 'coffee', color: '#F4A68C', ink: '#3A1F14', cat: 'Breakfast', who: 'me'   },
  { id: 8, day: 2, start: 13, dur: 1,   title: 'Leftover salmon',        icon: 'leaf',   color: '#A8D8B9', ink: '#0F2C1A', cat: 'Lunch',     who: 'me'   },
  { id: 9, day: 2, start: 19, dur: 1.75,title: 'Date night · Cacio e pepe', icon: 'utensils', color: '#F2D86A', ink: '#3A2E08', cat: 'Dinner', who: 'both', star: true },
  { id:10, day: 3, start: 7,  dur: 1,   title: 'Smoothie bowl',          icon: 'coffee', color: '#F4A68C', ink: '#3A1F14', cat: 'Breakfast', who: 'both' },
  { id:11, day: 3, start: 13, dur: 1,   title: 'Soup + focaccia',        icon: 'leaf',   color: '#A8D8B9', ink: '#0F2C1A', cat: 'Lunch',     who: 'sofia'},
  { id:12, day: 3, start: 19.5,dur: 1.5,title: 'Orecchiette al pesto',   icon: 'utensils', color: '#F2D86A', ink: '#3A2E08', cat: 'Dinner',    who: 'both' },
  { id:13, day: 4, start: 7,  dur: 1,   title: 'Scrambled eggs',         icon: 'coffee', color: '#F4A68C', ink: '#3A1F14', cat: 'Breakfast', who: 'me'   },
  { id:14, day: 4, start: 13, dur: 1,   title: 'Farro salad',            icon: 'leaf',   color: '#A8D8B9', ink: '#0F2C1A', cat: 'Lunch',     who: 'me'   },
  { id:15, day: 4, start: 20, dur: 2,   title: 'Pizza night · homemade', icon: 'utensils', color: '#F2D86A', ink: '#3A2E08', cat: 'Dinner',    who: 'both', star: true },
  { id:16, day: 5, start: 9,  dur: 1.5, title: 'Brunch · ricotta pancakes', icon: 'coffee', color: '#F4A68C', ink: '#3A1F14', cat: 'Breakfast', who: 'both' },
  { id:17, day: 5, start: 19.5,dur: 2,  title: 'Osso buco',              icon: 'utensils', color: '#F2D86A', ink: '#3A2E08', cat: 'Dinner',    who: 'both' },
  { id:18, day: 6, start: 9.5,dur: 1.5, title: 'Frittata + espresso',    icon: 'coffee', color: '#F4A68C', ink: '#3A1F14', cat: 'Breakfast', who: 'both' },
  { id:19, day: 6, start: 13.5,dur: 1.5,title: 'Long Sunday lunch',      icon: 'utensils', color: '#F2D86A', ink: '#3A2E08', cat: 'Lunch',     who: 'both' },
];

const fmtHour = (h) => {
  const whole = Math.floor(h);
  const mins = Math.round((h - whole) * 60);
  const suffix = whole >= 12 ? 'pm' : 'am';
  const disp = whole === 0 ? 12 : whole > 12 ? whole - 12 : whole;
  return mins ? `${disp}:${String(mins).padStart(2,'0')}${suffix}` : `${disp}${suffix}`;
};

const WhoDot = ({ who, size = 18, borderColor }) => {
  if (who === 'both') return (
    <div style={{ display: 'flex' }}>
      <div style={{ width: size, height: size, borderRadius: size/2, background: '#F4A68C', color: '#3A1F14', fontSize: Math.round(size*0.5), fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: F.display }}>M</div>
      <div style={{ width: size, height: size, borderRadius: size/2, background: '#B8A8E8', color: '#1F1635', fontSize: Math.round(size*0.5), fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', marginLeft: -5, border: `1.5px solid ${borderColor || C.ink}`, fontFamily: F.display }}>S</div>
    </div>
  );
  if (who === 'sofia') return <div style={{ width: size, height: size, borderRadius: size/2, background: '#B8A8E8', color: '#1F1635', fontSize: Math.round(size*0.5), fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: F.display }}>S</div>;
  return <div style={{ width: size, height: size, borderRadius: size/2, background: '#F4A68C', color: '#3A1F14', fontSize: Math.round(size*0.5), fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: F.display }}>M</div>;
};

// ═════════════════════════════════════════════
// DETAIL — week view with 3 layouts
// ═════════════════════════════════════════════
function TimetableDetailScreen({ onBack, onAddItem, onOpenItem, layout: layoutProp = 'grid' }) {
  const [layout, setLayout] = React.useState(layoutProp);
  const [selectedDay, setSelectedDay] = React.useState(2); // Wednesday — has date night
  const [weekOffset, setWeekOffset] = React.useState(0);

  return (
    <div style={{ height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column', background: C.ink }}>
      {/* Header */}
      <div style={{ padding: '70px 20px 14px', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
          <button onClick={onBack} style={{ width: 38, height: 38, borderRadius: 19, background: C.card, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="chevronLeft" size={18} color={C.bone}/>
          </button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: 1, color: C.gold, background: C.goldSoft, padding: '2px 6px', borderRadius: 4 }}>SHARED</div>
              <div style={{ fontSize: 10, color: C.fog, fontWeight: 600, letterSpacing: 0.6 }}>Meals · week 42</div>
            </div>
            <div style={{ fontFamily: F.display, fontSize: 22, fontWeight: 700, color: C.bone, letterSpacing: -0.5, lineHeight: 1.1, marginTop: 2 }}>
              Our meals this week
            </div>
          </div>
          <button style={{ width: 38, height: 38, borderRadius: 19, background: C.card, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="moreH" size={18} color={C.bone}/>
          </button>
        </div>

        {/* Week nav + layout toggle */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: C.card, border: `1px solid ${C.line}`, borderRadius: 999, padding: 3 }}>
            <button onClick={() => setWeekOffset(w => w - 1)} style={{ width: 28, height: 28, borderRadius: 14, background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="chevronLeft" size={13} color={C.mist}/>
            </button>
            <div style={{ fontSize: 11, fontWeight: 600, color: C.bone, letterSpacing: 0.2, padding: '0 2px', minWidth: 70, textAlign: 'center' }}>
              {weekOffset === 0 ? 'This week' : weekOffset > 0 ? `In ${weekOffset}w` : `${-weekOffset}w ago`}
            </div>
            <button onClick={() => setWeekOffset(w => w + 1)} style={{ width: 28, height: 28, borderRadius: 14, background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="chevronRight" size={13} color={C.mist}/>
            </button>
          </div>

          {/* Layout toggle */}
          <div style={{ display: 'flex', background: C.card, border: `1px solid ${C.line}`, borderRadius: 999, padding: 3 }}>
            {[
              { k: 'grid',     i: 'grid' },
              { k: 'list',     i: 'menu' },
              { k: 'timeline', i: 'clock' },
            ].map(o => (
              <button key={o.k} onClick={() => setLayout(o.k)} style={{
                width: 30, height: 28, borderRadius: 14,
                background: layout === o.k ? C.gold : 'transparent',
                border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Icon name={o.i} size={13} color={layout === o.k ? C.ink : C.mist} strokeWidth={layout === o.k ? 2.4 : 2}/>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Body by layout */}
      <div style={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
        {layout === 'grid'     && <GridLayout items={DEMO_ITEMS} selectedDay={selectedDay} setSelectedDay={setSelectedDay} onOpenItem={onOpenItem}/>}
        {layout === 'list'     && <ListLayout items={DEMO_ITEMS} onOpenItem={onOpenItem}/>}
        {layout === 'timeline' && <TimelineLayout items={DEMO_ITEMS} selectedDay={selectedDay} setSelectedDay={setSelectedDay} onOpenItem={onOpenItem}/>}
      </div>

      {/* Floating add button */}
      <button onClick={onAddItem} style={{
        position: 'absolute', right: 22, bottom: 110,
        width: 54, height: 54, borderRadius: 27,
        background: C.gold, border: 'none', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 16px 36px rgba(228,178,74,0.36), 0 4px 12px rgba(0,0,0,0.3)',
      }}>
        <Icon name="plus" size={22} color={C.ink} strokeWidth={2.8}/>
      </button>
    </div>
  );
}

// ─── Layout A: Day-carousel grid (default) ─────────────────
function GridLayout({ items, selectedDay, setSelectedDay, onOpenItem }) {
  const dayItems = items.filter(i => i.day === selectedDay).sort((a,b) => a.start - b.start);
  const dayCounts = [0,1,2,3,4,5,6].map(d => items.filter(i => i.day === d).length);

  return (
    <div style={{ padding: '0 0 110px' }}>
      {/* Day pills */}
      <div style={{ padding: '4px 20px 18px', display: 'flex', gap: 8, overflow: 'auto' }}>
        {DAYS_SHORT.map((d, i) => {
          const active = i === selectedDay;
          const count = dayCounts[i];
          return (
            <button key={d} onClick={() => setSelectedDay(i)} style={{
              flexShrink: 0, width: 54, padding: '10px 0 8px',
              borderRadius: 16,
              background: active ? C.bone : C.card,
              border: active ? 'none' : `1px solid ${C.line}`,
              cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
            }}>
              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 1, color: active ? C.ash : C.fog }}>{d}</div>
              <div style={{ fontFamily: F.display, fontSize: 18, fontWeight: 700, color: active ? C.ink : C.bone, letterSpacing: -0.4, lineHeight: 1 }}>{14 + i}</div>
              {count > 0 && (
                <div style={{ width: 5, height: 5, borderRadius: 3, background: active ? C.ink : C.gold, marginTop: 3 }}/>
              )}
            </button>
          );
        })}
      </div>

      {/* Selected day */}
      <div style={{ padding: '0 20px' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 14 }}>
          <div>
            <div style={{ fontFamily: F.display, fontSize: 24, fontWeight: 700, color: C.bone, letterSpacing: -0.6, lineHeight: 1 }}>
              {DAYS_FULL[selectedDay]}
            </div>
            <div style={{ fontSize: 11, color: C.mist, marginTop: 3 }}>
              {dayItems.length} item{dayItems.length !== 1 ? 's' : ''} · {dayItems.reduce((s, i) => s + i.dur, 0).toFixed(1)}h scheduled
            </div>
          </div>
          {selectedDay === 2 && (
            <div style={{ fontSize: 10, color: C.gold, fontWeight: 700, letterSpacing: 1.2, background: C.goldSoft, padding: '4px 8px', borderRadius: 5 }}>
              ★ DATE NIGHT
            </div>
          )}
        </div>

        {/* Item cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {dayItems.map(item => (
            <button key={item.id} onClick={() => onOpenItem(item)} style={{
              background: item.color, borderRadius: 22, padding: '16px 16px 16px 18px',
              border: 'none', cursor: 'pointer', textAlign: 'left', color: item.ink,
              display: 'flex', alignItems: 'center', gap: 14, position: 'relative', overflow: 'hidden',
            }}>
              {/* Time column */}
              <div style={{ flexShrink: 0, textAlign: 'left', minWidth: 52 }}>
                <div style={{ fontFamily: F.display, fontSize: 20, fontWeight: 700, letterSpacing: -0.6, lineHeight: 1 }}>
                  {fmtHour(item.start)}
                </div>
                <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 0.8, opacity: 0.55, marginTop: 3 }}>
                  {Math.round(item.dur * 60)} MIN
                </div>
              </div>
              {/* Divider */}
              <div style={{ width: 1, alignSelf: 'stretch', background: item.ink, opacity: 0.15 }}/>
              {/* Content */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: 1, opacity: 0.6, marginBottom: 3 }}>
                  {item.cat.toUpperCase()}
                </div>
                <div style={{ fontFamily: F.display, fontSize: 15, fontWeight: 600, letterSpacing: -0.2, lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {item.title}
                </div>
              </div>
              {/* Who */}
              <div style={{ flexShrink: 0 }}>
                <WhoDot who={item.who} size={22} borderColor={item.color}/>
              </div>
              {item.star && (
                <div style={{ position: 'absolute', top: 10, right: 12, fontSize: 12 }}>★</div>
              )}
            </button>
          ))}
        </div>

        {/* Add slot */}
        <button style={{
          marginTop: 10, width: '100%', padding: '14px',
          border: `1px dashed ${C.line}`, borderRadius: 18, background: 'transparent',
          color: C.fog, fontSize: 12, fontWeight: 600,
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        }}>
          <Icon name="plus" size={14} color={C.fog}/>
          Add to {DAYS_FULL[selectedDay]}
        </button>
      </div>
    </div>
  );
}

// ─── Layout B: Flat list, grouped by day ───────────────────
function ListLayout({ items, onOpenItem }) {
  const byDay = DAYS_FULL.map((name, i) => ({
    name, idx: i, items: items.filter(it => it.day === i).sort((a,b) => a.start - b.start),
  }));
  return (
    <div style={{ padding: '0 20px 110px' }}>
      {byDay.map(d => d.items.length > 0 && (
        <div key={d.idx} style={{ marginBottom: 22 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 10, padding: '0 4px' }}>
            <div style={{ fontFamily: F.display, fontSize: 14, fontWeight: 700, color: C.bone, letterSpacing: -0.2 }}>{d.name}</div>
            <div style={{ flex: 1, height: 1, background: C.line }}/>
            <div style={{ fontSize: 10, color: C.fog, fontWeight: 600 }}>{d.items.length}</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {d.items.map(item => (
              <button key={item.id} onClick={() => onOpenItem(item)} style={{
                background: C.card, border: `1px solid ${C.line}`, borderRadius: 14,
                padding: '10px 12px', cursor: 'pointer', textAlign: 'left',
                display: 'flex', alignItems: 'center', gap: 12,
              }}>
                <div style={{ fontFamily: F.display, fontSize: 12, fontWeight: 700, color: C.mist, letterSpacing: -0.1, minWidth: 50 }}>
                  {fmtHour(item.start)}
                </div>
                <div style={{ width: 28, height: 28, borderRadius: 9, background: item.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon name={item.icon} size={14} color={item.ink} strokeWidth={2.2}/>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: C.bone, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {item.title}{item.star && <span style={{ color: C.gold, marginLeft: 5 }}>★</span>}
                  </div>
                  <div style={{ fontSize: 10, color: C.ash, marginTop: 1 }}>{item.cat} · {Math.round(item.dur * 60)} min</div>
                </div>
                <WhoDot who={item.who} size={18} borderColor={C.card}/>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Layout C: Timeline (hour column + blocks) ─────────────
function TimelineLayout({ items, selectedDay, setSelectedDay, onOpenItem }) {
  const dayItems = items.filter(i => i.day === selectedDay).sort((a,b) => a.start - b.start);
  const startHour = 6;
  const endHour = 23;
  const hourHeight = 42; // px
  const totalHours = endHour - startHour;

  return (
    <div style={{ padding: '0 0 110px' }}>
      {/* Day letter row */}
      <div style={{ padding: '0 20px 14px', display: 'flex', gap: 4 }}>
        {DAYS_LETTER.map((d, i) => {
          const active = i === selectedDay;
          const count = items.filter(it => it.day === i).length;
          return (
            <button key={i} onClick={() => setSelectedDay(i)} style={{
              flex: 1, padding: '10px 0', borderRadius: 12,
              background: active ? C.bone : C.card,
              border: active ? 'none' : `1px solid ${C.line}`,
              cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
            }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: active ? C.ink : C.mist }}>{d}</div>
              <div style={{ fontSize: 8, fontWeight: 700, color: active ? C.ash : C.fog, letterSpacing: 0.4 }}>{14 + i}</div>
              <div style={{ width: 4, height: 4, borderRadius: 2, background: count > 0 ? (active ? C.ink : C.gold) : 'transparent' }}/>
            </button>
          );
        })}
      </div>

      {/* Timeline */}
      <div style={{ padding: '4px 20px 0', position: 'relative' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ fontFamily: F.display, fontSize: 18, fontWeight: 700, color: C.bone, letterSpacing: -0.4 }}>
            {DAYS_FULL[selectedDay]}
          </div>
          <div style={{ fontSize: 10, color: C.fog, fontWeight: 600 }}>6 AM — 11 PM</div>
        </div>

        <div style={{ position: 'relative', paddingLeft: 42 }}>
          {/* Hour grid */}
          {Array.from({ length: totalHours + 1 }).map((_, i) => {
            const h = startHour + i;
            return (
              <div key={i} style={{ position: 'absolute', left: 0, right: 0, top: i * hourHeight, height: 1, background: C.line, opacity: 0.5 }}>
                <div style={{ position: 'absolute', left: -42, top: -6, fontSize: 9, fontWeight: 600, color: C.ash, letterSpacing: 0.4, width: 38, textAlign: 'right' }}>
                  {fmtHour(h).toUpperCase()}
                </div>
              </div>
            );
          })}
          {/* Spacer */}
          <div style={{ height: (totalHours + 1) * hourHeight, position: 'relative' }}>
            {/* Now line */}
            {selectedDay === 2 && (
              <div style={{ position: 'absolute', left: -6, right: 0, top: (14.3 - startHour) * hourHeight, display: 'flex', alignItems: 'center', gap: 6, zIndex: 3 }}>
                <div style={{ width: 8, height: 8, borderRadius: 4, background: C.gold }}/>
                <div style={{ flex: 1, height: 1.5, background: C.gold }}/>
                <div style={{ fontSize: 9, fontWeight: 700, color: C.gold, letterSpacing: 0.8 }}>NOW</div>
              </div>
            )}
            {/* Item blocks */}
            {dayItems.map(item => {
              const top = (item.start - startHour) * hourHeight;
              const height = item.dur * hourHeight - 3;
              return (
                <button key={item.id} onClick={() => onOpenItem(item)} style={{
                  position: 'absolute', left: 4, right: 0, top, height,
                  background: item.color, border: 'none', borderRadius: 12,
                  padding: '8px 12px', cursor: 'pointer', textAlign: 'left', color: item.ink,
                  overflow: 'hidden', display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 8, fontWeight: 800, letterSpacing: 1, opacity: 0.6 }}>
                        {item.cat.toUpperCase()}
                      </div>
                      <div style={{ fontFamily: F.display, fontSize: 13, fontWeight: 600, letterSpacing: -0.2, lineHeight: 1.15, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {item.title}{item.star && ' ★'}
                      </div>
                    </div>
                    <WhoDot who={item.who} size={16} borderColor={item.color}/>
                  </div>
                  {height > 50 && (
                    <div style={{ fontSize: 9, fontWeight: 600, opacity: 0.6, letterSpacing: 0.3 }}>
                      {fmtHour(item.start)} – {fmtHour(item.start + item.dur)}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { TimetableDetailScreen });
})();
