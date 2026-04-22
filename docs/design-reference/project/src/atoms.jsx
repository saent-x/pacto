(() => {
// Reusable atoms for the Coupl redesign

const { coupl: C, fonts: F, Icon } = window;

// Small decorative ring (brand element, reimagined as overlapping pastel circles)
function CouplRings({ size = 36, opacity = 1, a = C.peach, b = C.lavender }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" style={{ opacity }}>
      <circle cx="15" cy="20" r="11" fill="none" stroke={a} strokeWidth="2"/>
      <circle cx="25" cy="20" r="11" fill="none" stroke={b} strokeWidth="2"/>
    </svg>
  );
}

// Avatar with initial
function Avatar({ letter = 'M', size = 36, bg = C.peach, color = C.peachInk, border = null, style = {} }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: size / 2,
      background: bg, color,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: F.display, fontWeight: 700, fontSize: size * 0.44,
      border: border || 'none', flexShrink: 0, ...style,
    }}>{letter}</div>
  );
}

// Overline label (uppercase small caps)
function Overline({ children, color = C.fog, style = {} }) {
  return (
    <div style={{
      fontFamily: F.body, fontSize: 10, fontWeight: 700,
      letterSpacing: 1.4, textTransform: 'uppercase',
      color, ...style,
    }}>{children}</div>
  );
}

// Big display heading (Bricolage)
function Display({ children, size = 34, weight = 700, color = C.bone, style = {} }) {
  return (
    <div style={{
      fontFamily: F.display, fontSize: size, fontWeight: weight,
      color, lineHeight: 0.95, letterSpacing: -1, ...style,
    }}>{children}</div>
  );
}

// Pastel block card (reference-style)
function BlockCard({ bg = C.peach, ink = C.peachInk, children, style = {}, onClick }) {
  return (
    <div onClick={onClick} style={{
      background: bg, color: ink, borderRadius: 22,
      padding: 18, position: 'relative', overflow: 'hidden',
      cursor: onClick ? 'pointer' : 'default',
      ...style,
    }}>{children}</div>
  );
}

// Dark card (elevated surface)
function DarkCard({ children, style = {}, onClick, border = true, padding = 18 }) {
  return (
    <div onClick={onClick} style={{
      background: C.card, borderRadius: 22, padding,
      border: border ? `1px solid ${C.line}` : 'none',
      position: 'relative',
      cursor: onClick ? 'pointer' : 'default',
      ...style,
    }}>{children}</div>
  );
}

// Pill button
function Pill({ children, bg = C.goldSoft, color = C.gold, active = false, activeBg, activeColor, onClick, style = {}, size = 'md' }) {
  const pad = size === 'sm' ? '6px 12px' : '8px 14px';
  const fs = size === 'sm' ? 11 : 12;
  return (
    <button onClick={onClick} style={{
      background: active ? (activeBg || bg) : 'transparent',
      color: active ? (activeColor || color) : C.mist,
      border: active ? 'none' : `1px solid ${C.line}`,
      borderRadius: 999, padding: pad,
      fontFamily: F.body, fontWeight: 600, fontSize: fs,
      letterSpacing: 0.3, textTransform: 'uppercase',
      cursor: 'pointer', whiteSpace: 'nowrap',
      display: 'inline-flex', alignItems: 'center', gap: 6,
      ...style,
    }}>{children}</button>
  );
}

// Badge (smaller pill, no click)
function Badge({ children, bg = C.goldSoft, color = C.gold, style = {} }) {
  return (
    <span style={{
      background: bg, color, borderRadius: 999,
      padding: '4px 9px', fontFamily: F.body,
      fontWeight: 700, fontSize: 10, letterSpacing: 0.6,
      textTransform: 'uppercase', display: 'inline-flex',
      alignItems: 'center', gap: 4, lineHeight: 1, ...style,
    }}>{children}</span>
  );
}

