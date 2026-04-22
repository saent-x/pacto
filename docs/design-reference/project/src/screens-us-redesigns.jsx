// ─────────────────────────────────────────────
// Us hub — three redesign variants
// Each keeps all 7 shared-space entries and the US. wordmark.
// Variants: "editorial", "poetic", "scrapbook"
// ─────────────────────────────────────────────
(function(){
const { coupl: C, fonts: F, Icon } = window;

const FEATURES = [
  { key: 'notes',      label: 'Love notes',  sub: '2 new',          count: '124', icon: 'heart',     color: 'rose',     ink: 'roseInk' },
  { key: 'checkins',   label: 'Check-ins',   sub: 'You · good',     count: '86%', icon: 'sun',       color: 'butter',   ink: 'butterInk' },
  { key: 'expenses',   label: 'Expenses',    sub: 'Sofia owes €42', count: '€524',icon: 'dollarSign',color: 'mint',     ink: 'mintInk' },
  { key: 'wishlists',  label: 'Wishlists',   sub: '6 items',        count: '14',  icon: 'gift',      color: 'lavender', ink: 'lavenderInk' },
  { key: 'milestones', label: 'Milestones',  sub: '3 yrs Fri',      count: '3d',  icon: 'flag',      color: 'peach',    ink: 'peachInk' },
  { key: 'plans',      label: 'Plans',       sub: 'Venice · 3d',    count: '2',   icon: 'map',       color: 'sky',      ink: 'skyInk' },
  { key: 'timetables', label: 'Timetables',  sub: '4 rhythms',      count: '4',   icon: 'calendar',  color: 'peach',    ink: 'peachInk' },
];

const QUOTES = [
  { t: 'Morning sunshine. Coffee\'s on, your socks are in the dryer.', from: 'Sofia', time: '7:14 AM' },
  { t: 'The way you sang along to Caetano last night.', from: 'Sofia', time: 'Wed' },
  { t: 'Thinking about Venice already.', from: 'You',   time: 'Wed' },
];

// Helper: wordmark
function Wordmark({ size = 48, color, tight }) {
  return (
    <div style={{ fontFamily: F.display, fontSize: size, fontWeight: 700, color: color || C.bone, letterSpacing: tight ? -1.6 : -1.4, lineHeight: 0.95 }}>
      US<span style={{ color: C.gold }}>.</span>
    </div>
  );
}

function Header({ kicker }) {
  return (
    <div style={{ padding: '0 24px 18px' }}>
      <div style={{ fontSize: 11, color: C.fog, fontWeight: 700, letterSpacing: 1.4, textTransform: 'uppercase', marginBottom: 4 }}>{kicker}</div>
      <Wordmark/>
      <div style={{ width: 62, height: 3, marginTop: 8, background: `linear-gradient(90deg, ${C.gold}, transparent)`, borderRadius: 2 }}/>
    </div>
  );
}

// ─────────────────────────────────────────────
// VARIANT A — EDITORIAL
// Magazine cover: huge dual mood strip, rotating quote, countdown rail, asymmetric grid
// ─────────────────────────────────────────────
function TogetherEditorial({ onOpenSub, remindersPlacement }) {
  const features = [...FEATURES];
  if (remindersPlacement === 'us-child') features.push({ key: 'reminders', label: 'Reminders', sub: '3 today', count: '3', icon: 'bell', color: 'butter', ink: 'butterInk' });

  return (
    <div style={{ height: '100%', overflow: 'auto', padding: '68px 0 110px', background: C.ink }}>
      {/* Masthead */}
      {window.__nativeHeader ? (
        <div style={{ padding: '0 20px 14px' }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.4, color: C.fog, textTransform: 'uppercase', marginBottom: 6 }}>
            Vol. III · Issue 847 · Thursday
          </div>
          <h1 style={{ fontFamily: F.display, fontSize: 34, fontWeight: 700, color: C.bone, margin: 0, lineHeight: 1.05, letterSpacing: -0.8 }}>
            Us<span style={{ color: C.gold }}>.</span>
          </h1>
          <div style={{ marginTop: 10, display: 'inline-flex', alignItems: 'center', gap: 8,
            background: C.card, border: `1px solid ${C.line}`, borderRadius: 999, padding: '6px 12px',
            fontSize: 10, fontWeight: 700, letterSpacing: 1.2, color: C.mist, textTransform: 'uppercase',
          }}>
            <div style={{ width: 5, height: 5, borderRadius: 3, background: C.gold }}/>
            MATTIA × SOFIA · 17 APR
          </div>
        </div>
      ) : (
        <div style={{ padding: '0 24px 12px', borderBottom: `1px solid ${C.line}`, marginBottom: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', paddingBottom: 10 }}>
            <div>
              <div style={{ fontSize: 9, color: C.fog, fontWeight: 800, letterSpacing: 2, textTransform: 'uppercase' }}>Vol. III · Issue 847</div>
              <Wordmark size={76} tight/>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 9, color: C.fog, fontWeight: 800, letterSpacing: 1.6 }}>THURSDAY</div>
              <div style={{ fontFamily: F.display, fontSize: 22, fontWeight: 700, color: C.bone, letterSpacing: -0.6, lineHeight: 1 }}>17 · 11</div>
              <div style={{ fontSize: 9, color: C.fog, fontWeight: 700, marginTop: 2 }}>MATTIA × SOFIA</div>
            </div>
          </div>
        </div>
      )}

      {/* Dual mood strip — split into two big pastel slabs */}
      <div style={{ padding: '0 20px 18px' }}>
        <div style={{ fontSize: 10, color: C.fog, fontWeight: 800, letterSpacing: 1.4, marginBottom: 10 }}>MOOD · TODAY</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, height: 148 }}>
          <div style={{ background: C.peach, borderRadius: 22, padding: 16, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: 1.4, color: C.peachInk, opacity: 0.55 }}>YOU</div>
            <div>
              <div style={{ fontFamily: F.display, fontSize: 38, fontWeight: 700, color: C.peachInk, letterSpacing: -1, lineHeight: 0.95 }}>Good</div>
              <div style={{ fontSize: 11, color: C.peachInk, opacity: 0.65, marginTop: 4, fontWeight: 600 }}>7h sleep · calm</div>
            </div>
            <div style={{ display: 'flex', gap: 3 }}>
              {[1,1,0.7,1,0.4].map((o,i) => <div key={i} style={{ flex: 1, height: 4, background: C.peachInk, opacity: o, borderRadius: 2 }}/>)}
            </div>
          </div>
          <div style={{ background: C.lavender, borderRadius: 22, padding: 16, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: 1.4, color: C.lavenderInk, opacity: 0.55 }}>SOFIA</div>
            <div>
              <div style={{ fontFamily: F.display, fontSize: 38, fontWeight: 700, color: C.lavenderInk, letterSpacing: -1, lineHeight: 0.95 }}>Bright</div>
              <div style={{ fontSize: 11, color: C.lavenderInk, opacity: 0.65, marginTop: 4, fontWeight: 600 }}>Just finished yoga</div>
            </div>
            <div style={{ display: 'flex', gap: 3 }}>
              {[0.5,1,1,1,0.7].map((o,i) => <div key={i} style={{ flex: 1, height: 4, background: C.lavenderInk, opacity: o, borderRadius: 2 }}/>)}
            </div>
          </div>
        </div>
        <div style={{ marginTop: 6, textAlign: 'center', fontSize: 10, color: C.gold, fontWeight: 700, letterSpacing: 1.2 }}>◇ 86% IN SYNC · 4-DAY STREAK</div>
      </div>

      {/* Rotating quote of the day */}
      <div style={{ padding: '0 20px 18px' }}>
        <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 22, padding: '22px 24px', position: 'relative' }}>
          <div style={{ position: 'absolute', top: 14, right: 18, fontFamily: 'Georgia, serif', fontSize: 52, color: C.gold, opacity: 0.4, lineHeight: 0.7 }}>"</div>
          <div style={{ fontSize: 9, color: C.fog, fontWeight: 800, letterSpacing: 1.4, marginBottom: 10 }}>NOTE OF THE DAY · FROM SOFIA · 7:14 AM</div>
          <div style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic', fontSize: 17, color: C.bone, lineHeight: 1.4, letterSpacing: -0.15 }}>
            Morning sunshine. Coffee's on, your socks are in the dryer. I love our Thursdays.
          </div>
          <div style={{ marginTop: 14, display: 'flex', gap: 6 }}>
            {QUOTES.map((_, i) => <div key={i} style={{ width: i === 0 ? 20 : 5, height: 5, borderRadius: 3, background: i === 0 ? C.gold : C.line }}/>)}
          </div>
        </div>
      </div>

      {/* Countdown rail — tall card */}
      <div style={{ padding: '0 20px 22px' }}>
        <button onClick={() => onOpenSub('milestones')} style={{ width: '100%', background: C.peach, border: 'none', borderRadius: 22, padding: '20px 22px', cursor: 'pointer', textAlign: 'left', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', right: -20, top: -20, fontFamily: F.display, fontSize: 140, fontWeight: 700, color: C.peachInk, opacity: 0.08, letterSpacing: -6, lineHeight: 1 }}>03</div>
          <div style={{ fontSize: 9, color: C.peachInk, fontWeight: 800, letterSpacing: 1.4, opacity: 0.55 }}>COUNTDOWN · FRIDAY</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginTop: 6 }}>
            <div style={{ fontFamily: F.display, fontSize: 64, fontWeight: 700, color: C.peachInk, letterSpacing: -2.2, lineHeight: 0.9 }}>3</div>
            <div>
              <div style={{ fontFamily: F.display, fontSize: 20, fontWeight: 700, color: C.peachInk, letterSpacing: -0.5, lineHeight: 1 }}>days until</div>
              <div style={{ fontSize: 13, color: C.peachInk, opacity: 0.7, marginTop: 2, fontWeight: 600, fontStyle: 'italic' }}>3rd anniversary</div>
            </div>
          </div>
        </button>
      </div>

      {/* Shared spaces — asymmetric magazine grid */}
      <div style={{ padding: '0 24px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: 10, color: C.fog, fontWeight: 800, letterSpacing: 1.4 }}>OUR SHARED SPACES · {features.length}</div>
        <div style={{ fontSize: 10, color: C.gold, fontWeight: 700, letterSpacing: 1 }}>EDIT →</div>
      </div>
      <div style={{ padding: '0 20px' }}>
        {/* First row: 1 big + 2 small */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 10, marginBottom: 10 }}>
          <FeatureCard f={features[0]} onOpen={onOpenSub} big/>
          <div style={{ display: 'grid', gridTemplateRows: '1fr 1fr', gap: 10 }}>
            <FeatureCard f={features[1]} onOpen={onOpenSub} flat/>
            <FeatureCard f={features[2]} onOpen={onOpenSub} flat/>
          </div>
        </div>
        {/* Second row: 2 medium */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
          <FeatureCard f={features[3]} onOpen={onOpenSub}/>
          <FeatureCard f={features[4]} onOpen={onOpenSub}/>
        </div>
        {/* Third row: 1 big + 1 small (or more if reminders) */}
        <div style={{ display: 'grid', gridTemplateColumns: features[7] ? '1fr 1fr' : '1fr 1fr', gap: 10 }}>
          <FeatureCard f={features[5]} onOpen={onOpenSub}/>
          <FeatureCard f={features[6]} onOpen={onOpenSub}/>
        </div>
        {features[7] && (
          <div style={{ marginTop: 10 }}>
            <FeatureCard f={features[7]} onOpen={onOpenSub} wide/>
          </div>
        )}
      </div>

      {/* On this day — full bleed strip */}
      <div style={{ marginTop: 22, padding: '0 20px' }}>
        <div style={{ background: C.rose, borderRadius: 20, padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 52, height: 52, borderRadius: 12, background: C.roseInk, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <div style={{ fontFamily: F.display, fontSize: 20, fontWeight: 700, color: C.rose, letterSpacing: -0.5 }}>'24</div>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: 1.4, color: C.roseInk, opacity: 0.55 }}>ON THIS DAY · ONE YEAR AGO</div>
            <div style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic', fontSize: 14, color: C.roseInk, lineHeight: 1.3, marginTop: 3 }}>"First morning in the new place. Kitchen smells like cardboard and coffee."</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function FeatureCard({ f, onOpen, big, flat, wide }) {
  const bg = C[f.color] || f.color;
  const ink = C[f.ink] || f.ink;
  const padding = flat ? 14 : 16;
  const minH = big ? 200 : flat ? 0 : 120;
  return (
    <button onClick={() => onOpen(f.key)} style={{
      background: bg, borderRadius: 18, padding: padding,
      border: 'none', cursor: 'pointer', textAlign: 'left',
      display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
      minHeight: minH, position: 'relative', overflow: 'hidden', width: '100%',
    }}>
      {big && (
        <div style={{ position: 'absolute', right: -10, bottom: -20, fontFamily: F.display, fontSize: 120, fontWeight: 700, color: ink, opacity: 0.08, letterSpacing: -4, lineHeight: 1 }}>{f.count}</div>
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
        <div style={{ width: flat ? 26 : 32, height: flat ? 26 : 32, borderRadius: 8, background: 'rgba(0,0,0,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Icon name={f.icon} size={flat ? 13 : 15} color={ink}/>
        </div>
        {!flat && !big && <div style={{ fontFamily: F.display, fontSize: 14, fontWeight: 700, color: ink, letterSpacing: -0.3, opacity: 0.9 }}>{f.count}</div>}
      </div>
      <div style={{ marginTop: flat ? 8 : big ? 20 : 14, position: 'relative' }}>
        <div style={{ fontFamily: F.display, fontSize: big ? 24 : flat ? 14 : 16, fontWeight: 700, color: ink, letterSpacing: -0.4, lineHeight: 1 }}>{f.label}</div>
        <div style={{ fontSize: flat ? 10 : 11, color: ink, opacity: 0.6, fontWeight: 600, marginTop: 3 }}>{f.sub}</div>
      </div>
    </button>
  );
}

// ─────────────────────────────────────────────
// VARIANT B — POETIC
// Minimalist vertical rhythm. Stacked moments rail. Typography-led list.
// ─────────────────────────────────────────────
function TogetherPoetic({ onOpenSub, remindersPlacement }) {
  const features = [...FEATURES];
  if (remindersPlacement === 'us-child') features.push({ key: 'reminders', label: 'Reminders', sub: '3 today', count: '3', icon: 'bell', color: 'butter', ink: 'butterInk' });

  const GoldRule = () => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 24px', margin: '22px 0' }}>
      <div style={{ flex: 1, height: 1, background: C.line }}/>
      <div style={{ width: 6, height: 6, borderRadius: 3, background: C.gold }}/>
      <div style={{ flex: 1, height: 1, background: C.line }}/>
    </div>
  );

  return (
    <div style={{ height: '100%', overflow: 'auto', padding: '68px 0 110px', background: C.ink }}>
      {/* Quiet hero */}
      {window.__nativeHeader ? (
        <div style={{ padding: '0 20px 14px', textAlign: 'left' }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.4, color: C.fog, textTransform: 'uppercase', marginBottom: 6 }}>
            Day 847 · Thursday
          </div>
          <h1 style={{ fontFamily: F.display, fontSize: 34, fontWeight: 700, color: C.bone, margin: 0, lineHeight: 1.05, letterSpacing: -0.8 }}>
            Us<span style={{ color: C.gold }}>.</span>
          </h1>
          <div style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic', fontSize: 13, color: C.mist, marginTop: 10, lineHeight: 1.5 }}>
            a quiet place for the two of you
          </div>
        </div>
      ) : (
        <div style={{ padding: '0 24px', textAlign: 'center' }}>
          <div style={{ fontSize: 10, color: C.fog, fontWeight: 700, letterSpacing: 2.2, textTransform: 'uppercase' }}>Day 847 · Thursday</div>
          <div style={{ margin: '12px auto 0', display: 'inline-block' }}>
            <Wordmark size={88} tight/>
          </div>
          <div style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic', fontSize: 14, color: C.mist, marginTop: 14, lineHeight: 1.5, maxWidth: 260, margin: '14px auto 0' }}>
            a quiet place<br/>for the two of you
          </div>
        </div>
      )}

      <GoldRule/>

      {/* Moments rail — stacked, typographic */}
      <div style={{ padding: '0 24px' }}>
        {/* mood sync */}
        <button onClick={() => onOpenSub('checkins')} style={{ width: '100%', background: 'transparent', border: 'none', textAlign: 'left', cursor: 'pointer', padding: '10px 0', display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ display: 'flex' }}>
            <div style={{ width: 32, height: 32, borderRadius: 16, background: C.peach }}/>
            <div style={{ width: 32, height: 32, borderRadius: 16, background: C.lavender, marginLeft: -10, border: `2px solid ${C.ink}` }}/>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 10, color: C.fog, fontWeight: 700, letterSpacing: 1.2 }}>MOOD · IN SYNC</div>
            <div style={{ fontFamily: F.display, fontSize: 20, fontWeight: 700, color: C.bone, letterSpacing: -0.5, lineHeight: 1.1, marginTop: 2 }}>You're good, she's bright.</div>
          </div>
          <div style={{ fontFamily: F.display, fontSize: 26, fontWeight: 700, color: C.gold, letterSpacing: -1 }}>86<span style={{ fontSize: 14 }}>%</span></div>
        </button>
        <div style={{ height: 1, background: C.line, marginLeft: 46 }}/>

        {/* latest note */}
        <button onClick={() => onOpenSub('notes')} style={{ width: '100%', background: 'transparent', border: 'none', textAlign: 'left', cursor: 'pointer', padding: '14px 0', display: 'flex', alignItems: 'flex-start', gap: 14 }}>
          <div style={{ width: 32, height: 32, borderRadius: 16, background: C.rose, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Icon name="heart" size={13} color={C.roseInk}/>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 10, color: C.fog, fontWeight: 700, letterSpacing: 1.2 }}>NOTE · SOFIA · 7:14 AM</div>
            <div style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic', fontSize: 15, color: C.bone, marginTop: 3, lineHeight: 1.35 }}>
              "Coffee's on, your socks are in the dryer."
            </div>
          </div>
        </button>
        <div style={{ height: 1, background: C.line, marginLeft: 46 }}/>

        {/* countdown */}
        <button onClick={() => onOpenSub('milestones')} style={{ width: '100%', background: 'transparent', border: 'none', textAlign: 'left', cursor: 'pointer', padding: '14px 0', display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 32, height: 32, borderRadius: 16, background: C.peach, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Icon name="flag" size={13} color={C.peachInk}/>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 10, color: C.fog, fontWeight: 700, letterSpacing: 1.2 }}>FRIDAY</div>
            <div style={{ fontFamily: F.display, fontSize: 20, fontWeight: 700, color: C.bone, letterSpacing: -0.5, lineHeight: 1.1, marginTop: 2 }}>Three years together.</div>
          </div>
          <div style={{ fontFamily: F.display, fontSize: 32, fontWeight: 700, color: C.gold, letterSpacing: -1.5, lineHeight: 0.9 }}>3<span style={{ fontSize: 13, color: C.fog, fontWeight: 600, marginLeft: 2 }}>d</span></div>
        </button>
        <div style={{ height: 1, background: C.line, marginLeft: 46 }}/>

        {/* on this day */}
        <button onClick={() => onOpenSub('notes')} style={{ width: '100%', background: 'transparent', border: 'none', textAlign: 'left', cursor: 'pointer', padding: '14px 0', display: 'flex', alignItems: 'flex-start', gap: 14 }}>
          <div style={{ width: 32, height: 32, borderRadius: 16, background: C.butter, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Icon name="book" size={13} color={C.butterInk}/>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 10, color: C.fog, fontWeight: 700, letterSpacing: 1.2 }}>ONE YEAR AGO TODAY</div>
            <div style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic', fontSize: 14, color: C.mist, marginTop: 3, lineHeight: 1.35 }}>
              First morning in the new place.
            </div>
          </div>
        </button>
      </div>

      <GoldRule/>

      {/* Shared spaces list — typography-led */}
      <div style={{ padding: '0 24px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <div style={{ fontSize: 10, color: C.fog, fontWeight: 800, letterSpacing: 1.4 }}>SHARED SPACES</div>
        <div style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic', fontSize: 12, color: C.fog }}>{features.length} places</div>
      </div>
      <div style={{ padding: '0 24px' }}>
        {features.map((f, i) => (
          <button key={f.key} onClick={() => onOpenSub(f.key)} style={{
            width: '100%', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left',
            padding: '16px 0', borderTop: i === 0 ? `1px solid ${C.line}` : 'none', borderBottom: `1px solid ${C.line}`,
            display: 'flex', alignItems: 'center', gap: 14,
          }}>
            <div style={{ width: 10, height: 10, borderRadius: 5, background: C[f.color], flexShrink: 0 }}/>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: F.display, fontSize: 22, fontWeight: 700, color: C.bone, letterSpacing: -0.6, lineHeight: 1 }}>{f.label}</div>
              <div style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic', fontSize: 12, color: C.mist, marginTop: 4 }}>{f.sub}</div>
            </div>
            <div style={{ fontFamily: F.display, fontSize: 15, fontWeight: 700, color: C.fog, letterSpacing: -0.3 }}>{f.count}</div>
            <Icon name="chevronRight" size={14} color={C.ash}/>
          </button>
        ))}
      </div>

      {/* footer verse */}
      <div style={{ padding: '32px 24px 0', textAlign: 'center' }}>
        <div style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic', fontSize: 13, color: C.fog, lineHeight: 1.6 }}>
          "small things, repeated —<br/>that's a whole life."
        </div>
        <div style={{ width: 24, height: 1, background: C.gold, margin: '10px auto 0' }}/>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// VARIANT C — SCRAPBOOK
// Tactile, layered, rotated. Polaroids, tape, sticker pills, collage.
// ─────────────────────────────────────────────
function TogetherScrapbook({ onOpenSub, remindersPlacement }) {
  const features = [...FEATURES];
  if (remindersPlacement === 'us-child') features.push({ key: 'reminders', label: 'Reminders', sub: '3 today', count: '3', icon: 'bell', color: 'butter', ink: 'butterInk' });

  // varied sizes & rotations for collage
  const layout = [
    { span: 2, rot: -1.5, h: 140 }, // big
    { span: 1, rot: 2,    h: 110 },
    { span: 1, rot: -1,   h: 110 },
    { span: 1, rot: 1.5,  h: 130 },
    { span: 1, rot: -2,   h: 100 },
    { span: 2, rot: 1,    h: 120 }, // wide
    { span: 1, rot: -1,   h: 110 },
    { span: 1, rot: 2,    h: 110 },
  ];

  return (
    <div style={{ height: '100%', overflow: 'auto', padding: '68px 0 110px', background: C.ink, position: 'relative' }}>
      {/* subtle paper texture via repeating dots */}
      <div style={{ position: 'absolute', inset: 0, opacity: 0.04, backgroundImage: `radial-gradient(${C.bone} 0.5px, transparent 0.5px)`, backgroundSize: '8px 8px', pointerEvents: 'none' }}/>

      {/* Header with hand-drawn-ish underline */}
      <div style={{ padding: '0 24px 20px', position: 'relative' }}>
        <div style={{ fontSize: 10, color: C.fog, fontWeight: 700, letterSpacing: 1.4, textTransform: 'uppercase' }}>scrapbook · day 847</div>
        <Wordmark size={56} tight/>
        <svg width="90" height="8" style={{ marginTop: 4, display: 'block' }} viewBox="0 0 90 8">
          <path d="M2 5 Q 20 1, 40 4 T 88 3" stroke={C.gold} strokeWidth="1.8" fill="none" strokeLinecap="round"/>
        </svg>
      </div>

      {/* Polaroid couple card */}
      <div style={{ padding: '0 28px 26px', position: 'relative' }}>
        <div style={{ background: '#F5EEE3', borderRadius: 4, padding: '14px 14px 42px', transform: 'rotate(-2deg)', boxShadow: '0 12px 30px rgba(0,0,0,0.4)', position: 'relative' }}>
          {/* tape */}
          <div style={{ position: 'absolute', top: -10, left: '40%', width: 60, height: 18, background: 'rgba(228,178,74,0.55)', transform: 'rotate(-8deg)', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }}/>
          {/* photo stand-in */}
          <div style={{ height: 160, background: `linear-gradient(135deg, ${C.peach}, ${C.rose})`, borderRadius: 2, position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'flex-end' }}>
            <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(ellipse at 70% 30%, rgba(255,255,255,0.4), transparent 60%)` }}/>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 10, padding: 14 }}>
              <div style={{ display: 'flex' }}>
                <div style={{ width: 42, height: 42, borderRadius: 21, background: C.butter, border: '3px solid #F5EEE3', fontFamily: F.display, fontWeight: 700, color: C.butterInk, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15 }}>M</div>
                <div style={{ width: 42, height: 42, borderRadius: 21, background: C.lavender, border: '3px solid #F5EEE3', fontFamily: F.display, fontWeight: 700, color: C.lavenderInk, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, marginLeft: -12 }}>S</div>
              </div>
            </div>
          </div>
          <div style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic', fontSize: 14, color: '#1F1611', marginTop: 10, textAlign: 'center' }}>
            mattia & sofia · day 847
          </div>
        </div>

        {/* sticker pills — mood sync */}
        <div style={{ position: 'absolute', right: 18, top: 10, background: C.butter, color: C.butterInk, padding: '6px 12px', borderRadius: 999, fontSize: 10, fontWeight: 800, letterSpacing: 1, transform: 'rotate(8deg)', boxShadow: '0 4px 10px rgba(0,0,0,0.25)' }}>◇ 86% IN SYNC</div>
        <div style={{ position: 'absolute', left: 14, bottom: 40, background: C.mint, color: C.mintInk, padding: '5px 11px', borderRadius: 999, fontSize: 10, fontWeight: 800, letterSpacing: 1, transform: 'rotate(-6deg)', boxShadow: '0 4px 10px rgba(0,0,0,0.25)' }}>4-DAY STREAK 🔥</div>
      </div>

      {/* Handwritten note card — rotated with tape */}
      <div style={{ padding: '0 24px 26px', position: 'relative' }}>
        <div onClick={() => onOpenSub('notes')} style={{ background: C.rose, borderRadius: 8, padding: '20px 22px', transform: 'rotate(1.5deg)', cursor: 'pointer', position: 'relative', boxShadow: '0 8px 20px rgba(0,0,0,0.35)' }}>
          <div style={{ position: 'absolute', top: -8, right: 30, width: 50, height: 14, background: 'rgba(255,255,255,0.5)', transform: 'rotate(5deg)' }}/>
          <div style={{ fontSize: 9, color: C.roseInk, fontWeight: 800, letterSpacing: 1.4, opacity: 0.55, marginBottom: 8 }}>FROM SOFIA · THIS MORNING</div>
          <div style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic', fontSize: 17, color: C.roseInk, lineHeight: 1.35, letterSpacing: -0.2 }}>
            Coffee's on, your socks are<br/>in the dryer. I love our Thursdays.
          </div>
          <svg width="60" height="20" style={{ marginTop: 10 }} viewBox="0 0 60 20">
            <path d="M4 14 Q 14 4, 28 10 T 56 6" stroke={C.roseInk} strokeWidth="1.5" fill="none" strokeLinecap="round" opacity="0.5"/>
          </svg>
        </div>
      </div>

      {/* Shared spaces — collage */}
      <div style={{ padding: '0 24px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ fontSize: 10, color: C.fog, fontWeight: 800, letterSpacing: 1.4 }}>OUR SHARED SPACES</div>
        <div style={{ flex: 1, height: 1, background: C.line }}/>
      </div>
      <div style={{ padding: '0 20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, position: 'relative' }}>
        {features.map((f, i) => {
          const l = layout[i] || { span: 1, rot: 0, h: 110 };
          return (
            <button key={f.key} onClick={() => onOpenSub(f.key)} style={{
              gridColumn: l.span === 2 ? 'span 2' : 'span 1',
              background: C[f.color], borderRadius: 14, padding: 14,
              border: 'none', cursor: 'pointer', textAlign: 'left',
              display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
              minHeight: l.h, transform: `rotate(${l.rot}deg)`,
              boxShadow: '0 6px 16px rgba(0,0,0,0.3)', position: 'relative',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 28, height: 28, borderRadius: 14, background: 'rgba(0,0,0,0.14)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name={f.icon} size={13} color={C[f.ink]}/>
                </div>
                <div style={{ fontFamily: F.display, fontSize: 11, fontWeight: 800, color: C[f.ink], opacity: 0.6, letterSpacing: 0.5 }}>{f.count}</div>
              </div>
              <div>
                <div style={{ fontFamily: F.display, fontSize: l.span === 2 ? 22 : 17, fontWeight: 700, color: C[f.ink], letterSpacing: -0.4, lineHeight: 1 }}>{f.label}</div>
                <div style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic', fontSize: 11, color: C[f.ink], opacity: 0.7, marginTop: 3 }}>{f.sub}</div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Little verse at bottom */}
      <div style={{ padding: '28px 24px 0', textAlign: 'center', transform: 'rotate(-1deg)' }}>
        <div style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic', fontSize: 13, color: C.mist, lineHeight: 1.5 }}>
          keep the small things.<br/>the rest takes care of itself.
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Dispatcher — keeps original API, adds variant prop
// ─────────────────────────────────────────────
function TogetherScreenVariants({ variant, onOpenSub, remindersPlacement }) {
  if (variant === 'editorial') return <TogetherEditorial onOpenSub={onOpenSub} remindersPlacement={remindersPlacement}/>;
  if (variant === 'poetic')    return <TogetherPoetic    onOpenSub={onOpenSub} remindersPlacement={remindersPlacement}/>;
  if (variant === 'scrapbook') return <TogetherScrapbook onOpenSub={onOpenSub} remindersPlacement={remindersPlacement}/>;
  // fallback to original
  return <window.TogetherScreen onOpenSub={onOpenSub} remindersPlacement={remindersPlacement}/>;
}

Object.assign(window, { TogetherScreenVariants, TogetherEditorial, TogetherPoetic, TogetherScrapbook });
})();
