/* AD.FACTORY — shared UI atoms. Exports to window. -------------------------- */

/* Flat-gradient fill: renders a solid as a background-IMAGE so it survives the
   live-editor's button background-color stripping. Identical color in export. */
const FILL = (c) => (c && c !== 'transparent') ? `linear-gradient(0deg, ${c} 0%, ${c} 100%)` : 'none';

/* ---- Icons: inline Lucide-style paths, 1.75 stroke, round caps ----------- */
const AF_ICONS = {
  grid: 'M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z',
  film: 'M4 3h16a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zM7 3v18M17 3v18M3 8h4M3 16h4M17 8h4M17 16h4',
  filetext: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M9 13h6M9 17h6M9 9h1',
  clipboard: 'M9 2h6a1 1 0 0 1 1 1v1a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1zM8 4H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-2',
  plus: 'M12 5v14M5 12h14',
  search: 'M11 11m-7 0a7 7 0 1 0 14 0a7 7 0 1 0-14 0M21 21l-4.3-4.3',
  chevdown: 'M6 9l6 6 6-6',
  chevright: 'M9 6l6 6-6 6',
  chevleft: 'M15 6l-6 6 6 6',
  check: 'M20 6L9 17l-5-5',
  x: 'M18 6L6 18M6 6l12 12',
  play: 'M6 4l14 8-14 8z',
  star: 'M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 21.4 6.1 24l1.2-6.5L2.5 9.4l6.6-.9z',
  filter: 'M3 5h18l-7 8v6l-4 2v-8z',
  sliders: 'M4 6h10M18 6h2M4 12h2M10 12h10M4 18h8M16 18h4M14 4v4M6 10v4M12 16v4',
  bell: 'M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0',
  settings: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-2.7 1.1V21a2 2 0 0 1-4 0v-.1A1.6 1.6 0 0 0 6.6 19l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0-1.1-2.7H2a2 2 0 0 1 0-4h.1A1.6 1.6 0 0 0 3.6 6.6l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 2.7-1.1V2a2 2 0 0 1 4 0v.1a1.6 1.6 0 0 0 2.7 1.1l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0 1.1 2.7H22a2 2 0 0 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z',
  user: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
  logout: 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9',
  arrowright: 'M5 12h14M13 6l6 6-6 6',
  arrowleft: 'M19 12H5M11 18l-6-6 6-6',
  kebab: 'M12 5h.01M12 12h.01M12 19h.01',
  upload: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12',
  download: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3',
  clock: 'M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0-18 0M12 7v5l3 2',
  wand: 'M15 4V2M15 10V8M11.5 6.5H13M17 6.5h1.5M3 21l11-11M18 4l1.5 1.5M14.5 7.5L13 6',
  globe: 'M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0-18 0M3 12h18M12 3a14 14 0 0 1 0 18 14 14 0 0 1 0-18z',
  calendar: 'M3 5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM3 9h18M8 3v4M16 3v4',
  eye: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
  trash: 'M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6M10 11v6M14 11v6',
  edit: 'M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7M18.5 2.5a2.1 2.1 0 0 1 3 3L12 15l-4 1 1-4z',
  copy: 'M9 9h11a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1V10a1 1 0 0 1 1-1zM5 15H4a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1h11a1 1 0 0 1 1 1v1',
  panelleft: 'M3 4a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM9 3v18',
  layers: 'M12 2L2 7l10 5 10-5zM2 17l10 5 10-5M2 12l10 5 10-5',
  zap: 'M13 2L3 14h7l-1 8 10-12h-7z',
  refresh: 'M21 2v6h-6M3 22v-6h6M3 11a9 9 0 0 1 15-6l3 3M21 13a9 9 0 0 1-15 6l-3-3',
  check_circle: 'M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0-18 0M9 12l2 2 4-4',
  alert: 'M12 9v4M12 17h.01M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z',
  send: 'M22 2L11 13M22 2l-7 20-4-9-9-4z',
  scissors: 'M6 6m-3 0a3 3 0 1 0 6 0a3 3 0 1 0-6 0M6 18m-3 0a3 3 0 1 0 6 0a3 3 0 1 0-6 0M20 4L8.1 15.9M14.5 12.5L20 20M8.1 8.1L12 12',
  folder: 'M3 7a2 2 0 0 1 2-2h4l2 3h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z',
  sparkles: 'M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9zM19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z',
  external: 'M15 3h6v6M10 14L21 3M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6',
  dot: 'M12 12m-3 0a3 3 0 1 0 6 0a3 3 0 1 0-6 0',
};

