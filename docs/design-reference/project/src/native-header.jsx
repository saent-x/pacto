(() => {
// iOS 26 / Liquid Glass inspired native header — large left-aligned title,
// inline chip subtitle, right-side actions. Sits at the top of a screen.
const { coupl: C, fonts: F, Icon } = window;

function HeaderBtn({ icon, size = 36, onClick, bg = C.card, color = C.bone, ring = C.line }) {
  return (
    <button onClick={onClick} style={{
      width: size, height: size, borderRadius: size / 2,
      background: bg, border: `1px solid ${ring}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      cursor: 'pointer', flexShrink: 0,
    }}>
      <Icon name={icon} size={Math.round(size * 0.44)} color={color}/>
    </button>
  );
}

function NativeHeader({ title, eyebrow, chip, right, left, align = 'left', back, onBack, pad = true, accent }) {
  return (
    <div style={{
      paddingTop: pad ? 54 : 0,
      paddingBottom: 14,
      marginBottom: 14,
      position: 'relative',
    }}>
      {/* Top row — back / left action · right actions */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        minHeight: 36, marginBottom: 14,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {back ? (
            <button onClick={onBack} style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              background: 'transparent', border: 'none', padding: '6px 4px',
              color: C.gold, fontFamily: F.body, fontSize: 15, fontWeight: 600,
              cursor: 'pointer', letterSpacing: -0.2,
            }}>
              <Icon name="chevronLeft" size={18} color={C.gold}/>
              {typeof back === 'string' ? back : 'Back'}
            </button>
          ) : left || <div/>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>{right}</div>
      </div>

      {/* Large title block */}
      <div style={{ textAlign: align }}>
        {eyebrow && (
          <div style={{
            fontSize: 11, fontWeight: 700, letterSpacing: 1.4,
            color: C.fog, textTransform: 'uppercase', marginBottom: 6,
          }}>{eyebrow}</div>
        )}
        <h1 style={{
          fontFamily: F.display, fontSize: 34, fontWeight: 700,
          color: C.bone, margin: 0, lineHeight: 1.05,
          letterSpacing: -0.8,
        }}>
          {title}
          {accent !== false && <span style={{ color: C.gold }}>.</span>}
        </h1>
        {chip && (
          <div style={{
            marginTop: 10,
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: C.card, border: `1px solid ${C.line}`, borderRadius: 999,
            padding: '6px 12px',
            fontSize: 10, fontWeight: 700, letterSpacing: 1.2,
            color: C.mist, textTransform: 'uppercase',
          }}>{chip}</div>
        )}
      </div>
    </div>
  );
}

// Variant for search/segmented control attached under the title
function NativeHeaderSearch({ placeholder = 'Search', value, onChange, right }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      background: C.card, border: `1px solid ${C.line}`, borderRadius: 12,
      padding: '10px 12px', marginBottom: 14,
    }}>
      <Icon name="search" size={14} color={C.fog}/>
      <input
        value={value || ''}
        onChange={e => onChange && onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          flex: 1, background: 'transparent', border: 'none', outline: 'none',
          color: C.bone, fontFamily: F.body, fontSize: 14,
        }}
      />
      {right}
    </div>
  );
}

Object.assign(window, { NativeHeader, HeaderBtn, NativeHeaderSearch });
})();