// Icon tile (rounded square with tinted bg)
function IconTile({ icon, bg = C.goldSoft, color = C.gold, size = 36, radius = 11, iconSize }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: radius,
      background: bg, display: 'flex', alignItems: 'center',
      justifyContent: 'center', flexShrink: 0,
    }}>
      <Icon name={icon} size={iconSize || size * 0.5} color={color} strokeWidth={2.2}/>
    </div>
  );
}

// Primary button (gold)
function PrimaryButton({ children, onClick, style = {}, disabled = false, icon }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      background: disabled ? C.cardHi : C.gold,
      color: disabled ? C.fog : C.peachInk,
      border: 'none', borderRadius: 999, height: 54,
      width: '100%', fontFamily: F.display, fontWeight: 700,
      fontSize: 16, letterSpacing: 0.3, textTransform: 'uppercase',
      cursor: disabled ? 'not-allowed' : 'pointer',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      gap: 8, ...style,
    }}>
      {icon && <Icon name={icon} size={18} color={disabled ? C.fog : C.peachInk}/>}
      {children}
    </button>
  );
}

// Round icon button
function RoundBtn({ icon, onClick, bg = C.card, color = C.bone, size = 40, style = {}, border = C.line, iconSize }) {
  return (
    <button onClick={onClick} style={{
      width: size, height: size, borderRadius: size / 2,
      background: bg, border: border ? `1px solid ${border}` : 'none',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      cursor: 'pointer', flexShrink: 0, ...style,
    }}>
      <Icon name={icon} size={iconSize || size * 0.45} color={color} strokeWidth={2.2}/>
    </button>
  );
}

// Ring chart (sync ring, mood ring, etc)
function ProgressRing({ size = 90, stroke = 8, value = 0.82, colors = [C.peach, C.butter, C.lavender], bg = 'rgba(255,255,255,0.2)', label, labelColor }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <defs>
          <linearGradient id={`rg-${size}-${value}`} x1="0%" y1="0%" x2="100%" y2="100%">
            {colors.map((c, i) => <stop key={i} offset={`${(i/(colors.length-1))*100}%`} stopColor={c}/>)}
          </linearGradient>
        </defs>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={bg} strokeWidth={stroke}/>
        <circle cx={size/2} cy={size/2} r={r} fill="none"
          stroke={`url(#rg-${size}-${value})`} strokeWidth={stroke}
          strokeDasharray={c} strokeDashoffset={c * (1 - value)}
          strokeLinecap="round"/>
      </svg>
      {label && (
        <div style={{
          position: 'absolute', inset: 0, display: 'flex',
          alignItems: 'center', justifyContent: 'center',
          fontFamily: F.display, fontSize: size * 0.26, fontWeight: 700,
          color: labelColor || C.peachInk, letterSpacing: -0.5,
        }}>{label}</div>
      )}
    </div>
  );
}

// Triple ring (signature element from reference)
function TripleRing({ size = 96, values = [0.82, 0.65, 0.9], colors = [C.peach, C.butter, C.lavender], bg = 'rgba(0,0,0,0.25)' }) {
  const strokes = [7, 7, 7];
  const gap = 4;
  const radii = [0, 1, 2].map(i => (size - strokes[i]) / 2 - i * (strokes[i] + gap));
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      {radii.map((r, i) => {
        const c = 2 * Math.PI * r;
        return (
          <g key={i}>
            <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={bg} strokeWidth={strokes[i]}/>
            <circle cx={size/2} cy={size/2} r={r} fill="none"
              stroke={colors[i]} strokeWidth={strokes[i]}
              strokeDasharray={c} strokeDashoffset={c * (1 - values[i])}
              strokeLinecap="round"/>
          </g>
        );
      })}
    </svg>
  );
}

// Section header (label + rule)
function SectionHeader({ label, action }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '0 4px', marginBottom: 12,
    }}>
      <Overline>{label}</Overline>
      {action}
    </div>
  );
}