function Icon({ name, size = 18, stroke = 1.75, fill, style, className }) {
  const d = AF_ICONS[name];
  const filled = name === 'play' || name === 'star' || name === 'dot';
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true"
      className={className}
      style={{ flexShrink: 0, display: 'block', ...style }}
      fill={filled ? (fill || 'currentColor') : 'none'}
      stroke={filled ? 'none' : 'currentColor'}
      strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}

/* ---- Button -------------------------------------------------------------- */
function Button({ children, variant = 'primary', size = 'md', icon, iconRight, full, onClick, disabled, title, type, style }) {
  const [hover, setHover] = React.useState(false);
  const [press, setPress] = React.useState(false);
  const h = size === 'sm' ? 36 : size === 'lg' ? 'var(--ctrl-h)' : 'var(--ctrl-h)';
  const base = {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    gap: 8, height: h, padding: size === 'sm' ? '0 14px' : '0 20px',
    borderRadius: 'var(--r-pill)', fontWeight: 600,
    fontSize: size === 'sm' ? 13 : 14.5, letterSpacing: '-0.01em',
    cursor: disabled ? 'not-allowed' : 'pointer', border: '1px solid transparent',
    width: full ? '100%' : 'auto', whiteSpace: 'nowrap',
    transition: 'background .16s, opacity .16s, transform .12s, border-color .16s',
    transform: press ? 'scale(0.98)' : 'scale(1)',
    opacity: disabled ? 0.5 : 1, ...style,
  };
  const variants = {
    primary: { bg: 'var(--btn-primary-bg)', color: 'var(--btn-primary-ink)', borderColor: 'transparent' },
    secondary: { bg: 'var(--btn-secondary-bg)', color: 'var(--btn-secondary-ink)', borderColor: 'var(--btn-secondary-bd)' },
    ghost: { bg: hover ? 'var(--surface-3)' : 'transparent', color: 'var(--text-1)' },
    danger: { bg: 'var(--danger-soft)', color: 'var(--danger)', borderColor: 'transparent' },
    soft: { bg: hover ? 'var(--surface-3)' : 'var(--surface-2b)', color: 'var(--text-1)', borderColor: 'var(--border)' },
  };
  const vs = { ...variants[variant] };
  if (hover && !disabled) {
    if (variant === 'primary') vs.bg = 'var(--btn-primary-hover)';
    if (variant === 'secondary') vs.bg = 'var(--surface-3)';
  }
  return (
    <button type={type || 'button'} title={title} disabled={disabled} onClick={onClick}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => { setHover(false); setPress(false); }}
      onMouseDown={() => setPress(true)} onMouseUp={() => setPress(false)}
      style={{ ...base, color: vs.color, borderColor: vs.borderColor, backgroundColor: vs.bg, backgroundImage: FILL(vs.bg) }}>
      {icon && <Icon name={icon} size={size === 'sm' ? 15 : 17} />}
      {children}
      {iconRight && <Icon name={iconRight} size={size === 'sm' ? 15 : 17} />}
    </button>
  );
}

function IconButton({ name, onClick, title, size = 36, active, badge }) {
  const [hover, setHover] = React.useState(false);
  return (
    <button title={title} onClick={onClick} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{
        position: 'relative', width: size, height: size, display: 'grid', placeItems: 'center',
        borderRadius: 10, border: '1px solid', cursor: 'pointer',
        borderColor: active ? 'var(--border-strong)' : 'transparent',
        backgroundColor: active ? 'var(--surface-3)' : hover ? 'var(--surface-3)' : 'transparent',
        backgroundImage: FILL(active || hover ? 'var(--surface-3)' : 'transparent'),
        color: active ? 'var(--text-1)' : 'var(--text-2)', transition: 'background .15s, color .15s',
      }}>
      <Icon name={name} size={18} />
      {badge ? <span style={{ position: 'absolute', top: 6, right: 6, width: 7, height: 7, borderRadius: 999, background: 'var(--accent)' }} /> : null}
    </button>
  );
}

