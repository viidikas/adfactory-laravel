/* AD.FACTORY — Dashboard + Clip Library --------------------------------- */

function StatCard({ s }) {
  return (
    <Card>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ fontSize: 13, color: 'var(--text-2)', fontWeight: 500 }}>{s.label}</div>
        <Sparkline data={s.spark} />
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginTop: 10 }}>
        <div className="hero-num" style={{ fontSize: 34 }}>{s.value}</div>
        <span style={{ fontSize: 12.5, fontWeight: 700, color: s.good ? 'var(--success)' : 'var(--danger)' }}>{s.delta}</span>
      </div>
    </Card>
  );
}

function Dashboard({ user, go }) {
  const orders = window.AF.orders;
  const attention = orders.filter(o => ['Review', 'In production', 'Submitted'].includes(o.status)).slice(0, 5);
  const actIcon = { submit: 'send', render: 'film', clip: 'scissors', copy: 'filetext' };
  return (
    <div data-screen-label="Dashboard" style={{ padding: 'var(--pad-screen)', display: 'flex', flexDirection: 'column', gap: 'var(--gap)' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 27, fontWeight: 800, letterSpacing: '-0.02em', margin: 0 }}>Welcome back, {user.name.split(' ')[0]} 👋</h1>
          <p style={{ color: 'var(--text-2)', margin: '6px 0 0', fontSize: 14.5 }}>Here’s what’s moving through the factory today.</p>
        </div>
        <Button icon="plus" onClick={() => go('builder')}>New order</Button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--gap)' }}>
        {window.AF.stats.map(s => <StatCard key={s.label} s={s} />)}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 'var(--gap)', alignItems: 'start' }}>
        <Card pad={false}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px var(--pad-card)' }}>
            <div style={{ fontSize: 16, fontWeight: 700 }}>Needs your attention</div>
            <button onClick={() => go('orders')} style={{ background: 'none', border: 'none', color: 'var(--link)', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              All orders <Icon name="chevright" size={14} />
            </button>
          </div>
          <div>
            {attention.map((o, i) => {
              const m = window.AF.marketOf(o.market);
              return (
                <div key={o.id} onClick={() => go('orders', o.id)} style={{
                  display: 'grid', gridTemplateColumns: '1fr auto auto', alignItems: 'center', gap: 14,
                  padding: '13px var(--pad-card)', borderTop: '1px solid var(--divider)', cursor: 'pointer',
                }} className="row-hover">
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{o.title}</div>
                    <div style={{ fontSize: 12.5, color: 'var(--text-3)', marginTop: 3 }}>{m.flag} {o.brand} · {o.clipCount} clips · {o.id}</div>
                  </div>
                  <div style={{ width: 90 }}><Progress value={o.progress} /></div>
                  <StatusPill status={o.status} />
                </div>
              );
            })}
          </div>
        </Card>

        <Card pad={false}>
          <div style={{ padding: '16px var(--pad-card)', fontSize: 16, fontWeight: 700 }}>Recent activity</div>
          <div style={{ padding: '0 var(--pad-card) 8px' }}>
            {window.AF.activity.map((a, i) => (
              <div key={i} style={{ display: 'flex', gap: 12, padding: '11px 0', borderTop: '1px solid var(--divider)' }}>
                <div style={{ width: 32, height: 32, borderRadius: 9, background: 'var(--surface-3)', display: 'grid', placeItems: 'center', color: 'var(--text-2)', flexShrink: 0 }}>
                  <Icon name={actIcon[a.kind]} size={15} />
                </div>
                <div style={{ fontSize: 13.5, lineHeight: 1.45 }}>
                  <strong>{a.who}</strong> <span style={{ color: 'var(--text-2)' }}>{a.what}</span> <span style={{ color: 'var(--text-1)' }}>{a.target}</span>
                  <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>{a.when}</div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

/* ---- Clip Library -------------------------------------------------------- */
function ClipLibrary({ portal, go, onPreview }) {
  const [q, setQ] = React.useState('');
  const [cat, setCat] = React.useState('All');
  const [market, setMarket] = React.useState('All');
  const [view, setView] = React.useState('grid');
  const [sort, setSort] = React.useState('recent');

  let clips = window.AF.clips.filter(c =>
    (cat === 'All' || c.category === cat) &&
    (market === 'All' || c.market === market) &&
    (!q || c.name.toLowerCase().includes(q.toLowerCase()) || c.tags.some(t => t.includes(q.toLowerCase())))
  );
  if (sort === 'recent') clips = [...clips].sort((a, b) => a.addedDays - b.addedDays);
  if (sort === 'used') clips = [...clips].sort((a, b) => b.usedCount - a.usedCount);
  if (sort === 'duration') clips = [...clips].sort((a, b) => a.duration - b.duration);

  return (
    <div data-screen-label="Clip library" style={{ padding: 'var(--pad-screen)', display: 'flex', flexDirection: 'column', gap: 'var(--gap)' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14 }}>
        <div>
          <h1 style={{ fontSize: 27, fontWeight: 800, letterSpacing: '-0.02em', margin: 0 }}>{portal ? 'Browse clips' : 'Clip library'}</h1>
          <p style={{ color: 'var(--text-2)', margin: '6px 0 0', fontSize: 14.5 }}>{clips.length} clips · {portal ? 'pick what fits your campaign' : 'source footage, sorted and tagged'}</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          {portal
            ? <Button icon="plus" onClick={() => go('builder')}>Start an order</Button>
            : <Button icon="upload">Upload clips</Button>}
        </div>
      </div>

      {/* toolbar */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 280px', minWidth: 220 }}>
          <Input value={q} onChange={setQ} placeholder="Search clips, tags…" icon="search" />
        </div>
        <Select value={market} onChange={setMarket} style={{ width: 150 }}
          options={[{ value: 'All', label: 'All markets' }, ...window.AF.MARKETS.map(m => ({ value: m.code, label: m.flag + ' ' + m.name }))]} />
        <Select value={sort} onChange={setSort} style={{ width: 160 }}
          options={[{ value: 'recent', label: 'Recently added' }, { value: 'used', label: 'Most used' }, { value: 'duration', label: 'Shortest first' }]} />
        <Segmented value={view} onChange={setView} size="sm" options={[{ value: 'grid', icon: 'grid' }, { value: 'list', icon: 'sliders' }]} />
      </div>

      {/* category chips */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {['All', ...window.AF.CATEGORIES].map(c => <Tag key={c} active={cat === c} onClick={() => setCat(c)}>{c}</Tag>)}
      </div>

      {clips.length === 0 ? (
        <Card><EmptyState icon="film" title="No clips match" sub="Try clearing filters or a different search term." action={<Button variant="soft" onClick={() => { setQ(''); setCat('All'); setMarket('All'); }}>Clear filters</Button>} /></Card>
      ) : view === 'grid' ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(var(--grid-min), 1fr))', gap: 'var(--gap)' }}>
          {clips.map(c => <ClipCard key={c.id} clip={c} onClick={() => onPreview(c)} />)}
        </div>
      ) : (
        <Card pad={false}>
          {clips.map((c, i) => {
            const m = window.AF.marketOf(c.market);
            return (
              <div key={c.id} onClick={() => onPreview(c)} className="row-hover" style={{ display: 'grid', gridTemplateColumns: '48px 1fr 110px 90px 90px', gap: 14, alignItems: 'center', padding: '10px var(--pad-card)', borderTop: i ? '1px solid var(--divider)' : 'none', cursor: 'pointer' }}>
                <div style={{ width: 48 }}><Thumb clip={c} showPlay={false} /></div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{c.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>{c.id} · {c.tags.join(' · ')}</div>
                </div>
                <div style={{ fontSize: 12.5, color: 'var(--text-2)' }}>{m.flag} {c.category}</div>
                <div className="mono" style={{ fontSize: 12.5, color: 'var(--text-2)' }}>0:{String(c.duration).padStart(2, '0')}</div>
                <div style={{ fontSize: 12.5, color: 'var(--text-3)', textAlign: 'right' }}>used {c.usedCount}×</div>
              </div>
            );
          })}
        </Card>
      )}
    </div>
  );
}

function ClipCard({ clip, onClick, selected, onToggle }) {
  const m = window.AF.marketOf(clip.market);
  return (
    <div>
      <Thumb clip={clip} onClick={onToggle || onClick} selected={selected} />
      <div style={{ padding: '10px 2px 0' }}>
        <div style={{ fontSize: 13.5, fontWeight: 600, lineHeight: 1.3, display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{clip.name}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 5, fontSize: 12, color: 'var(--text-3)' }}>
          <span>{m.flag}</span><span>{clip.category}</span><span>·</span><span>used {clip.usedCount}×</span>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { Dashboard, ClipLibrary, ClipCard, StatCard });
