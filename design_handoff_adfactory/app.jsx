/* AD.FACTORY — app shell, routing, workspace switch, theme + tweaks ------- */

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "theme": "dark",
  "density": "regular",
  "font": "Manrope",
  "nav": "sidebar"
}/*EDITMODE-END*/;

const FONTS = {
  Manrope: "'Manrope', system-ui, sans-serif",
  Inter: "'Inter', system-ui, sans-serif",
  Figtree: "'Figtree', system-ui, sans-serif",
  System: "system-ui, -apple-system, 'Segoe UI', sans-serif",
};

const NAV = {
  admin: [
    { key: 'dashboard', label: 'Dashboard', icon: 'grid' },
    { key: 'clips', label: 'Clip library', icon: 'film' },
    { key: 'copy', label: 'Copy mapping', icon: 'filetext' },
    { key: 'orders', label: 'Orders', icon: 'clipboard' },
  ],
  portal: [
    { key: 'dashboard', label: 'Overview', icon: 'grid' },
    { key: 'clips', label: 'Browse clips', icon: 'film' },
    { key: 'orders', label: 'My orders', icon: 'clipboard' },
  ],
};

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [authed, setAuthed] = React.useState(false);
  const [user, setUser] = React.useState({ name: 'Mark Viidik', email: 'mark@creditstar.com' });
  const [ws, setWs] = React.useState('admin');
  const [route, setRoute] = React.useState('dashboard');
  const [orderId, setOrderId] = React.useState(null);
  const [preview, setPreview] = React.useState(null);
  const [submitted, setSubmitted] = React.useState(false);

  React.useEffect(() => {
    const r = document.documentElement;
    r.setAttribute('data-theme', t.theme);
    r.setAttribute('data-density', t.density);
    r.style.setProperty('--app-font', FONTS[t.font] || FONTS.Manrope);
  }, [t.theme, t.density, t.font]);

  const go = (key, id) => {
    setRoute(key);
    if (key === 'orders') { setOrderId(id || null); }
    if (key !== 'orders') setSubmitted(false);
    window.scrollTo(0, 0);
    const main = document.getElementById('af-main'); if (main) main.scrollTop = 0;
  };

  const switchWs = (next) => { setWs(next); setRoute('dashboard'); setSubmitted(false); };

  const onSubmitOrder = () => { setSubmitted(true); go('orders'); };

  if (!authed) {
    return (
      <React.Fragment>
        <LoginScreen onAuth={(email) => { setUser({ name: email.split('@')[0].replace(/\./g, ' ').replace(/\b\w/g, c => c.toUpperCase()) || 'Mark Viidik', email }); setAuthed(true); }} />
        <Tweaks t={t} setTweak={setTweak} />
      </React.Fragment>
    );
  }

  const nav = NAV[ws];
  const topnav = t.nav === 'topnav';

  const screen = (() => {
    switch (route) {
      case 'dashboard': return <Dashboard user={user} go={go} />;
      case 'clips': return <ClipLibrary portal={ws === 'portal'} go={go} onPreview={setPreview} />;
      case 'copy': return <CopyMapping onPreview={setPreview} />;
      case 'orders': return <Orders go={go} openId={orderId} justSubmitted={submitted} />;
      case 'builder': return <OrderBuilder go={go} onSubmit={onSubmitOrder} onPreview={setPreview} />;
      default: return <Dashboard user={user} go={go} />;
    }
  })();

  return (
    <div style={{ minHeight: '100vh', display: topnav ? 'block' : 'grid', gridTemplateColumns: topnav ? undefined : '252px 1fr' }}>
      {topnav
        ? <TopNav ws={ws} switchWs={switchWs} nav={nav} route={route} go={go} user={user} onLogout={() => setAuthed(false)} />
        : <Sidebar ws={ws} switchWs={switchWs} nav={nav} route={route} go={go} user={user} onLogout={() => setAuthed(false)} />}

      <div id="af-main" style={{ height: topnav ? 'calc(100vh - 64px)' : '100vh', overflowY: 'auto' }}>
        {screen}
      </div>

      <Drawer open={!!preview} onClose={() => setPreview(null)} title={preview ? preview.id : ''}
        footer={preview && <React.Fragment><Button variant="secondary" icon="download" full>Download</Button>{ws === 'portal' ? <Button icon="plus" full onClick={() => { setPreview(null); go('builder'); }}>Use in order</Button> : <Button icon="edit" full>Edit tags</Button>}</React.Fragment>}>
        {preview && <ClipPreview clip={preview} />}
      </Drawer>

      <Tweaks t={t} setTweak={setTweak} />
    </div>
  );
}