/* ---- Card ---------------------------------------------------------------- */
function Card({ children, style, pad = true, hover, onClick }) {
  const [h, setH] = React.useState(false);
  return (
    <div onClick={onClick} onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
      style={{
        background: 'var(--surface-2)', border: '1px solid var(--border)',
        borderRadius: 'var(--r-card)', boxShadow: 'var(--shadow-card)',
        padding: pad ? 'var(--pad-card)' : 0, transition: 'border-color .15s, transform .15s',
        cursor: onClick ? 'pointer' : 'default',
        borderColor: hover && h ? 'var(--border-strong)' : 'var(--border)',
        transform: hover && h ? 'translateY(-2px)' : 'none', ...style,
      }}>
      {children}
    </div>
  );
}

/* ---- Status pill --------------------------------------------------------- */
const STATUS_STYLE = {
  'Draft':         { c: 'var(--text-2)', b: 'var(--surface-3)' },
  'Submitted':     { c: 'var(--info)', b: 'var(--tint-sky)' },
  'In production': { c: 'var(--warning)', b: 'rgba(246,198,66,0.15)' },
  'Rendering':     { c: 'var(--brand-teal)', b: 'rgba(72,218,186,0.15)' },
  'Review':        { c: 'var(--link)', b: 'var(--tint-violet)' },
  'Delivered':     { c: 'var(--success)', b: 'var(--accent-soft)' },
  'approved':      { c: 'var(--success)', b: 'var(--accent-soft)', label: 'Approved' },
  'review':        { c: 'var(--link)', b: 'var(--tint-violet)', label: 'In review' },
  'missing':       { c: 'var(--danger)', b: 'var(--danger-soft)', label: 'Missing' },
};
function StatusPill({ status, dot = true }) {
  const s = STATUS_STYLE[status] || { c: 'var(--text-2)', b: 'var(--surface-3)' };
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px 4px 8px',
      borderRadius: 'var(--r-pill)', background: s.b, color: s.c,
      fontSize: 12.5, fontWeight: 600, letterSpacing: '-0.01em', whiteSpace: 'nowrap',
    }}>
      {dot && <span style={{ width: 6, height: 6, borderRadius: 999, background: 'currentColor' }} />}
      {s.label || status}
    </span>
  );
}

function Tag({ children, onClick, active }) {
  return (
    <span onClick={onClick} style={{
      display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 9px',
      borderRadius: 'var(--r-chip)', fontSize: 12, fontWeight: 500,
      background: active ? 'var(--accent-soft)' : 'var(--surface-3)',
      color: active ? 'var(--accent)' : 'var(--text-2)',
      border: '1px solid', borderColor: active ? 'var(--accent-ring)' : 'transparent',
      cursor: onClick ? 'pointer' : 'default',
    }}>{children}</span>
  );
}

/* ---- Inputs -------------------------------------------------------------- */
function Field({ label, children, hint, error, style }) {
  return (
    <label style={{ display: 'block', ...style }}>
      {label && <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-2)', marginBottom: 7, letterSpacing: '-0.01em' }}>{label}</div>}
      {children}
      {error ? <div style={{ fontSize: 12.5, color: 'var(--danger)', marginTop: 6 }}>{error}</div>
        : hint ? <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 6 }}>{hint}</div> : null}
    </label>
  );
}

function Input({ value, onChange, placeholder, icon, type, error, onKeyDown, autoFocus, style }) {
  const [focus, setFocus] = React.useState(false);
  return (
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
      {icon && <span style={{ position: 'absolute', left: 13, color: 'var(--text-3)', pointerEvents: 'none' }}><Icon name={icon} size={17} /></span>}
      <input value={value} type={type || 'text'} placeholder={placeholder} autoFocus={autoFocus}
        onChange={(e) => onChange && onChange(e.target.value)} onKeyDown={onKeyDown}
        onFocus={() => setFocus(true)} onBlur={() => setFocus(false)}
        style={{
          width: '100%', height: 'var(--ctrl-h)', padding: icon ? '0 14px 0 40px' : '0 14px',
          borderRadius: 'var(--r-input)', background: 'var(--surface-1)',
          border: '1px solid', color: 'var(--text-1)', fontSize: 14.5, fontFamily: 'inherit', outline: 'none',
          borderColor: error ? 'var(--danger)' : focus ? 'var(--border-strong)' : 'var(--border)',
          boxShadow: focus && !error ? '0 0 0 3px var(--accent-ring)' : 'none',
          transition: 'border-color .15s, box-shadow .15s', ...style,
        }} />
    </div>
  );
}

