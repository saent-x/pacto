(() => {
// Auth screens + bottom sheets
const { coupl: C, fonts: F, Icon, CouplRings, Avatar, Overline, Display, BlockCard, DarkCard,
  Pill, Badge, IconTile, PrimaryButton, RoundBtn, ProgressRing, TripleRing,
  SectionHeader, GoldRule, WavyUnderline } = window;

// ─────────────────────────────────────────────
// SIGN IN
// ─────────────────────────────────────────────
function SignInScreen({ onSignIn, onSignUp }) {
  const [email, setEmail] = React.useState('mattia@coupl.app');
  const [pw, setPw] = React.useState('••••••••');
  const [showPw, setShowPw] = React.useState(false);

  return (
    <div style={{
      padding: '80px 24px 40px', background: C.ink, minHeight: '100%',
      display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden',
    }}>
      {/* ambient glow */}
      <div style={{ position: 'absolute', top: -40, right: -40, width: 240, height: 240, borderRadius: 240,
        background: `radial-gradient(circle, ${C.gold}22, transparent 70%)` }}/>
      <div style={{ position: 'absolute', bottom: 60, left: -60, width: 220, height: 220, borderRadius: 220,
        background: `radial-gradient(circle, ${C.rose}22, transparent 70%)` }}/>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', position: 'relative', zIndex: 1 }}>
        <div style={{ marginBottom: 60 }}>
          <CouplRings size={54} a={C.peach} b={C.lavender}/>
          <Display size={52} style={{ marginTop: 20 }}>coupl<span style={{ color: C.gold }}>.</span></Display>
          <GoldRule width={32}/>
          <div style={{ marginTop: 16, fontFamily: F.serif, fontStyle: 'italic', fontSize: 18, color: C.mist, lineHeight: 1.4, maxWidth: 260 }}>
            Your quiet place, together.
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 28, marginBottom: 36 }}>
          {/* Email */}
          <div>
            <Overline style={{ marginBottom: 10 }}>Email</Overline>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, borderBottom: `1px solid ${C.ash}`, paddingBottom: 10 }}>
              <Icon name="mail" size={16} color={C.fog}/>
              <input value={email} onChange={e => setEmail(e.target.value)}
                style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: C.bone, fontSize: 15, fontFamily: F.body }}/>
            </div>
          </div>
          <div>
            <Overline style={{ marginBottom: 10 }}>Password</Overline>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, borderBottom: `2px solid ${C.gold}`, paddingBottom: 10 }}>
              <Icon name="lock" size={16} color={C.gold}/>
              <input value={pw} type={showPw ? 'text' : 'password'} onChange={e => setPw(e.target.value)}
                style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: C.bone, fontSize: 15, fontFamily: F.body }}/>
              <button onClick={() => setShowPw(!showPw)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <Icon name="eye" size={16} color={C.fog}/>
              </button>
            </div>
          </div>
        </div>

        <PrimaryButton onClick={onSignIn}>Sign in</PrimaryButton>
      </div>

      <div style={{ textAlign: 'center', fontSize: 13, color: C.fog, position: 'relative', zIndex: 1 }}>
        No account yet?{' '}
        <button onClick={onSignUp} style={{ background: 'none', border: 'none', color: C.gold, fontWeight: 600, cursor: 'pointer', fontSize: 13 }}>
          Create one →
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// ONBOARDING — Choose
// ─────────────────────────────────────────────
function OnboardingChoose({ onCreate, onJoin }) {
  return (
    <div style={{ padding: '80px 24px 40px', background: C.ink, minHeight: '100%', display: 'flex', flexDirection: 'column' }}>
      <RoundBtn icon="chevronLeft" size={38} style={{ marginBottom: 30 }}/>
      <Display size={34}>Let's get you two<br/>connected<span style={{ color: C.gold }}>.</span></Display>
      <div style={{ marginTop: 12 }}><GoldRule width={28}/></div>
      <div style={{ marginTop: 12, fontFamily: F.serif, fontStyle: 'italic', fontSize: 15, color: C.mist, lineHeight: 1.5, maxWidth: 280 }}>
        Two ways to start — whichever one of you is here first.
      </div>

      <div style={{ marginTop: 40, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <BlockCard bg={C.peach} ink={C.peachInk} onClick={onCreate}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 52, height: 52, borderRadius: 26, background: 'rgba(58,31,20,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="plus" size={22} color={C.peachInk} strokeWidth={2.5}/>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: F.display, fontSize: 18, fontWeight: 700, color: C.peachInk }}>Create a couple</div>
              <div style={{ fontSize: 12, color: 'rgba(58,31,20,0.7)', marginTop: 2 }}>Start fresh &amp; invite your partner</div>
            </div>
            <Icon name="chevronRight" size={18} color={C.peachInk}/>
          </div>
        </BlockCard>
        <BlockCard bg={C.lavender} ink={C.lavenderInk} onClick={onJoin}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 52, height: 52, borderRadius: 26, background: 'rgba(31,22,53,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="link" size={22} color={C.lavenderInk} strokeWidth={2.5}/>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: F.display, fontSize: 18, fontWeight: 700, color: C.lavenderInk }}>Join your partner</div>
              <div style={{ fontSize: 12, color: 'rgba(31,22,53,0.7)', marginTop: 2 }}>Enter the code they shared</div>
            </div>
            <Icon name="chevronRight" size={18} color={C.lavenderInk}/>
          </div>
        </BlockCard>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// INVITE CODE DISPLAY
// ─────────────────────────────────────────────
function InviteCodeScreen({ onContinue }) {
  return (
    <div style={{ padding: '80px 24px 40px', background: C.ink, minHeight: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
      <div style={{
        width: 72, height: 72, borderRadius: 36,
        border: `2px solid ${C.success}`, display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: 24,
      }}>
        <Icon name="check" size={30} color={C.success} strokeWidth={2.5}/>
      </div>
      <Display size={34}>You're all set<span style={{ color: C.gold }}>.</span></Display>
      <div style={{ marginTop: 10 }}><GoldRule width={28}/></div>
      <div style={{ marginTop: 14, fontFamily: F.serif, fontStyle: 'italic', fontSize: 15, color: C.mist, maxWidth: 280 }}>
        Share this code with Sofia so she can join your shared space.
      </div>

      <BlockCard bg={C.butter} ink={C.butterInk} style={{ width: '100%', marginTop: 40, padding: 24, textAlign: 'center' }}>
        <Overline color="rgba(58,46,8,0.7)" style={{ marginBottom: 14 }}>Invite code</Overline>
        <div style={{ fontFamily: F.mono, fontSize: 32, fontWeight: 700, color: C.butterInk, letterSpacing: 8 }}>
          MS47-K2QX
        </div>
        <div style={{ marginTop: 20, display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(58,46,8,0.15)', color: C.butterInk, padding: '8px 14px', borderRadius: 999, fontSize: 11, fontWeight: 700, letterSpacing: 0.8 }}>
          <Icon name="copy" size={12} color={C.butterInk}/>
          TAP TO COPY
        </div>
      </BlockCard>

      <div style={{ marginTop: 20, fontSize: 12, color: C.fog, maxWidth: 270 }}>
        You can start now. Sofia can join anytime from her device.
      </div>

      <div style={{ flex: 1 }}/>
      <PrimaryButton onClick={onContinue} style={{ width: '100%' }} icon="arrowRight">Let's go</PrimaryButton>
    </div>
  );
}

// ─────────────────────────────────────────────
// BOTTOM SHEET container
// ─────────────────────────────────────────────
function Sheet({ open, onClose, height = '85%', children }) {
  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 100,
      pointerEvents: open ? 'auto' : 'none',
    }}>
      <div onClick={onClose} style={{
        position: 'absolute', inset: 0,
        background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(2px)',
        opacity: open ? 1 : 0, transition: 'opacity 0.25s',
      }}/>
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        height, background: C.coal,
        borderTopLeftRadius: 28, borderTopRightRadius: 28,
        border: `1px solid ${C.line}`, borderBottom: 'none',
        transform: open ? 'translateY(0)' : 'translateY(100%)',
        transition: 'transform 0.32s cubic-bezier(.2,.8,.2,1)',
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
      }}>
        <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 4px' }}>
          <div style={{ width: 40, height: 4, borderRadius: 2, background: C.ash }}/>
        </div>
        <div style={{ flex: 1, overflow: 'auto' }}>{children}</div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Create Reminder Sheet
// ─────────────────────────────────────────────
function CreateReminderSheet({ open, onClose, onSave }) {
  const [title, setTitle] = React.useState('');
  const [priority, setPriority] = React.useState('med');
  const [assignee, setAssignee] = React.useState('both');
  const [cat, setCat] = React.useState('General');
  const [repeat, setRepeat] = React.useState('None');

  return (
    <Sheet open={open} onClose={onClose} height="88%">
      <div style={{ padding: '6px 20px 30px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <div>
            <Overline color={C.reminders}>New reminder</Overline>
            <Display size={28} style={{ marginTop: 4 }}>Don't forget<span style={{ color: C.gold }}>.</span></Display>
          </div>
          <RoundBtn icon="x" size={36} onClick={onClose}/>
        </div>

        <div style={{ marginTop: 10 }}>
          <Overline style={{ marginBottom: 8 }}>What to remember</Overline>
          <input value={title} onChange={e => setTitle(e.target.value)}
            placeholder="Call Sofia's mom for her birthday..."
            style={{
              width: '100%', background: 'transparent', border: 'none',
              borderBottom: `2px solid ${title ? C.gold : C.line}`,
              outline: 'none', color: C.bone, fontFamily: F.display,
              fontSize: 22, fontWeight: 600, padding: '6px 0 10px',
            }}/>
        </div>

        <div style={{ marginTop: 22 }}>
          <Overline style={{ marginBottom: 10 }}>Notes</Overline>
          <textarea placeholder="Add details..." style={{
            width: '100%', minHeight: 80,
            background: C.card, border: `1px solid ${C.line}`, borderRadius: 14,
            padding: 14, color: C.bone, fontSize: 14, fontFamily: F.body,
            outline: 'none', resize: 'none', boxSizing: 'border-box',
          }}/>
        </div>

        <div style={{ marginTop: 22 }}>
          <Overline style={{ marginBottom: 10 }}>When</Overline>
          <div style={{ display: 'flex', gap: 10 }}>
            <div style={{ flex: 1, background: C.card, border: `1px solid ${C.line}`, borderRadius: 12, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
              <Icon name="calendar" size={16} color={C.reminders}/>
              <span style={{ color: C.bone, fontSize: 13, fontWeight: 600 }}>Apr 18, 2026</span>
            </div>
            <div style={{ flex: 1, background: C.card, border: `1px solid ${C.line}`, borderRadius: 12, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
              <Icon name="clock" size={16} color={C.reminders}/>
              <span style={{ color: C.bone, fontSize: 13, fontWeight: 600 }}>6:00 PM</span>
            </div>
          </div>
        </div>

        <div style={{ marginTop: 22 }}>
          <Overline style={{ marginBottom: 10 }}>Priority</Overline>
          <div style={{ display: 'flex', gap: 8 }}>
            {[
              { k: 'low', icon: 'arrowDown', dots: 1 },
              { k: 'med', icon: 'minus', dots: 2 },
              { k: 'high', icon: 'chevronsUp', dots: 3 },
            ].map(p => {
              const active = priority === p.k;
              return (
                <button key={p.k} onClick={() => setPriority(p.k)} style={{
                  flex: 1, padding: '14px 0', borderRadius: 16,
                  background: active ? `${C.reminders}26` : 'transparent',
                  border: `1px solid ${active ? C.reminders : C.line}`,
                  cursor: 'pointer',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                }}>
                  <Icon name={p.icon} size={18} color={active ? C.reminders : C.mist} strokeWidth={2.5}/>
                  <div style={{ display: 'flex', gap: 3 }}>
                    {[0,1,2].map(i => (
                      <span key={i} style={{
                        width: 4, height: 4, borderRadius: 2,
                        background: i < p.dots ? (active ? C.reminders : C.mist) : (active ? `${C.reminders}33` : C.line),
                      }}/>
                    ))}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div style={{ marginTop: 22 }}>
          <Overline style={{ marginBottom: 10 }}>Category</Overline>
          <div style={{ display: 'flex', gap: 8, overflow: 'auto', paddingBottom: 4 }}>
            {['General', 'Date night', 'Anniversary', 'Health', 'Bills', 'Travel'].map(c => (
              <Pill key={c} active={cat === c} activeBg={C.goldSoft} activeColor={C.gold} onClick={() => setCat(c)}>{c}</Pill>
            ))}
          </div>
        </div>

        <div style={{ marginTop: 22 }}>
          <Overline style={{ marginBottom: 10 }}>Repeat</Overline>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {['None', 'Daily', 'Weekly', 'Monthly', 'Yearly'].map(r => (
              <Pill key={r} active={repeat === r} activeBg={C.goldSoft} activeColor={C.gold} onClick={() => setRepeat(r)}>{r}</Pill>
            ))}
          </div>
        </div>

        <div style={{ marginTop: 22 }}>
          <Overline style={{ marginBottom: 10 }}>Assign to</Overline>
          <div style={{ display: 'flex', gap: 8 }}>
            {[{k:'both',l:'Both'}, {k:'me',l:'Me'}, {k:'sofia',l:'Sofia'}].map(a => (
              <button key={a.k} onClick={() => setAssignee(a.k)} style={{
                flex: 1, padding: '12px 0', borderRadius: 12,
                background: assignee === a.k ? C.cardHi : 'transparent',
                border: `1px solid ${assignee === a.k ? C.gold : C.line}`,
                color: assignee === a.k ? C.bone : C.mist,
                fontFamily: F.body, fontWeight: 600, fontSize: 12, cursor: 'pointer',
              }}>{a.l}</button>
            ))}
          </div>
        </div>

        <PrimaryButton onClick={onSave} style={{ marginTop: 28 }} icon="check">Save reminder</PrimaryButton>
      </div>
    </Sheet>
  );
}

// ─────────────────────────────────────────────
// Create Journal Entry Sheet
// ─────────────────────────────────────────────
function CreateEntrySheet({ open, onClose, onSave }) {
  const [title, setTitle] = React.useState('');
  const [body, setBody] = React.useState('');
  const [mood, setMood] = React.useState('good');
  const [isPrivate, setIsPrivate] = React.useState(false);

  const moods = [
    { k: 'great', icon: 'sun', color: C.mint, label: 'Great' },
    { k: 'good',  icon: 'cloud', color: C.sky, label: 'Good' },
    { k: 'okay',  icon: 'minus', color: C.butter, label: 'Okay' },
    { k: 'low',   icon: 'drizzle', color: C.rose, label: 'Low' },
    { k: 'rough', icon: 'zap', color: C.peach, label: 'Rough' },
  ];

  return (
    <Sheet open={open} onClose={onClose} height="94%">
      <div style={{ padding: '6px 20px 30px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <Overline color={C.gold}>Saturday, April 18</Overline>
          <RoundBtn icon="x" size={36} onClick={onClose}/>
        </div>

        <input value={title} onChange={e => setTitle(e.target.value)}
          placeholder="Give it a title…"
          style={{
            width: '100%', background: 'transparent', border: 'none',
            outline: 'none', color: C.bone, fontFamily: F.display,
            fontSize: 26, fontWeight: 700, padding: '6px 0',
            letterSpacing: -0.5,
          }}/>
        <div style={{ marginTop: 4, width: 40, height: 2, background: C.gold, borderRadius: 1 }}/>

        <textarea value={body} onChange={e => setBody(e.target.value)}
          placeholder="Write your thoughts..."
          style={{
            width: '100%', minHeight: 200, marginTop: 18,
            background: 'transparent', border: 'none', outline: 'none',
            color: C.bone, fontFamily: F.serif, fontStyle: body ? 'normal' : 'italic',
            fontSize: 16, lineHeight: 1.6, resize: 'none', boxSizing: 'border-box',
          }}/>

        <div style={{ marginTop: 14 }}>
          <Overline style={{ marginBottom: 10 }}>How does it feel?</Overline>
          <div style={{ display: 'flex', gap: 8, overflow: 'auto' }}>
            {moods.map(m => (
              <button key={m.k} onClick={() => setMood(m.k)} style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '8px 14px', borderRadius: 999,
                background: mood === m.k ? `${m.color}26` : 'transparent',
                border: `1px solid ${mood === m.k ? m.color : C.line}`,
                color: mood === m.k ? m.color : C.mist,
                fontFamily: F.body, fontWeight: 600, fontSize: 12, cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}>
                <Icon name={m.icon} size={14} color={mood === m.k ? m.color : C.fog}/>
                {m.label}
              </button>
            ))}
          </div>
        </div>

        <div style={{
          marginTop: 20, padding: '14px 16px', borderRadius: 14,
          background: isPrivate ? 'rgba(192,150,255,0.08)' : C.card,
          border: `1px solid ${isPrivate ? C.lavender : C.line}`,
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <Icon name="lock" size={16} color={isPrivate ? C.lavender : C.fog}/>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, color: C.bone, fontWeight: 600 }}>Private</div>
            <div style={{ fontSize: 11, color: C.fog, marginTop: 2 }}>
              {isPrivate ? 'Only you can see this entry' : 'Sofia can see this entry'}
            </div>
          </div>
          <button onClick={() => setIsPrivate(!isPrivate)} style={{
            width: 44, height: 26, borderRadius: 13,
            background: isPrivate ? C.lavender : C.line, border: 'none', position: 'relative', cursor: 'pointer',
          }}>
            <div style={{
              position: 'absolute', top: 3, left: isPrivate ? 21 : 3,
              width: 20, height: 20, borderRadius: 10, background: '#fff',
              transition: 'left 0.2s',
            }}/>
          </button>
        </div>

        <PrimaryButton onClick={onSave} style={{ marginTop: 24 }} icon="feather">Save entry</PrimaryButton>
      </div>
    </Sheet>
  );
}

// ─────────────────────────────────────────────
// Create List Sheet
// ─────────────────────────────────────────────
function CreateListSheet({ open, onClose, onSave }) {
  const [name, setName] = React.useState('');
  const [icon, setIcon] = React.useState('shoppingBag');
  const [color, setColor] = React.useState(C.peach);

  const icons = ['shoppingBag', 'home', 'heart', 'briefcase', 'book', 'gift', 'mapPin', 'coffee', 'music', 'camera'];
  const colors = [C.peach, C.lavender, C.butter, C.mint, C.rose, C.sky, C.gold, C.journal];

  return (
    <Sheet open={open} onClose={onClose} height="72%">
      <div style={{ padding: '6px 20px 30px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <div>
            <Overline color={color}>New list</Overline>
            <Display size={28} style={{ marginTop: 4 }}>Make a list<span style={{ color: C.gold }}>.</span></Display>
          </div>
          <RoundBtn icon="x" size={36} onClick={onClose}/>
        </div>

        <Overline style={{ marginBottom: 8 }}>Name</Overline>
        <input value={name} onChange={e => setName(e.target.value)}
          placeholder="Anniversary plans..."
          style={{
            width: '100%', background: 'transparent', border: 'none',
            borderBottom: `2px solid ${name ? color : C.line}`,
            outline: 'none', color: C.bone, fontFamily: F.display,
            fontSize: 22, fontWeight: 600, padding: '6px 0 10px',
          }}/>

        <div style={{ marginTop: 22 }}>
          <Overline style={{ marginBottom: 10 }}>Icon</Overline>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {icons.map(i => (
              <button key={i} onClick={() => setIcon(i)} style={{
                width: 44, height: 44, borderRadius: 14,
                background: icon === i ? `${color}33` : C.card,
                border: `1px solid ${icon === i ? color : C.line}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer',
              }}>
                <Icon name={i} size={18} color={icon === i ? color : C.mist}/>
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginTop: 22 }}>
          <Overline style={{ marginBottom: 10 }}>Color</Overline>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {colors.map(c => (
              <button key={c} onClick={() => setColor(c)} style={{
                width: 34, height: 34, borderRadius: 17,
                background: c, border: color === c ? '3px solid rgba(255,255,255,0.3)' : '3px solid transparent',
                cursor: 'pointer',
              }}/>
            ))}
          </div>
        </div>

        <PrimaryButton onClick={onSave} style={{ marginTop: 28 }} icon="plus">Create list</PrimaryButton>
      </div>
    </Sheet>
  );
}

Object.assign(window, {
  SignInScreen, OnboardingChoose, InviteCodeScreen,
  Sheet, CreateReminderSheet, CreateEntrySheet, CreateListSheet,
});

})();
