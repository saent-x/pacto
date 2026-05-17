(() => {
// Create sheets for Us hub features + Profile sheet
const { coupl: C, fonts: F, Icon,
  Overline, Display, Pill, PrimaryButton, RoundBtn, Avatar, IconTile, BlockCard,
  Sheet, CouplRings } = window;

// ─────────────────────────────────────────────
// Love note
// ─────────────────────────────────────────────
function CreateNoteSheet({ open, onClose, onSave }) {
  const [body, setBody] = React.useState('');
  const [to, setTo] = React.useState('sofia');
  const [vibe, setVibe] = React.useState('sweet');
  const vibes = [
    { k: 'sweet', label: 'Sweet', icon: 'heart', color: C.rose },
    { k: 'funny', label: 'Funny', icon: 'smile', color: C.butter },
    { k: 'thank', label: 'Thanks', icon: 'gift', color: C.mint },
    { k: 'sorry', label: 'Sorry', icon: 'cloud', color: C.sky },
    { k: 'proud', label: 'Proud', icon: 'star', color: C.peach },
  ];
  const activeVibe = vibes.find(v => v.k === vibe);

  return (
    <Sheet open={open} onClose={onClose} height="80%">
      <div style={{ padding: '6px 20px 30px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <div>
            <Overline color={activeVibe.color}>New love note</Overline>
            <Display size={28} style={{ marginTop: 4 }}>Tell them<span style={{ color: C.gold }}>.</span></Display>
          </div>
          <RoundBtn icon="x" size={36} onClick={onClose}/>
        </div>

        <div style={{
          background: C.card, border: `1px solid ${C.line}`, borderRadius: 18,
          padding: 18, position: 'relative',
        }}>
          <div style={{ position: 'absolute', top: 14, right: 16, opacity: 0.4 }}>
            <Icon name={activeVibe.icon} size={18} color={activeVibe.color}/>
          </div>
          <Overline color={C.fog}>For {to === 'sofia' ? 'Sofia' : 'Mattia'}</Overline>
          <textarea value={body} onChange={e => setBody(e.target.value)}
            placeholder="Say the thing you've been meaning to say..."
            style={{
              width: '100%', minHeight: 140, marginTop: 10,
              background: 'transparent', border: 'none', outline: 'none',
              color: C.bone, fontFamily: F.serif, fontStyle: body ? 'normal' : 'italic',
              fontSize: 17, lineHeight: 1.6, resize: 'none', boxSizing: 'border-box',
            }}/>
        </div>

        <div style={{ marginTop: 22 }}>
          <Overline style={{ marginBottom: 10 }}>Vibe</Overline>
          <div style={{ display: 'flex', gap: 8, overflow: 'auto', paddingBottom: 4 }}>
            {vibes.map(v => (
              <button key={v.k} onClick={() => setVibe(v.k)} style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '10px 14px', borderRadius: 999,
                background: vibe === v.k ? `${v.color}26` : 'transparent',
                border: `1px solid ${vibe === v.k ? v.color : C.line}`,
                color: vibe === v.k ? v.color : C.mist,
                fontFamily: F.body, fontWeight: 600, fontSize: 12, cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}>
                <Icon name={v.icon} size={14} color={vibe === v.k ? v.color : C.fog}/>
                {v.label}
              </button>
            ))}
          </div>
        </div>

        <PrimaryButton onClick={onSave} style={{ marginTop: 28 }} icon="heart">Send note</PrimaryButton>
      </div>
    </Sheet>
  );
}

// ─────────────────────────────────────────────
// Daily Check-in
// ─────────────────────────────────────────────
function CreateCheckinSheet({ open, onClose, onSave }) {
  const [mood, setMood] = React.useState(4);
  const [one, setOne] = React.useState('');
  const moods = [
    { n: 1, icon: 'cloudRain', color: C.sky, label: 'Rough' },
    { n: 2, icon: 'drizzle', color: C.lavender, label: 'Low' },
    { n: 3, icon: 'minus', color: C.butter, label: 'Okay' },
    { n: 4, icon: 'cloud', color: C.mint, label: 'Good' },
    { n: 5, icon: 'sun', color: C.peach, label: 'Great' },
  ];
  const active = moods.find(m => m.n === mood);

  return (
    <Sheet open={open} onClose={onClose} height="78%">
      <div style={{ padding: '6px 20px 30px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <div>
            <Overline color={active.color}>Daily check-in</Overline>
            <Display size={28} style={{ marginTop: 4 }}>How are you<span style={{ color: C.gold }}>?</span></Display>
          </div>
          <RoundBtn icon="x" size={36} onClick={onClose}/>
        </div>

        {/* Mood dial — 5 big buttons */}
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginTop: 12 }}>
          {moods.map(m => (
            <button key={m.n} onClick={() => setMood(m.n)} style={{
              flex: 1, padding: '16px 6px', borderRadius: 18,
              background: mood === m.n ? `${m.color}33` : C.card,
              border: `1px solid ${mood === m.n ? m.color : C.line}`,
              cursor: 'pointer',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
            }}>
              <div style={{
                width: 38, height: 38, borderRadius: 19,
                background: mood === m.n ? m.color : 'transparent',
                border: mood === m.n ? 'none' : `1px solid ${C.line}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Icon name={m.icon} size={18} color={mood === m.n ? C.ink : C.mist}/>
              </div>
              <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: 0.8, textTransform: 'uppercase', color: mood === m.n ? m.color : C.fog }}>
                {m.label}
              </div>
            </button>
          ))}
        </div>

        <div style={{ marginTop: 22 }}>
          <Overline style={{ marginBottom: 8 }}>One thing</Overline>
          <input value={one} onChange={e => setOne(e.target.value)}
            placeholder="that made today what it was..."
            style={{
              width: '100%', background: 'transparent', border: 'none',
              borderBottom: `2px solid ${one ? active.color : C.line}`,
              outline: 'none', color: C.bone, fontFamily: F.display,
              fontSize: 20, fontWeight: 600, padding: '6px 0 10px',
            }}/>
        </div>

        <div style={{ marginTop: 20, padding: '14px 16px', background: C.card, border: `1px solid ${C.line}`, borderRadius: 14,
          display: 'flex', alignItems: 'center', gap: 12 }}>
          <Icon name="eye" size={16} color={C.fog}/>
          <div style={{ flex: 1, fontSize: 12, color: C.mist, lineHeight: 1.4 }}>
            Sofia will see your mood — not the one-thing, unless you tap to share.
          </div>
        </div>

        <PrimaryButton onClick={onSave} style={{ marginTop: 24 }} icon="check">Log today</PrimaryButton>
      </div>
    </Sheet>
  );
}

// ─────────────────────────────────────────────
// Expense
// ─────────────────────────────────────────────
function CreateExpenseSheet({ open, onClose, onSave }) {
  const [amt, setAmt] = React.useState('');
  const [what, setWhat] = React.useState('');
  const [cat, setCat] = React.useState('food');
  const [split, setSplit] = React.useState('50/50');
  const [by, setBy] = React.useState('mattia');
  const cats = [
    { k: 'food', label: 'Food', icon: 'coffee', color: C.butter },
    { k: 'home', label: 'Home', icon: 'home', color: C.mint },
    { k: 'fun', label: 'Fun', icon: 'heart', color: C.rose },
    { k: 'travel', label: 'Travel', icon: 'mapPin', color: C.sky },
    { k: 'other', label: 'Other', icon: 'moreH', color: C.lavender },
  ];

  return (
    <Sheet open={open} onClose={onClose} height="82%">
      <div style={{ padding: '6px 20px 30px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
          <div>
            <Overline color={C.mint}>New expense</Overline>
            <Display size={28} style={{ marginTop: 4 }}>Keep tabs<span style={{ color: C.gold }}>.</span></Display>
          </div>
          <RoundBtn icon="x" size={36} onClick={onClose}/>
        </div>

        {/* Amount display */}
        <div style={{ textAlign: 'center', padding: '4px 0 18px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'baseline', gap: 4 }}>
            <span style={{ fontFamily: F.display, fontSize: 30, fontWeight: 700, color: amt ? C.gold : C.fog, lineHeight: 1 }}>€</span>
            <input value={amt} onChange={e => setAmt(e.target.value.replace(/[^0-9.,]/g, ''))}
              placeholder="0.00" inputMode="decimal"
              style={{
                background: 'transparent', border: 'none', outline: 'none',
                color: amt ? C.bone : C.fog, fontFamily: F.display,
                fontSize: 64, fontWeight: 700, letterSpacing: -2, lineHeight: 1,
                textAlign: 'center', width: 200, padding: 0,
              }}/>
          </div>
        </div>

        <Overline style={{ marginBottom: 8 }}>For what</Overline>
        <input value={what} onChange={e => setWhat(e.target.value)}
          placeholder="Groceries, dinner, rent..."
          style={{
            width: '100%', background: 'transparent', border: 'none',
            borderBottom: `2px solid ${what ? C.mint : C.line}`,
            outline: 'none', color: C.bone, fontFamily: F.display,
            fontSize: 20, fontWeight: 600, padding: '6px 0 10px',
          }}/>

        <div style={{ marginTop: 22 }}>
          <Overline style={{ marginBottom: 10 }}>Category</Overline>
          <div style={{ display: 'flex', gap: 8, overflow: 'auto', paddingBottom: 4 }}>
            {cats.map(c => (
              <button key={c.k} onClick={() => setCat(c.k)} style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '10px 14px', borderRadius: 999,
                background: cat === c.k ? `${c.color}26` : 'transparent',
                border: `1px solid ${cat === c.k ? c.color : C.line}`,
                color: cat === c.k ? c.color : C.mist,
                fontFamily: F.body, fontWeight: 600, fontSize: 12, cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}>
                <Icon name={c.icon} size={14} color={cat === c.k ? c.color : C.fog}/>
                {c.label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginTop: 20, display: 'flex', gap: 10 }}>
          <div style={{ flex: 1 }}>
            <Overline style={{ marginBottom: 10 }}>Paid by</Overline>
            <div style={{ display: 'flex', gap: 6 }}>
              {[{k:'mattia',l:'Me'}, {k:'sofia',l:'Sofia'}].map(p => (
                <button key={p.k} onClick={() => setBy(p.k)} style={{
                  flex: 1, padding: '11px 0', borderRadius: 12,
                  background: by === p.k ? C.cardHi : 'transparent',
                  border: `1px solid ${by === p.k ? C.gold : C.line}`,
                  color: by === p.k ? C.bone : C.mist,
                  fontFamily: F.body, fontWeight: 600, fontSize: 12, cursor: 'pointer',
                }}>{p.l}</button>
              ))}
            </div>
          </div>
          <div style={{ flex: 1 }}>
            <Overline style={{ marginBottom: 10 }}>Split</Overline>
            <div style={{ display: 'flex', gap: 6 }}>
              {['50/50', 'Me', 'Them'].map(s => (
                <button key={s} onClick={() => setSplit(s)} style={{
                  flex: 1, padding: '11px 0', borderRadius: 12,
                  background: split === s ? C.cardHi : 'transparent',
                  border: `1px solid ${split === s ? C.gold : C.line}`,
                  color: split === s ? C.bone : C.mist,
                  fontFamily: F.body, fontWeight: 600, fontSize: 11, cursor: 'pointer',
                }}>{s}</button>
              ))}
            </div>
          </div>
        </div>

        <PrimaryButton onClick={onSave} style={{ marginTop: 28 }} icon="check">Add expense</PrimaryButton>
      </div>
    </Sheet>
  );
}

// ─────────────────────────────────────────────
// Wishlist item
// ─────────────────────────────────────────────
function CreateWishSheet({ open, onClose, onSave }) {
  const [title, setTitle] = React.useState('');
  const [price, setPrice] = React.useState('');
  const [tag, setTag] = React.useState('HOME');
  const [url, setUrl] = React.useState('');
  const tags = ['HOME', 'TRAVEL', 'TREATS', 'BIG', 'KITCHEN', 'CLOTHES'];

  return (
    <Sheet open={open} onClose={onClose} height="78%">
      <div style={{ padding: '6px 20px 30px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <div>
            <Overline color={C.peach}>New wish</Overline>
            <Display size={28} style={{ marginTop: 4 }}>Something for us<span style={{ color: C.gold }}>.</span></Display>
          </div>
          <RoundBtn icon="x" size={36} onClick={onClose}/>
        </div>

        <Overline style={{ marginBottom: 8 }}>What</Overline>
        <input value={title} onChange={e => setTitle(e.target.value)}
          placeholder="Linen throw, oatmeal..."
          style={{
            width: '100%', background: 'transparent', border: 'none',
            borderBottom: `2px solid ${title ? C.peach : C.line}`,
            outline: 'none', color: C.bone, fontFamily: F.display,
            fontSize: 22, fontWeight: 600, padding: '6px 0 10px',
          }}/>

        <div style={{ marginTop: 22, display: 'flex', gap: 10 }}>
          <div style={{ flex: 1 }}>
            <Overline style={{ marginBottom: 8 }}>Price</Overline>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 4,
              background: C.card, border: `1px solid ${C.line}`, borderRadius: 12, padding: '10px 14px' }}>
              <span style={{ color: C.fog, fontWeight: 600 }}>€</span>
              <input value={price} onChange={e => setPrice(e.target.value.replace(/[^0-9]/g, ''))}
                placeholder="0" inputMode="numeric"
                style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none',
                  color: C.bone, fontFamily: F.display, fontSize: 18, fontWeight: 700 }}/>
            </div>
          </div>
          <div style={{ flex: 1.3 }}>
            <Overline style={{ marginBottom: 8 }}>Link</Overline>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8,
              background: C.card, border: `1px solid ${C.line}`, borderRadius: 12, padding: '10px 14px' }}>
              <Icon name="link" size={14} color={C.fog}/>
              <input value={url} onChange={e => setUrl(e.target.value)}
                placeholder="paste url..."
                style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none',
                  color: C.bone, fontSize: 13, fontFamily: F.body, minWidth: 0 }}/>
            </div>
          </div>
        </div>

        <div style={{ marginTop: 22 }}>
          <Overline style={{ marginBottom: 10 }}>Tag</Overline>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {tags.map(t => (
              <Pill key={t} active={tag === t} activeBg={`${C.peach}33`} activeColor={C.peach} onClick={() => setTag(t)}>{t}</Pill>
            ))}
          </div>
        </div>

        <PrimaryButton onClick={onSave} style={{ marginTop: 28 }} icon="plus">Add to wishlist</PrimaryButton>
      </div>
    </Sheet>
  );
}

// ─────────────────────────────────────────────
// Milestone
// ─────────────────────────────────────────────
function CreateMilestoneSheet({ open, onClose, onSave }) {
  const [title, setTitle] = React.useState('');
  const [date, setDate] = React.useState('Apr 18, 2026');
  const [icon, setIcon] = React.useState('heart');
  const [color, setColor] = React.useState(C.rose);
  const [repeat, setRepeat] = React.useState(false);
  const icons = ['heart', 'star', 'home', 'mapPin', 'gift', 'coffee', 'briefcase', 'camera', 'music'];
  const colors = [C.rose, C.peach, C.butter, C.mint, C.sky, C.lavender, C.gold];

  return (
    <Sheet open={open} onClose={onClose} height="80%">
      <div style={{ padding: '6px 20px 30px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <div>
            <Overline color={color}>New milestone</Overline>
            <Display size={28} style={{ marginTop: 4 }}>Mark the day<span style={{ color: C.gold }}>.</span></Display>
          </div>
          <RoundBtn icon="x" size={36} onClick={onClose}/>
        </div>

        <Overline style={{ marginBottom: 8 }}>What is it</Overline>
        <input value={title} onChange={e => setTitle(e.target.value)}
          placeholder="Anniversary, first apartment..."
          style={{
            width: '100%', background: 'transparent', border: 'none',
            borderBottom: `2px solid ${title ? color : C.line}`,
            outline: 'none', color: C.bone, fontFamily: F.display,
            fontSize: 22, fontWeight: 600, padding: '6px 0 10px',
          }}/>

        <div style={{ marginTop: 22 }}>
          <Overline style={{ marginBottom: 10 }}>When</Overline>
          <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 14, padding: '14px 16px',
            display: 'flex', alignItems: 'center', gap: 12 }}>
            <Icon name="calendar" size={16} color={color}/>
            <span style={{ color: C.bone, fontSize: 14, fontWeight: 600, flex: 1 }}>{date}</span>
            <span style={{ fontSize: 10, color: C.fog, fontWeight: 700, letterSpacing: 0.8 }}>TAP TO EDIT</span>
          </div>
        </div>

        <div style={{ marginTop: 22 }}>
          <Overline style={{ marginBottom: 10 }}>Icon</Overline>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {icons.map(i => (
              <button key={i} onClick={() => setIcon(i)} style={{
                width: 42, height: 42, borderRadius: 13,
                background: icon === i ? `${color}33` : C.card,
                border: `1px solid ${icon === i ? color : C.line}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
              }}>
                <Icon name={i} size={17} color={icon === i ? color : C.mist}/>
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginTop: 22 }}>
          <Overline style={{ marginBottom: 10 }}>Color</Overline>
          <div style={{ display: 'flex', gap: 10 }}>
            {colors.map(c => (
              <button key={c} onClick={() => setColor(c)} style={{
                width: 32, height: 32, borderRadius: 16,
                background: c,
                border: color === c ? '3px solid rgba(255,255,255,0.35)' : '3px solid transparent',
                cursor: 'pointer',
              }}/>
            ))}
          </div>
        </div>

        <div style={{ marginTop: 22, padding: '14px 16px', background: C.card, border: `1px solid ${C.line}`, borderRadius: 14,
          display: 'flex', alignItems: 'center', gap: 12 }}>
          <Icon name="rotate" size={16} color={repeat ? color : C.fog}/>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, color: C.bone, fontWeight: 600 }}>Remind me every year</div>
            <div style={{ fontSize: 11, color: C.fog, marginTop: 2 }}>
              {repeat ? 'We’ll nudge you both 3 days before' : 'One-time only'}
            </div>
          </div>
          <button onClick={() => setRepeat(!repeat)} style={{
            width: 44, height: 26, borderRadius: 13,
            background: repeat ? color : C.line, border: 'none', position: 'relative', cursor: 'pointer',
          }}>
            <div style={{ position: 'absolute', top: 3, left: repeat ? 21 : 3,
              width: 20, height: 20, borderRadius: 10, background: '#fff', transition: 'left 0.2s' }}/>
          </button>
        </div>

        <PrimaryButton onClick={onSave} style={{ marginTop: 26 }} icon="star">Save milestone</PrimaryButton>
      </div>
    </Sheet>
  );
}

// ─────────────────────────────────────────────
// Plan
// ─────────────────────────────────────────────
function CreatePlanSheet({ open, onClose, onSave }) {
  const [title, setTitle] = React.useState('');
  const [sub, setSub] = React.useState('');
  const [icon, setIcon] = React.useState('compass');
  const [color, setColor] = React.useState(C.sky);
  const [bucket, setBucket] = React.useState('Soon');
  const [target, setTarget] = React.useState('This month');

  const icons = ['compass', 'mapPin', 'home', 'heart', 'gift', 'star', 'coffee', 'camera', 'briefcase', 'book'];
  const colors = [C.sky, C.peach, C.butter, C.mint, C.rose, C.lavender, C.gold];
  const buckets = [
    { k: 'Soon', sub: 'weeks', color: C.peach },
    { k: 'Ongoing', sub: 'always-on', color: C.butter },
    { k: 'Later', sub: 'months', color: C.mint },
    { k: 'Someday', sub: 'dreamy', color: C.lavender },
  ];
  const targets = ['This month', 'Next month', '3 months', '6 months', 'This year', '2027+'];

  return (
    <Sheet open={open} onClose={onClose} height="92%">
      <div style={{ padding: '6px 20px 30px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <div>
            <Overline color={color}>New plan</Overline>
            <Display size={28} style={{ marginTop: 4 }}>Something to build<span style={{ color: C.gold }}>.</span></Display>
          </div>
          <RoundBtn icon="x" size={36} onClick={onClose}/>
        </div>

        {/* Preview card */}
        <div style={{ background: color, borderRadius: 20, padding: '16px 18px', marginBottom: 20, position: 'relative', overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: 1.4, opacity: 0.5, color: '#1A0F0A', textTransform: 'uppercase' }}>{bucket}</div>
              <div style={{ fontFamily: F.display, fontSize: 20, fontWeight: 700, color: '#1A0F0A', letterSpacing: -0.4, lineHeight: 1.1, marginTop: 4 }}>
                {title || 'Your plan title'}
              </div>
              <div style={{ fontSize: 11, color: '#1A0F0A', opacity: 0.6, fontWeight: 500, marginTop: 2 }}>{sub || target}</div>
            </div>
            <div style={{ width: 36, height: 36, borderRadius: 12, background: 'rgba(0,0,0,0.14)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Icon name={icon} size={16} color="#1A0F0A"/>
            </div>
          </div>
        </div>

        <Overline style={{ marginBottom: 8 }}>Title</Overline>
        <input value={title} onChange={e => setTitle(e.target.value)}
          placeholder="Venice weekend, buy the apartment..."
          style={{
            width: '100%', background: 'transparent', border: 'none',
            borderBottom: `2px solid ${title ? color : C.line}`,
            outline: 'none', color: C.bone, fontFamily: F.display,
            fontSize: 22, fontWeight: 600, padding: '6px 0 10px',
          }}/>

        <div style={{ marginTop: 20 }}>
          <Overline style={{ marginBottom: 8 }}>Subtitle</Overline>
          <input value={sub} onChange={e => setSub(e.target.value)}
            placeholder="3 days, weekends, target late 2026..."
            style={{
              width: '100%', background: C.card, border: `1px solid ${C.line}`, borderRadius: 12,
              outline: 'none', color: C.bone, fontFamily: F.body,
              fontSize: 14, padding: '12px 14px',
            }}/>
        </div>

        <div style={{ marginTop: 22 }}>
          <Overline style={{ marginBottom: 10 }}>Bucket</Overline>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {buckets.map(b => (
              <button key={b.k} onClick={() => setBucket(b.k)} style={{
                padding: '12px 14px', borderRadius: 14,
                background: bucket === b.k ? `${b.color}26` : C.card,
                border: `1px solid ${bucket === b.k ? b.color : C.line}`,
                cursor: 'pointer', textAlign: 'left',
              }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: bucket === b.k ? b.color : C.bone }}>{b.k}</div>
                <div style={{ fontSize: 10, fontWeight: 600, color: C.fog, marginTop: 2, letterSpacing: 0.4 }}>{b.sub}</div>
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginTop: 22 }}>
          <Overline style={{ marginBottom: 10 }}>Target</Overline>
          <div style={{ display: 'flex', gap: 8, overflow: 'auto', paddingBottom: 4 }}>
            {targets.map(t => (
              <Pill key={t} active={target === t} activeBg={`${color}33`} activeColor={color} onClick={() => setTarget(t)}>{t}</Pill>
            ))}
          </div>
        </div>

        <div style={{ marginTop: 22 }}>
          <Overline style={{ marginBottom: 10 }}>Icon</Overline>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {icons.map(i => (
              <button key={i} onClick={() => setIcon(i)} style={{
                width: 42, height: 42, borderRadius: 13,
                background: icon === i ? `${color}33` : C.card,
                border: `1px solid ${icon === i ? color : C.line}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
              }}>
                <Icon name={i} size={17} color={icon === i ? color : C.mist}/>
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginTop: 22 }}>
          <Overline style={{ marginBottom: 10 }}>Color</Overline>
          <div style={{ display: 'flex', gap: 10 }}>
            {colors.map(c => (
              <button key={c} onClick={() => setColor(c)} style={{
                width: 32, height: 32, borderRadius: 16, background: c,
                border: color === c ? '3px solid rgba(255,255,255,0.35)' : '3px solid transparent', cursor: 'pointer',
              }}/>
            ))}
          </div>
        </div>

        <PrimaryButton onClick={onSave} style={{ marginTop: 28 }} icon="plus">Create plan</PrimaryButton>
      </div>
    </Sheet>
  );
}

// ─────────────────────────────────────────────
// Profile sheet (top-right avatar opens this)
// ─────────────────────────────────────────────
function ProfileSheet({ open, onClose, theme = 'dusk', setTheme }) {
  const rows = [
    { icon: 'user', label: 'Your profile', sub: 'Mattia · mattia@coupl.app' },
    { icon: 'heart', label: 'Partner', sub: 'Sofia · connected since Jun 2023' },
    { icon: 'bell', label: 'Notifications', sub: 'Reminders · Check-ins · Love notes' },
    { icon: 'lock', label: 'Privacy', sub: 'What Sofia can see' },
    { icon: 'download', label: 'Export your data', sub: 'Download everything as JSON' },
    { icon: 'helpCircle', label: 'Help & feedback', sub: 'hi@coupl.app' },
  ];

  return (
    <Sheet open={open} onClose={onClose} height="92%">
      <div style={{ padding: '6px 20px 30px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <div>
            <Overline color={C.gold}>Profile & settings</Overline>
            <Display size={28} style={{ marginTop: 4 }}>You & us<span style={{ color: C.gold }}>.</span></Display>
          </div>
          <RoundBtn icon="x" size={36} onClick={onClose}/>
        </div>

        {/* Couple card */}
        <BlockCard bg={C.peach} ink={C.peachInk} style={{ padding: 20, marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <CouplRings size={56}/>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: 1.2, color: C.peachInk, opacity: 0.6 }}>CONNECTED 2Y 10M</div>
              <div style={{ fontFamily: F.display, fontSize: 22, fontWeight: 700, color: C.peachInk, letterSpacing: -0.4, lineHeight: 1.05 }}>Mattia & Sofia</div>
              <div style={{ fontSize: 11, color: C.peachInk, opacity: 0.7, fontWeight: 500, marginTop: 2 }}>coupl code: BREAD-SILK-42</div>
            </div>
            <button style={{ width: 34, height: 34, borderRadius: 17, background: 'rgba(0,0,0,0.14)', border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="share" size={14} color={C.peachInk}/>
            </button>
          </div>
        </BlockCard>

        {/* Theme switcher */}
        <Overline style={{ marginBottom: 10 }}>Theme</Overline>
        <div style={{ display: 'flex', gap: 10, marginBottom: 22 }}>
          {[
            { k: 'dusk', label: 'Warm dusk', bg: '#1A0F0A', dot: C.gold },
            { k: 'dawn', label: 'Dawn cream', bg: '#F5EEE3', dot: C.rose },
          ].map(t => (
            <button key={t.k} onClick={() => setTheme && setTheme(t.k)} style={{
              flex: 1, padding: '14px 14px', borderRadius: 16,
              background: theme === t.k ? C.cardHi : C.card,
              border: `1px solid ${theme === t.k ? C.gold : C.line}`,
              display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer',
            }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: t.bg, border: `1px solid ${C.line}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ width: 10, height: 10, borderRadius: 5, background: t.dot }}/>
              </div>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: C.bone }}>{t.label}</div>
                <div style={{ fontSize: 10, fontWeight: 600, color: C.fog, letterSpacing: 0.4, marginTop: 2 }}>
                  {theme === t.k ? 'ACTIVE' : 'TAP TO TRY'}
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Menu list */}
        <Overline style={{ marginBottom: 10 }}>Settings</Overline>
        <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 18, overflow: 'hidden' }}>
          {rows.map((r, i) => (
            <button key={r.label} style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px',
              background: 'transparent', border: 'none',
              borderBottom: i === rows.length - 1 ? 'none' : `1px solid ${C.line}`,
              cursor: 'pointer', textAlign: 'left',
            }}>
              <IconTile icon={r.icon} bg={C.cardHi} color={C.gold} size={36} radius={10} iconSize={15}/>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: C.bone }}>{r.label}</div>
                <div style={{ fontSize: 11, color: C.fog, marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.sub}</div>
              </div>
              <Icon name="chevronRight" size={14} color={C.fog}/>
            </button>
          ))}
        </div>

        <button style={{
          width: '100%', marginTop: 18, padding: '14px 16px', borderRadius: 14,
          background: 'transparent', border: `1px solid ${C.line}`, cursor: 'pointer',
          color: C.mist, fontFamily: F.body, fontWeight: 600, fontSize: 13,
        }}>Sign out</button>
      </div>
    </Sheet>
  );
}

Object.assign(window, {
  CreateNoteSheet, CreateCheckinSheet, CreateExpenseSheet,
  CreateWishSheet, CreateMilestoneSheet, CreatePlanSheet,
  ProfileSheet,
  // aliases used by Coupl.html
  LoveNoteSheet: CreateNoteSheet,
  CheckinSheet: CreateCheckinSheet,
  ExpenseSheet: CreateExpenseSheet,
  WishlistSheet: CreateWishSheet,
  MilestoneSheet: CreateMilestoneSheet,
  PlanSheet: CreatePlanSheet,
});
})();