function Select({ value, onChange, options, style }) {
  return (
    <div style={{ position: 'relative', ...style }}>
      <select value={value} onChange={(e) => onChange && onChange(e.target.value)}
        style={{
          width: '100%', height: 'var(--ctrl-h)', padding: '0 36px 0 14px', appearance: 'none',
          borderRadius: 'var(--r-input)', background: 'var(--surface-1)', border: '1px solid var(--border)',
          color: 'var(--text-1)', fontSize: 14.5, fontFamily: 'inherit', cursor: 'pointer', outline: 'none',
        }}>
        {options.map(o => <option key={o.value ?? o} value={o.value ?? o}>{o.label ?? o}</option>)}
      </select>
      <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)', pointerEvents: 'none' }}>
        <Icon name="chevdown" size={16} />
      </span>
    </div>
  );
}

/* ---- Segmented control --------------------------------------------------- */
function Segmented({ value, onChange, options, size = 'md' }) {
  return (
    <div style={{ display: 'inline-flex', padding: 3, gap: 2, background: 'var(--surface-1)', border: '1px solid var(--border)', borderRadius: 'var(--r-pill)' }}>
      {options.map(o => {
        const v = o.value ?? o; const active = v === value;
        return (
          <button key={v} onClick={() => onChange(v)} style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            height: size === 'sm' ? 28 : 34, padding: size === 'sm' ? '0 12px' : '0 16px',
            borderRadius: 'var(--r-pill)', border: 'none', cursor: 'pointer',
            fontSize: size === 'sm' ? 12.5 : 13.5, fontWeight: 600, fontFamily: 'inherit',
            backgroundColor: active ? 'var(--surface-3)' : 'transparent',
            backgroundImage: FILL(active ? 'var(--surface-3)' : 'transparent'),
            color: active ? 'var(--text-1)' : 'var(--text-2)',
            boxShadow: active ? 'var(--shadow-card)' : 'none', transition: 'background .15s, color .15s',
          }}>
            {o.icon && <Icon name={o.icon} size={15} />}{o.label ?? v}
          </button>
        );
      })}
    </div>
  );
}

/* ---- Progress + sparkline ------------------------------------------------ */
function Progress({ value, color }) {
  return (
    <div style={{ height: 6, borderRadius: 999, background: 'var(--surface-3)', overflow: 'hidden' }}>
      <div style={{ width: value + '%', height: '100%', borderRadius: 999, background: color || 'var(--accent)', transition: 'width .5s var(--ease, ease)' }} />
    </div>
  );
}