// Gold horizontal rule (brand element)
function GoldRule({ width = 24, color }) {
  return <div style={{ width, height: 2, background: color || C.gold, borderRadius: 1 }}/>;
}

// Wavy underline (brand element)
function WavyUnderline({ width = 130, color = C.gold, opacity = 0.75 }) {
  return (
    <svg width={width} height="8" viewBox={`0 0 ${width} 8`} style={{ opacity }}>
      <path d={`M0 4 Q ${width*0.125} 0, ${width*0.25} 4 T ${width*0.5} 4 T ${width*0.75} 4 T ${width} 4`}
        fill="none" stroke={color} strokeWidth="2" strokeLinecap="round"/>
    </svg>
  );
}

// Unified screen header (eyebrow + big title + underline + meta row)
// When window.__nativeHeader is true, switches to iOS-style large title layout.
function ScreenHeader({ eyebrow, title, accent = C.gold, meta, action, underlineColor, subtitle, nativeTitle, nativeEyebrow }) {
  const native = window.__nativeHeader;
  if (native) {
    const nTitle = nativeTitle || (title.charAt(0) + title.slice(1).toLowerCase());
    const nEyebrow = nativeEyebrow !== undefined ? nativeEyebrow : (eyebrow ? eyebrow.replace(/^\d+\s*·\s*/, '') : '');
    return (
      <div style={{ marginBottom: 18 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', minHeight: 36, marginBottom: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.4, color: C.fog, textTransform: 'uppercase' }}>
            {nEyebrow || ''}
          </div>
          <div>{action}</div>
        </div>
        <h1 style={{ fontFamily: F.display, fontSize: 34, fontWeight: 700, color: C.bone, margin: 0, lineHeight: 1.05, letterSpacing: -0.8, textTransform: 'none' }}>
          {nTitle}<span style={{ color: accent }}>.</span>
        </h1>
        {(meta || subtitle) && (
          <div style={{ marginTop: 10, display: 'inline-flex', alignItems: 'center', gap: 8,
            background: C.card, border: `1px solid ${C.line}`, borderRadius: 999, padding: '6px 12px',
            fontSize: 10, fontWeight: 700, letterSpacing: 1.2, color: C.mist, textTransform: 'uppercase',
          }}>
            <div style={{ width: 5, height: 5, borderRadius: 3, background: accent }}/>
            {meta || subtitle}
          </div>
        )}
      </div>
    );
  }
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div style={{ flex: 1 }}>
          {eyebrow && <Overline style={{ marginBottom: 8 }}>{eyebrow}</Overline>}
          <div style={{ fontFamily: F.display, fontSize: 42, fontWeight: 700, color: C.bone, letterSpacing: -1.2, lineHeight: 0.95 }}>
            {title}<span style={{ color: accent }}>.</span>
          </div>
        </div>
        {action}
      </div>
      <div style={{ marginTop: 10 }}><WavyUnderline width={96} color={underlineColor || accent}/></div>
      {meta && <div style={{ marginTop: 10, fontSize: 11, color: C.mist, fontWeight: 500, letterSpacing: 0.4 }}>{meta}</div>}
    </div>
  );
}

// Sticky translucent date section header
function StickyDate({ label, count, color = C.gold }) {
  return (
    <div style={{
      position: 'sticky', top: 0, zIndex: 5,
      background: `${C.ink}E6`, backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
      padding: '8px 2px', margin: '0 -2px 8px', display: 'flex', alignItems: 'center', gap: 10,
      borderBottom: `1px solid ${C.line}`,
    }}>
      <div style={{ width: 6, height: 6, borderRadius: 3, background: color }}/>
      <div style={{ fontFamily: F.body, fontSize: 10, fontWeight: 800, letterSpacing: 1.6, textTransform: 'uppercase', color: C.bone }}>{label}</div>
      {count != null && <div style={{ fontSize: 10, fontWeight: 700, color: C.fog }}>{count}</div>}
    </div>
  );
}

// Group items by date bucket, render with sticky headers, collapse after N sections
function DateSectioned({ sections, color = C.gold, maxOpen = 3, renderItem }) {
  const [expanded, setExpanded] = React.useState({});
  return (
    <div style={{ position: 'relative' }}>
      {sections.map((s, i) => {
        const collapsible = i >= maxOpen;
        const open = !collapsible || expanded[s.label];
        const visible = open ? s.items : s.items.slice(0, 0);
        return (
          <div key={s.label} style={{ marginBottom: 18 }}>
            <StickyDate label={s.label} count={s.items.length} color={s.color || color}/>
            {collapsible && !open ? (
              <button onClick={() => setExpanded(e => ({ ...e, [s.label]: true }))} style={{
                width: '100%', background: 'transparent', border: `1px dashed ${C.line}`, borderRadius: 14,
                padding: '12px 14px', color: C.mist, fontFamily: F.body, fontWeight: 600, fontSize: 12,
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}>
                <span>Show {s.items.length} more</span>
                <Icon name="chevronDown" size={14} color={C.mist}/>
              </button>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {(open ? s.items : visible).map((item, j) => renderItem(item, j))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// Sub-screen header (Us/Together children: back + eyebrow + title + plus)
function SubScreenHeader({ eyebrow, title, onBack, onAdd, accent = C.gold }) {
  const native = window.__nativeHeader;
  if (native) {
    return (
      <div style={{ padding: '0 20px 14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', minHeight: 36, marginBottom: 12 }}>
          <button onClick={onBack} style={{
            display: 'inline-flex', alignItems: 'center', gap: 2,
            background: 'transparent', border: 'none', padding: '6px 4px 6px 0',
            color: accent, fontFamily: F.body, fontSize: 15, fontWeight: 600,
            cursor: 'pointer', letterSpacing: -0.2,
          }}>
            <Icon name="chevronLeft" size={20} color={accent}/>
            Back
          </button>
          {onAdd && (
            <button onClick={onAdd} style={{ width: 36, height: 36, borderRadius: 18, background: C.card, border: `1px solid ${C.line}`, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="plus" size={16} color={C.bone} strokeWidth={2.2}/>
            </button>
          )}
        </div>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.4, color: C.fog, textTransform: 'uppercase', marginBottom: 4 }}>
          {eyebrow}
        </div>
        <h1 style={{ fontFamily: F.display, fontSize: 32, fontWeight: 700, color: C.bone, margin: 0, lineHeight: 1.05, letterSpacing: -0.8 }}>
          {title}<span style={{ color: accent }}>.</span>
        </h1>
      </div>
    );
  }
  return (
    <div style={{ padding: '0 20px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, flex: 1, minWidth: 0 }}>
        <button onClick={onBack} style={{ width: 38, height: 38, borderRadius: 19, background: C.card, border: `1px solid ${C.line}`, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Icon name="chevronLeft" size={18} color={C.bone}/>
        </button>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 10, color: C.fog, fontWeight: 700, letterSpacing: 1.2, textTransform: 'uppercase' }}>{eyebrow}</div>
          <div style={{ fontFamily: F.display, fontSize: 26, fontWeight: 700, color: C.bone, letterSpacing: -0.6, lineHeight: 1 }}>
            {title}<span style={{ color: accent }}>.</span>
          </div>
        </div>
      </div>
      {onAdd && (
        <button onClick={onAdd} style={{ width: 38, height: 38, borderRadius: 19, background: C.gold, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Icon name="plus" size={18} color={C.peachInk} strokeWidth={2.5}/>
        </button>
      )}
    </div>
  );
}

Object.assign(window, {
  CouplRings, Avatar, Overline, Display, BlockCard, DarkCard,
  Pill, Badge, IconTile, PrimaryButton, RoundBtn,
  ProgressRing, TripleRing, SectionHeader, GoldRule, WavyUnderline,
  ScreenHeader, StickyDate, DateSectioned, SubScreenHeader,
});

})();
