(() => {
// ─────────────────────────────────────────────
// TIMETABLES — weekly planners for meals, workouts, study…
// ─────────────────────────────────────────────
const { coupl: C, fonts: F, Icon,
  Overline, Display, Pill, Badge, PrimaryButton, RoundBtn, Avatar, IconTile, BlockCard, DarkCard,
  SectionHeader, GoldRule, Sheet } = window;

// ═════════════════════════════════════════════
// Shared data
// ═════════════════════════════════════════════
const DAYS_FULL = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
const DAYS_SHORT = ['MON','TUE','WED','THU','FRI','SAT','SUN'];
const DAYS_LETTER = ['M','T','W','T','F','S','S'];

// Presets with canonical colors (pull from pastel palette)
const TEMPLATES = [
  { key: 'meals',   label: 'Meal plan',      icon: 'coffee',     color: '#F4A68C', ink: '#3A1F14', sample: 'Breakfast · Lunch · Dinner' },
  { key: 'workout', label: 'Workout',        icon: 'activity',   color: '#A8D8B9', ink: '#0F2C1A', sample: 'Push · Pull · Legs · Rest' },
  { key: 'study',   label: 'Study / work',   icon: 'briefcase',  color: '#9FC4DC', ink: '#0E2230', sample: 'Deep work · Meetings · Break' },
  { key: 'routine', label: 'Morning ritual', icon: 'sun',        color: '#F2D86A', ink: '#3A2E08', sample: 'Stretch · Journal · Coffee' },
  { key: 'sleep',   label: 'Sleep routine',  icon: 'moon',       color: '#B8A8E8', ink: '#1F1635', sample: 'Wind down · Read · Lights out' },
  { key: 'custom',  label: 'Blank',          icon: 'grid',       color: '#D89BA8', ink: '#3A1520', sample: 'Start from zero' },
];

const tmplByKey = (k) => TEMPLATES.find(t => t.key === k) || TEMPLATES[5];

// Sample timetables (hub data)
const DEMO_TIMETABLES = [
  { id: 1, title: 'Our meals this week', template: 'meals',   share: 'shared', items: 21, next: 'Today · 7pm · Risotto', updated: '2h ago' },
  { id: 2, title: 'Push / Pull / Legs',  template: 'workout', share: 'solo',   items: 12, next: 'Tomorrow · 7am · Pull', updated: 'yesterday' },
  { id: 3, title: 'Sofia · deep work',   template: 'study',   share: 'partner',items: 18, next: 'Today · 10am · Writing', updated: '3d ago' },
  { id: 4, title: 'Morning ritual',      template: 'routine', share: 'solo',   items: 5,  next: 'Every day · 6:30am', updated: '1w ago' },
];

// Sample items for the detail screen (grid/list/timeline) — meal plan
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

// ═════════════════════════════════════════════
// Helpers
// ═════════════════════════════════════════════
const shareBadge = (share) => {
  if (share === 'shared') return { label: 'SHARED', color: C.gold, bg: C.goldSoft, icon: 'users' };
  if (share === 'partner') return { label: "SOFIA'S", color: '#B8A8E8', bg: 'rgba(184,168,232,0.14)', icon: 'heart' };
  return { label: 'SOLO', color: '#9FC4DC', bg: 'rgba(159,196,220,0.14)', icon: 'user' };
};

const WhoDot = ({ who, size = 18 }) => {
  if (who === 'both') return (
    <div style={{ display: 'flex' }}>
      <div style={{ width: size, height: size, borderRadius: size/2, background: '#F4A68C', color: '#3A1F14', fontSize: 9, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: F.display }}>M</div>
      <div style={{ width: size, height: size, borderRadius: size/2, background: '#B8A8E8', color: '#1F1635', fontSize: 9, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', marginLeft: -5, border: `1.5px solid ${C.ink}`, fontFamily: F.display }}>S</div>
    </div>
  );
  if (who === 'sofia') return <div style={{ width: size, height: size, borderRadius: size/2, background: '#B8A8E8', color: '#1F1635', fontSize: 9, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: F.display }}>S</div>;
  return <div style={{ width: size, height: size, borderRadius: size/2, background: '#F4A68C', color: '#3A1F14', fontSize: 9, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: F.display }}>M</div>;
};

const fmtHour = (h) => {
  const whole = Math.floor(h);
  const mins = Math.round((h - whole) * 60);
  const suffix = whole >= 12 ? 'pm' : 'am';
  const disp = whole === 0 ? 12 : whole > 12 ? whole - 12 : whole;
  return mins ? `${disp}:${String(mins).padStart(2,'0')}${suffix}` : `${disp}${suffix}`;
};

// ═════════════════════════════════════════════
// HUB — list of all timetables
// ═════════════════════════════════════════════
function TimetablesScreen({ onBack, onOpen, onCreate }) {
  const [empty, setEmpty] = React.useState(false); // tap header eye to preview empty state
  const tables = empty ? [] : DEMO_TIMETABLES;

  return (
    <div style={{ height: '100%', overflow: 'auto', padding: '70px 0 110px', background: C.ink }}>
      {/* Header */}
      <div style={{ padding: '0 20px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
        {onBack && (
          <button onClick={onBack} style={{ width: 38, height: 38, borderRadius: 19, background: C.card, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="chevronLeft" size={18} color={C.bone}/>
          </button>
        )}
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 10, color: C.fog, fontWeight: 700, letterSpacing: 1.2 }}>US · RHYTHMS</div>
          <div style={{ fontFamily: F.display, fontSize: 28, fontWeight: 700, color: C.bone, letterSpacing: -0.8, lineHeight: 1 }}>
            Timetables<span style={{ color: C.gold }}>.</span>
          </div>
        </div>
        <button onClick={() => setEmpty(e => !e)} title="Toggle empty state" style={{ width: 34, height: 34, borderRadius: 17, background: 'transparent', border: `1px solid ${C.line}`, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="eye" size={14} color={C.fog}/>
        </button>
      </div>

      {tables.length === 0 ? (
        <EmptyHub onCreate={onCreate}/>
      ) : (
        <>
          {/* Rhythm of the week — hero stat card */}
          <div style={{ padding: '0 18px 18px' }}>
            <div style={{
              background: `linear-gradient(135deg, #1D1815 0%, #1D1815 50%, rgba(228,178,74,0.08) 100%)`,
              border: `1px solid ${C.line}`, borderRadius: 26, padding: '22px 22px 20px', position: 'relative', overflow: 'hidden',
            }}>
              {/* Decorative bars */}
              <div style={{ position: 'absolute', right: -8, top: 14, display: 'flex', gap: 4, opacity: 0.35 }}>
                {[0.3, 0.6, 0.4, 0.8, 0.5, 0.9, 0.6].map((h, i) => (
                  <div key={i} style={{ width: 5, height: 44 * h, background: C.gold, borderRadius: 3 }}/>
                ))}
              </div>
              <div style={{ fontSize: 10, color: C.fog, fontWeight: 700, letterSpacing: 1.4 }}>THIS WEEK</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 4 }}>
                <div style={{ fontFamily: F.display, fontSize: 40, fontWeight: 700, color: C.bone, letterSpacing: -1.2, lineHeight: 1 }}>56</div>
                <div style={{ fontSize: 12, color: C.mist, fontWeight: 500 }}>items scheduled</div>
              </div>
              <div style={{ marginTop: 14, display: 'flex', gap: 16 }}>
                {[
                  { n: '4', l: 'TIMETABLES' },
                  { n: '2', l: 'SHARED' },
                  { n: '12h', l: 'TOGETHER' },
                ].map(s => (
                  <div key={s.l}>
                    <div style={{ fontFamily: F.display, fontSize: 18, fontWeight: 700, color: C.bone, lineHeight: 1 }}>{s.n}</div>
                    <div style={{ fontSize: 9, color: C.fog, fontWeight: 700, letterSpacing: 1, marginTop: 3 }}>{s.l}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* My timetables */}
          <div style={{ padding: '0 18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, padding: '0 4px' }}>
              <div style={{ fontSize: 10, color: C.fog, fontWeight: 700, letterSpacing: 1.4 }}>YOUR RHYTHMS · {tables.length}</div>
              <button onClick={onCreate} style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px 6px 10px',
                borderRadius: 999, background: C.goldSoft, border: 'none', cursor: 'pointer',
                color: C.gold, fontSize: 11, fontWeight: 700, letterSpacing: 0.6,
              }}>
                <Icon name="plus" size={12} color={C.gold} strokeWidth={2.5}/> NEW
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {tables.map(t => <TimetableCard key={t.id} t={t} onClick={() => onOpen(t)}/>)}
            </div>
          </div>

          {/* Create from template */}
          <div style={{ padding: '28px 18px 0' }}>
            <div style={{ fontSize: 10, color: C.fog, fontWeight: 700, letterSpacing: 1.4, marginBottom: 10, padding: '0 4px' }}>START FROM A TEMPLATE</div>
            <div style={{ display: 'flex', gap: 10, overflow: 'auto', padding: '0 4px 8px', scrollSnapType: 'x mandatory' }}>
              {TEMPLATES.slice(0, 5).map(t => (
                <button key={t.key} onClick={onCreate} style={{
                  flex: '0 0 132px', scrollSnapAlign: 'start',
                  background: t.color, borderRadius: 20, padding: '16px 14px 14px',
                  border: 'none', cursor: 'pointer', textAlign: 'left', color: t.ink,
                }}>
                  <div style={{ width: 32, height: 32, borderRadius: 10, background: `${t.ink}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
                    <Icon name={t.icon} size={16} color={t.ink} strokeWidth={2.2}/>
                  </div>
                  <div style={{ fontFamily: F.display, fontSize: 14, fontWeight: 700, letterSpacing: -0.2, marginBottom: 3 }}>{t.label}</div>
                  <div style={{ fontSize: 10, opacity: 0.7, fontWeight: 500, lineHeight: 1.3 }}>{t.sample}</div>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function TimetableCard({ t, onClick }) {
  const tmpl = tmplByKey(t.template);
  const badge = shareBadge(t.share);
  return (
    <button onClick={onClick} style={{
      background: C.card, border: `1px solid ${C.line}`, borderRadius: 20,
      padding: '14px 14px 14px 14px', cursor: 'pointer', textAlign: 'left',
      display: 'flex', alignItems: 'center', gap: 14,
    }}>
      <div style={{
        width: 48, height: 48, borderRadius: 14,
        background: tmpl.color, display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        <Icon name={tmpl.icon} size={22} color={tmpl.ink} strokeWidth={2}/>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 3,
            fontSize: 8.5, fontWeight: 800, letterSpacing: 1,
            color: badge.color, background: badge.bg,
            padding: '2px 6px', borderRadius: 4,
          }}>
            {badge.label}
          </div>
          <div style={{ fontSize: 9, color: C.ash, fontWeight: 600, letterSpacing: 0.6, textTransform: 'uppercase' }}>{t.updated}</div>
        </div>
        <div style={{ fontFamily: F.display, fontSize: 15, fontWeight: 600, color: C.bone, letterSpacing: -0.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title}</div>
        <div style={{ fontSize: 11, color: C.mist, marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
          <Icon name="clock" size={11} color={C.fog}/>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.next}</span>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
        <div style={{ fontFamily: F.display, fontSize: 18, fontWeight: 700, color: C.gold, lineHeight: 1 }}>{t.items}</div>
        <Icon name="chevronRight" size={14} color={C.fog}/>
      </div>
    </button>
  );
}

function EmptyHub({ onCreate }) {
  return (
    <div style={{ padding: '8px 20px 40px' }}>
      {/* Big empty-state illustration */}
      <div style={{
        position: 'relative', background: C.card, border: `1px dashed ${C.lineHi}`,
        borderRadius: 28, padding: '48px 24px 36px', textAlign: 'center', marginBottom: 20, overflow: 'hidden',
      }}>
        {/* Faint grid background */}
        <svg width="100%" height="100%" style={{ position: 'absolute', inset: 0, opacity: 0.22 }}>
          <defs>
            <pattern id="tt-grid" width="24" height="24" patternUnits="userSpaceOnUse">
              <path d="M 24 0 L 0 0 0 24" fill="none" stroke={C.fog} strokeWidth="0.5"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#tt-grid)"/>
        </svg>
        <div style={{ position: 'relative' }}>
          <div style={{ width: 72, height: 72, borderRadius: 22, background: C.goldSoft, margin: '0 auto 18px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${C.gold}33` }}>
            <Icon name="calendar" size={30} color={C.gold} strokeWidth={1.8}/>
          </div>
          <div style={{ fontFamily: F.display, fontSize: 22, fontWeight: 700, color: C.bone, letterSpacing: -0.4, marginBottom: 6 }}>
            Shape your week<span style={{ color: C.gold }}>.</span>
          </div>
          <div style={{ fontSize: 13, color: C.mist, lineHeight: 1.5, maxWidth: 260, margin: '0 auto 22px' }}>
            Plan meals, workouts, deep work — anything that repeats. Share it with Sofia or keep it yours.
          </div>
          <button onClick={onCreate} style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '12px 22px', borderRadius: 999, background: C.gold, color: C.ink,
            border: 'none', cursor: 'pointer', fontFamily: F.display, fontWeight: 700, fontSize: 14, letterSpacing: -0.2,
          }}>
            <Icon name="plus" size={16} color={C.ink} strokeWidth={2.5}/>
            Create first timetable
          </button>
        </div>
      </div>

      {/* Or pick a template */}
      <div style={{ fontSize: 10, color: C.fog, fontWeight: 700, letterSpacing: 1.4, marginBottom: 12, padding: '0 4px' }}>OR START FROM</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {TEMPLATES.slice(0, 4).map(t => (
          <button key={t.key} onClick={onCreate} style={{
            background: t.color, borderRadius: 18, padding: '14px 14px',
            border: 'none', cursor: 'pointer', textAlign: 'left', color: t.ink,
            display: 'flex', alignItems: 'center', gap: 12,
          }}>
            <div style={{ width: 38, height: 38, borderRadius: 12, background: `${t.ink}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Icon name={t.icon} size={18} color={t.ink} strokeWidth={2.2}/>
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontFamily: F.display, fontSize: 13, fontWeight: 700, letterSpacing: -0.1 }}>{t.label}</div>
              <div style={{ fontSize: 9.5, opacity: 0.7, fontWeight: 500, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.sample}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

Object.assign(window, { TimetablesScreen });
})();