function Sparkline({ data, color, w = 92, h = 30 }) {
  const max = Math.max(...data), min = Math.min(...data);
  const pts = data.map((d, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((d - min) / (max - min || 1)) * (h - 4) - 2;
    return [x, y];
  });
  const path = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
  const area = path + ` L${w} ${h} L0 ${h} Z`;
  return (
    <svg width={w} height={h} style={{ display: 'block' }}>
      <path d={area} fill={color || 'var(--accent)'} opacity="0.13" />
      <path d={path} fill="none" stroke={color || 'var(--accent)'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ---- Video thumbnail ----------------------------------------------------- */
function Thumb({ clip, selected, onClick, h = 'auto', showPlay = true }) {
  const [hover, setHover] = React.useState(false);
  const ratio = clip.aspect === '16:9' ? '16 / 9' : clip.aspect === '1:1' ? '1 / 1' : '9 / 16';
  return (
    <div onClick={onClick} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{
        position: 'relative', aspectRatio: ratio, height: h, borderRadius: 12, overflow: 'hidden',
        background: `linear-gradient(150deg, ${clip.color}, ${clip.color}cc 55%, #0d0f10 140%)`,
        cursor: onClick ? 'pointer' : 'default',
        outline: selected ? '2.5px solid var(--accent)' : '1px solid var(--border)',
        outlineOffset: selected ? '0' : '-1px', transition: 'outline .15s',
      }}>
      {/* faux film grid lines */}
      <div style={{ position: 'absolute', inset: 0, background: 'repeating-linear-gradient(180deg, transparent 0, transparent 13px, rgba(0,0,0,0.07) 13px, rgba(0,0,0,0.07) 14px)', opacity: 0.5 }} />
      {showPlay && (
        <div style={{
          position: 'absolute', inset: 0, display: 'grid', placeItems: 'center',
          background: hover ? 'rgba(0,0,0,0.18)' : 'transparent', transition: 'background .15s',
        }}>
          <div style={{
            width: 40, height: 40, borderRadius: 999, display: 'grid', placeItems: 'center',
            background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)', color: '#fff',
            transform: hover ? 'scale(1.08)' : 'scale(1)', transition: 'transform .15s',
          }}>
            <Icon name="play" size={16} fill="#fff" />
          </div>
        </div>
      )}
      <span style={{ position: 'absolute', top: 8, left: 8, fontSize: 10.5, fontWeight: 700, color: 'rgba(255,255,255,0.85)', background: 'rgba(0,0,0,0.4)', padding: '2px 7px', borderRadius: 6, letterSpacing: '0.02em' }}>{clip.aspect}</span>
      <span className="mono" style={{ position: 'absolute', bottom: 8, right: 8, fontSize: 11, fontWeight: 600, color: '#fff', background: 'rgba(0,0,0,0.55)', padding: '2px 7px', borderRadius: 6 }}>0:{String(clip.duration).padStart(2, '0')}</span>
      {selected && (
        <span style={{ position: 'absolute', top: 8, right: 8, width: 22, height: 22, borderRadius: 999, background: 'var(--accent)', color: 'var(--text-on-accent)', display: 'grid', placeItems: 'center' }}>
          <Icon name="check" size={13} stroke={2.5} />
        </span>
      )}
    </div>
  );
}

/* ---- Avatar -------------------------------------------------------------- */
function Avatar({ name, size = 30 }) {
  const init = name.split(' ').map(s => s[0]).slice(0, 2).join('');
  const hues = ['#2e6b57', '#365b7a', '#7a5a36', '#6b3550', '#4b3a6b'];
  const hue = hues[name.length % hues.length];
  return (
    <div style={{
      width: size, height: size, borderRadius: 999, flexShrink: 0, background: hue, color: '#fff',
      display: 'grid', placeItems: 'center', fontSize: size * 0.38, fontWeight: 700, letterSpacing: '0.01em',
    }}>{init}</div>
  );
}

/* ---- Drawer (right side) ------------------------------------------------- */
function Drawer({ open, onClose, children, width = 460, title, footer }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 60, pointerEvents: open ? 'auto' : 'none' }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', opacity: open ? 1 : 0, transition: 'opacity .25s' }} />
      <div style={{
        position: 'absolute', top: 0, right: 0, bottom: 0, width, maxWidth: '92vw',
        background: 'var(--surface-1)', borderLeft: '1px solid var(--border)', boxShadow: 'var(--shadow-pop)',
        transform: open ? 'translateX(0)' : 'translateX(100%)', transition: 'transform .28s var(--ease, cubic-bezier(0.3,0,0,1))',
        display: 'flex', flexDirection: 'column',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 22px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ fontSize: 16, fontWeight: 700 }}>{title}</div>
          <IconButton name="x" onClick={onClose} />
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: 22 }}>{children}</div>
        {footer && <div style={{ padding: 18, borderTop: '1px solid var(--border)', display: 'flex', gap: 10 }}>{footer}</div>}
      </div>
    </div>
  );
}

/* ---- misc ---------------------------------------------------------------- */
function SectionLabel({ children, right }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--gap-sm)' }}>
      <div style={{ fontSize: 12.5, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--text-3)' }}>{children}</div>
      {right}
    </div>
  );
}

function EmptyState({ icon, title, sub, action }) {
  return (
    <div style={{ textAlign: 'center', padding: '56px 20px', color: 'var(--text-2)' }}>
      <div style={{ width: 56, height: 56, borderRadius: 16, background: 'var(--surface-3)', display: 'grid', placeItems: 'center', margin: '0 auto 16px', color: 'var(--text-3)' }}>
        <Icon name={icon} size={26} />
      </div>
      <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-1)', marginBottom: 6 }}>{title}</div>
      <div style={{ fontSize: 13.5, maxWidth: 320, margin: '0 auto 18px' }}>{sub}</div>
      {action}
    </div>
  );
}

Object.assign(window, {
  FILL, Icon, Button, IconButton, Card, StatusPill, Tag, Field, Input, Select,
  Segmented, Progress, Sparkline, Thumb, Avatar, Drawer, SectionLabel, EmptyState,
});