/* ---- Sidebar ------------------------------------------------------------- */
function Sidebar({ ws, switchWs, nav, route, go, user, onLogout }) {
  return (
    <aside style={{ background: 'var(--surface-1)', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', height: '100vh', position: 'sticky', top: 0 }}>
      <div style={{ padding: '20px 18px 14px' }}>
        <BrandLockup />
      </div>
      <div style={{ padding: '0 14px 14px' }}>
        <WorkspaceSwitch ws={ws} switchWs={switchWs} />
      </div>
      <nav style={{ flex: 1, padding: '4px 12px', display: 'flex', flexDirection: 'column', gap: 3 }}>
        {nav.map(n => <NavItem key={n.key} item={n} active={route === n.key} onClick={() => go(n.key)} />)}
        {ws === 'portal' && (
          <div style={{ marginTop: 14 }}>
            <Button full icon="plus" onClick={() => go('builder')}>Start an order</Button>
          </div>
        )}
      </nav>
      <div style={{ padding: 14, borderTop: '1px solid var(--border)' }}>
        <UserChip user={user} onLogout={onLogout} />
      </div>
    </aside>
  );
}

function TopNav({ ws, switchWs, nav, route, go, user, onLogout }) {
  return (
    <header style={{ height: 64, background: 'var(--surface-1)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 20, padding: '0 24px', position: 'sticky', top: 0, zIndex: 40 }}>
      <BrandLockup />
      <div style={{ width: 1, height: 26, background: 'var(--border)' }} />
      <WorkspaceSwitch ws={ws} switchWs={switchWs} compact />
      <nav style={{ display: 'flex', gap: 4, marginLeft: 8 }}>
        {nav.map(n => (
          <button key={n.key} onClick={() => go(n.key)} style={{
            display: 'inline-flex', alignItems: 'center', gap: 8, height: 38, padding: '0 14px', borderRadius: 10,
            border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 14, fontWeight: route === n.key ? 700 : 500,
            background: route === n.key ? 'var(--surface-3)' : 'transparent', backgroundImage: FILL(route === n.key ? 'var(--surface-3)' : 'transparent'), color: route === n.key ? 'var(--text-1)' : 'var(--text-2)',
          }}><Icon name={n.icon} size={17} />{n.label}</button>
        ))}
      </nav>
      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
        <IconButton name="bell" badge />
        <UserChip user={user} onLogout={onLogout} compact />
      </div>
    </header>
  );
}

function WorkspaceSwitch({ ws, switchWs, compact }) {
  return (
    <div style={{ display: 'flex', padding: 3, gap: 2, background: 'var(--surface-0)', border: '1px solid var(--border)', borderRadius: 12 }}>
      {[['admin', 'AD.FACTORY', 'sliders'], ['portal', 'Growth Portal', 'zap']].map(([k, label, icon]) => (
        <button key={k} onClick={() => switchWs(k)} title={label} style={{
          display: 'inline-flex', alignItems: 'center', gap: 7, height: 32, padding: compact ? '0 12px' : '0 10px', flex: compact ? 'none' : 1, justifyContent: 'center',
          borderRadius: 9, border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 12.5, fontWeight: 700,
          background: ws === k ? 'var(--surface-2)' : 'transparent', backgroundImage: FILL(ws === k ? 'var(--surface-2)' : 'transparent'), color: ws === k ? 'var(--text-1)' : 'var(--text-3)',
          boxShadow: ws === k ? 'var(--shadow-card)' : 'none', whiteSpace: 'nowrap',
        }}><Icon name={icon} size={14} />{compact ? label : label.replace('AD.FACTORY', 'Admin').replace('Growth ', '')}</button>
      ))}
    </div>
  );
}

function NavItem({ item, active, onClick }) {
  const [h, setH] = React.useState(false);
  return (
    <button onClick={onClick} onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)} style={{
      display: 'flex', alignItems: 'center', gap: 11, height: 42, padding: '0 12px', borderRadius: 11,
      border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 14.5, fontWeight: active ? 700 : 500,
      background: active ? 'var(--surface-3)' : h ? 'var(--surface-2b)' : 'transparent',
      backgroundImage: FILL(active ? 'var(--surface-3)' : h ? 'var(--surface-2b)' : 'transparent'),
      color: active ? 'var(--text-1)' : 'var(--text-2)', textAlign: 'left', width: '100%', transition: 'background .14s',
    }}>
      <span style={{ color: active ? 'var(--accent)' : 'inherit', display: 'flex' }}><Icon name={item.icon} size={19} /></span>
      {item.label}
    </button>
  );
}

function UserChip({ user, onLogout, compact }) {
  const [open, setOpen] = React.useState(false);
  return (
    <div style={{ position: 'relative' }}>
      <button onClick={() => setOpen(o => !o)} style={{ display: 'flex', alignItems: 'center', gap: 10, width: compact ? 'auto' : '100%', padding: compact ? 4 : '7px 8px', borderRadius: 11, border: 'none', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit' }}>
        <Avatar name={user.name} size={32} />
        {!compact && <div style={{ flex: 1, textAlign: 'left', minWidth: 0 }}>
          <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text-1)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.name}</div>
          <div style={{ fontSize: 11.5, color: 'var(--text-3)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.email}</div>
        </div>}
        {!compact && <Icon name="chevdown" size={15} style={{ color: 'var(--text-3)' }} />}
      </button>
      {open && (
        <React.Fragment>
          <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 40 }} />
          <div style={{ position: 'absolute', bottom: compact ? 'auto' : '110%', top: compact ? '120%' : 'auto', right: 0, left: compact ? 'auto' : 0, zIndex: 41, background: 'var(--surface-2)', border: '1px solid var(--border-strong)', borderRadius: 12, boxShadow: 'var(--shadow-pop)', padding: 6, minWidth: 180 }}>
            {[['user', 'Account'], ['settings', 'Settings']].map(m => (
              <button key={m[1]} style={menuItemStyle}><Icon name={m[0]} size={16} />{m[1]}</button>
            ))}
            <div style={{ height: 1, background: 'var(--divider)', margin: '4px 0' }} />
            <button onClick={onLogout} style={{ ...menuItemStyle, color: 'var(--danger)' }}><Icon name="logout" size={16} />Sign out</button>
          </div>
        </React.Fragment>
      )}
    </div>
  );
}
const menuItemStyle = { display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '9px 10px', borderRadius: 9, border: 'none', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13.5, fontWeight: 500, color: 'var(--text-1)', textAlign: 'left' };

/* ---- Clip preview -------------------------------------------------------- */
function ClipPreview({ clip }) {
  const m = window.AF.marketOf(clip.market);
  return (
    <div>
      <Thumb clip={clip} h={clip.aspect === '9:16' ? 360 : 'auto'} />
      <h2 style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.02em', margin: '18px 0 6px' }}>{clip.name}</h2>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 18 }}>
        {clip.tags.map(tg => <Tag key={tg}>{tg}</Tag>)}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {[['Category', clip.category], ['Market', m.flag + ' ' + m.name], ['Duration', '0:' + String(clip.duration).padStart(2, '0')], ['Aspect', clip.aspect], ['Resolution', clip.resolution], ['Used in', clip.usedCount + ' orders']].map(x => (
          <div key={x[0]} style={{ padding: 12, borderRadius: 12, background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{x[0]}</div>
            <div style={{ fontSize: 14, fontWeight: 700, marginTop: 3 }}>{x[1]}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---- Tweaks panel -------------------------------------------------------- */
function Tweaks({ t, setTweak }) {
  return (
    <TweaksPanel title="Tweaks">
      <TweakSection label="Surface" />
      <TweakRadio label="Theme" value={t.theme} options={['dark', 'light']} onChange={(v) => setTweak('theme', v)} />
      <TweakRadio label="Density" value={t.density} options={['compact', 'regular', 'comfy']} onChange={(v) => setTweak('density', v)} />
      <TweakSection label="Navigation" />
      <TweakRadio label="Layout" value={t.nav} options={['sidebar', 'topnav']} onChange={(v) => setTweak('nav', v)} />
      <TweakSection label="Type" />
      <TweakSelect label="Font family" value={t.font} options={['Manrope', 'Inter', 'Figtree', 'System']} onChange={(v) => setTweak('font', v)} />
    </TweaksPanel>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
