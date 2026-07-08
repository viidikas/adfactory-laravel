/* AD.FACTORY — Order builder (multi-step) + Orders queue & detail -------- */

function Stepper({ steps, current }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
      {steps.map((s, i) => {
        const done = i < current, active = i === current;
        return (
          <React.Fragment key={s}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
              <div style={{
                width: 26, height: 26, borderRadius: 999, display: 'grid', placeItems: 'center', flexShrink: 0,
                fontSize: 12.5, fontWeight: 700, transition: 'all .2s',
                background: done ? 'var(--accent)' : active ? 'var(--surface-3)' : 'transparent',
                color: done ? 'var(--text-on-accent)' : active ? 'var(--text-1)' : 'var(--text-3)',
                border: '1px solid', borderColor: done ? 'transparent' : active ? 'var(--border-strong)' : 'var(--border)',
              }}>{done ? <Icon name="check" size={14} stroke={2.5} /> : i + 1}</div>
              <span style={{ fontSize: 13.5, fontWeight: active ? 700 : 500, color: active ? 'var(--text-1)' : 'var(--text-3)', whiteSpace: 'nowrap' }}>{s}</span>
            </div>
            {i < steps.length - 1 && <div style={{ flex: 1, height: 1, background: 'var(--border)', margin: '0 14px', minWidth: 18 }} />}
          </React.Fragment>
        );
      })}
    </div>
  );
}

function OrderBuilder({ go, onSubmit, onPreview }) {
  const STEPS = ['Brief', 'Clips', 'Design', 'Copy', 'Review'];
  const [step, setStep] = React.useState(0);
  const [brief, setBrief] = React.useState({ title: '', brand: 'Monefit SmartSaver', market: 'EE', aspect: '9:16', objective: 'Performance' });
  const [picked, setPicked] = React.useState([]);
  const [design, setDesign] = React.useState(null);
  const [langs, setLangs] = React.useState(['EN']);
  const [notes, setNotes] = React.useState('');

  const toggle = (id) => setPicked(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);
  const toggleLang = (l) => setLangs(p => p.includes(l) ? p.filter(x => x !== l) : [...p, l]);

  const canNext = [
    brief.title.trim().length > 2,
    picked.length > 0,
    !!design,
    langs.length > 0,
    true,
  ][step];

  const clipsForAspect = window.AF.clips.filter(c => c.aspect === brief.aspect || step !== 1);
  const designs = window.AF.designs.filter(d => d.aspect === brief.aspect);

  const submit = () => {
    onSubmit({
      title: brief.title, brand: brief.brand, market: brief.market, aspect: brief.aspect,
      clipCount: picked.length, design: design, langs,
    });
  };

  return (
    <div data-screen-label="Order builder" style={{ padding: 'var(--pad-screen)', maxWidth: 1040, margin: '0 auto', width: '100%' }}>
      <button onClick={() => go('orders')} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: 'var(--text-2)', cursor: 'pointer', fontSize: 13.5, marginBottom: 16, fontFamily: 'inherit' }}>
        <Icon name="arrowleft" size={16} /> Cancel
      </button>
      <h1 style={{ fontSize: 27, fontWeight: 800, letterSpacing: '-0.02em', margin: '0 0 20px' }}>New video ad order</h1>
      <Card style={{ marginBottom: 'var(--gap)', padding: '18px var(--pad-card)' }}><Stepper steps={STEPS} current={step} /></Card>

      <Card style={{ minHeight: 380 }}>
        {step === 0 && (
          <div style={{ display: 'grid', gap: 18, maxWidth: 620 }}>
            <Field label="Order title"><Input value={brief.title} onChange={(v) => setBrief({ ...brief, title: v })} placeholder="e.g. Q3 SmartSaver — APY push (ES)" autoFocus /></Field>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
              <Field label="Brand"><Select value={brief.brand} onChange={(v) => setBrief({ ...brief, brand: v })} options={window.AF.BRANDS} /></Field>
              <Field label="Market"><Select value={brief.market} onChange={(v) => setBrief({ ...brief, market: v })} options={window.AF.MARKETS.map(m => ({ value: m.code, label: m.flag + ' ' + m.name }))} /></Field>
            </div>
            <Field label="Format">
              <Segmented value={brief.aspect} onChange={(v) => setBrief({ ...brief, aspect: v })}
                options={[{ value: '9:16', label: '9:16 · Reels/Stories' }, { value: '1:1', label: '1:1 · Feed' }, { value: '16:9', label: '16:9 · YouTube' }]} />
            </Field>
            <Field label="Objective">
              <Segmented value={brief.objective} onChange={(v) => setBrief({ ...brief, objective: v })}
                options={['Performance', 'Awareness', 'Trust', 'Consideration']} />
            </Field>
          </div>
        )}

        {step === 1 && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <SectionLabel>Pick clips · {brief.aspect}</SectionLabel>
              <span style={{ fontSize: 13, color: picked.length ? 'var(--accent)' : 'var(--text-3)', fontWeight: 600 }}>{picked.length} selected</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 'var(--gap)' }}>
              {clipsForAspect.map(c => <ClipCard key={c.id} clip={c} selected={picked.includes(c.id)} onToggle={() => toggle(c.id)} />)}
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <SectionLabel>Choose an ad design · {brief.aspect}</SectionLabel>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 'var(--gap)', marginTop: 14 }}>
              {designs.map(d => {
                const sel = design === d.id;
                return (
                  <div key={d.id} onClick={() => setDesign(d.id)} style={{
                    border: '1.5px solid', borderColor: sel ? 'var(--accent)' : 'var(--border)', borderRadius: 14, padding: 14, cursor: 'pointer',
                    background: sel ? 'var(--accent-soft)' : 'var(--surface-1)', transition: 'all .15s',
                  }}>
                    <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
                      {Array.from({ length: d.scenes }).map((_, i) => (
                        <div key={i} style={{ flex: 1, aspectRatio: d.aspect === '16:9' ? '16/9' : d.aspect === '1:1' ? '1' : '9/16', borderRadius: 6, background: `linear-gradient(160deg, ${d.color}, #0d0f10)` }} />
                      ))}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 700 }}>{d.name}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 3 }}>{d.scenes} scenes · {d.dur}s · {d.kind}</div>
                      </div>
                      {sel && <span style={{ width: 22, height: 22, borderRadius: 999, background: 'var(--accent)', color: 'var(--text-on-accent)', display: 'grid', placeItems: 'center' }}><Icon name="check" size={13} stroke={2.5} /></span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {step === 3 && (
          <div style={{ maxWidth: 640 }}>
            <SectionLabel>Localize into</SectionLabel>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 22 }}>
              {window.AF.LANGS.map(l => <Tag key={l} active={langs.includes(l)} onClick={() => toggleLang(l)}>{l}</Tag>)}
            </div>
            <Field label="Notes for the production team" hint="Tone, must-use lines, do-not-use clips, deadlines…">
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={5} placeholder="Anything the editor should know…"
                style={{ width: '100%', padding: 14, borderRadius: 12, background: 'var(--surface-1)', border: '1px solid var(--border)', color: 'var(--text-1)', fontSize: 14.5, fontFamily: 'inherit', resize: 'vertical', outline: 'none' }} />
            </Field>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginTop: 18, padding: 14, borderRadius: 12, background: 'var(--accent-soft)', color: 'var(--accent)', fontSize: 13.5 }}>
              <Icon name="sparkles" size={18} /> Copy variants for these locales will be pulled from the copy map automatically.
            </div>
          </div>
        )}

        {step === 4 && (
          <ReviewStep brief={brief} picked={picked} design={design} langs={langs} onPreview={onPreview} />
        )}
      </Card>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 'var(--gap)' }}>
        <Button variant="ghost" icon="arrowleft" onClick={() => step === 0 ? go('orders') : setStep(step - 1)}>{step === 0 ? 'Cancel' : 'Back'}</Button>
        {step < 4
          ? <Button iconRight="arrowright" disabled={!canNext} onClick={() => canNext && setStep(step + 1)}>Continue</Button>
          : <Button icon="send" onClick={submit}>Submit order</Button>}
      </div>
    </div>
  );
}

function ReviewStep({ brief, picked, design, langs, onPreview }) {
  const d = window.AF.designOf(design);
  const m = window.AF.marketOf(brief.market);
  const clips = window.AF.clips.filter(c => picked.includes(c.id));
  const Row = ({ k, v }) => <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderTop: '1px solid var(--divider)', fontSize: 14 }}><span style={{ color: 'var(--text-2)' }}>{k}</span><span style={{ fontWeight: 600 }}>{v}</span></div>;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 28 }}>
      <div>
        <SectionLabel>Summary</SectionLabel>
        <div style={{ marginTop: 6 }}>
          <Row k="Title" v={brief.title || '—'} />
          <Row k="Brand" v={brief.brand} />
          <Row k="Market" v={m.flag + ' ' + m.name} />
          <Row k="Format" v={brief.aspect} />
          <Row k="Objective" v={brief.objective} />
          <Row k="Design" v={d ? d.name : '—'} />
          <Row k="Clips" v={picked.length} />
          <Row k="Locales" v={langs.join(', ')} />
          <Row k="Est. variants" v={picked.length && langs.length ? langs.length + ' renders' : '—'} />
        </div>
      </div>
      <div>
        <SectionLabel>Selected clips</SectionLabel>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginTop: 6 }}>
          {clips.map(c => <Thumb key={c.id} clip={c} showPlay={false} onClick={() => onPreview(c)} />)}
        </div>
      </div>
    </div>
  );
}

/* ---- Orders queue -------------------------------------------------------- */
function Orders({ go, openId, onClose, justSubmitted }) {
  const [tab, setTab] = React.useState('All');
  const [detail, setDetail] = React.useState(openId || null);
  React.useEffect(() => { if (openId) setDetail(openId); }, [openId]);

  const tabs = ['All', ...window.AF.STATUSES];
  const orders = window.AF.orders.filter(o => tab === 'All' || o.status === tab);
  const counts = {}; window.AF.STATUSES.forEach(s => counts[s] = window.AF.orders.filter(o => o.status === s).length);

  const detailOrder = window.AF.orders.find(o => o.id === detail);

  return (
    <div data-screen-label="Orders" style={{ padding: 'var(--pad-screen)', display: 'flex', flexDirection: 'column', gap: 'var(--gap)' }}>
      {justSubmitted && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 18px', borderRadius: 14, background: 'var(--accent-soft)', color: 'var(--accent)', fontSize: 14, fontWeight: 600 }}>
          <Icon name="check_circle" size={20} /> Order submitted ⚡ — the production team has been notified.
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14 }}>
        <div>
          <h1 style={{ fontSize: 27, fontWeight: 800, letterSpacing: '-0.02em', margin: 0 }}>Orders</h1>
          <p style={{ color: 'var(--text-2)', margin: '6px 0 0', fontSize: 14.5 }}>{window.AF.orders.length} orders in the pipeline</p>
        </div>
        <Button icon="plus" onClick={() => go('builder')}>New order</Button>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', overflowX: 'auto', paddingBottom: 2 }}>
        {tabs.map(t => <Tag key={t} active={tab === t} onClick={() => setTab(t)}>{t}{t !== 'All' && counts[t] ? <span style={{ opacity: 0.6, marginLeft: 4 }}>{counts[t]}</span> : ''}</Tag>)}
      </div>

      <Card pad={false}>
        <div style={{ display: 'grid', gridTemplateColumns: '1.7fr 1fr 0.9fr 1.1fr 0.9fr', gap: 14, padding: '12px var(--pad-card)', fontSize: 12, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          <div>Order</div><div>Brand · market</div><div>Clips</div><div>Progress</div><div style={{ textAlign: 'right' }}>Status</div>
        </div>
        {orders.map((o, i) => {
          const m = window.AF.marketOf(o.market);
          return (
            <div key={o.id} onClick={() => setDetail(o.id)} className="row-hover" style={{ display: 'grid', gridTemplateColumns: '1.7fr 1fr 0.9fr 1.1fr 0.9fr', gap: 14, alignItems: 'center', padding: '13px var(--pad-card)', borderTop: '1px solid var(--divider)', cursor: 'pointer' }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{o.title}</div>
                <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 3 }}>{o.id} · {o.requestedBy}</div>
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-2)' }}>{m.flag} {o.brand}</div>
              <div style={{ fontSize: 13, color: 'var(--text-2)' }}>{o.clipCount}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><div style={{ flex: 1, maxWidth: 90 }}><Progress value={o.progress} /></div><span style={{ fontSize: 12, color: 'var(--text-3)' }}>{o.progress}%</span></div>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}><StatusPill status={o.status} /></div>
            </div>
          );
        })}
      </Card>

      <Drawer open={!!detailOrder} onClose={() => setDetail(null)} title={detailOrder ? detailOrder.id : ''}
        footer={detailOrder && <React.Fragment><Button variant="secondary" icon="download" full>Templater CSV</Button><Button icon="external" full>Open renders</Button></React.Fragment>}>
        {detailOrder && <OrderDetail o={detailOrder} />}
      </Drawer>
    </div>
  );
}

function OrderDetail({ o }) {
  const m = window.AF.marketOf(o.market);
  const d = window.AF.designOf(o.design);
  const clips = window.AF.clips.filter(c => c.aspect === o.aspect).slice(0, o.clipCount);
  const timeline = ['Submitted', 'In production', 'Rendering', 'Review', 'Delivered'];
  const curIdx = timeline.indexOf(o.status);
  return (
    <div>
      <StatusPill status={o.status} />
      <h2 style={{ fontSize: 21, fontWeight: 800, letterSpacing: '-0.02em', margin: '12px 0 4px' }}>{o.title}</h2>
      <div style={{ fontSize: 13.5, color: 'var(--text-2)' }}>{m.flag} {o.brand} · {o.aspect} · requested by {o.requestedBy}</div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '22px 0', fontSize: 12.5 }}>
        {timeline.map((s, i) => (
          <React.Fragment key={s}>
            <div style={{ textAlign: 'center', flex: 1 }}>
              <div style={{ width: 18, height: 18, borderRadius: 999, margin: '0 auto 6px', background: i <= curIdx ? 'var(--accent)' : 'var(--surface-3)', display: 'grid', placeItems: 'center' }}>
                {i < curIdx && <Icon name="check" size={11} stroke={3} style={{ color: 'var(--text-on-accent)' }} />}
              </div>
              <div style={{ color: i <= curIdx ? 'var(--text-1)' : 'var(--text-3)', fontWeight: i === curIdx ? 700 : 400, fontSize: 10.5 }}>{s}</div>
            </div>
            {i < timeline.length - 1 && <div style={{ height: 2, flex: 0.5, background: i < curIdx ? 'var(--accent)' : 'var(--surface-3)', marginBottom: 20 }} />}
          </React.Fragment>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
        {[['Design', d ? d.name : '—'], ['Clips', o.clipCount + ' selected'], ['Progress', o.progress + '%'], ['Due', o.dueDays < 0 ? Math.abs(o.dueDays) + 'd overdue' : 'in ' + o.dueDays + 'd']].map(x => (
          <div key={x[0]} style={{ padding: 12, borderRadius: 12, background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{x[0]}</div>
            <div style={{ fontSize: 14.5, fontWeight: 700, marginTop: 3, color: x[1].includes('overdue') ? 'var(--danger)' : 'var(--text-1)' }}>{x[1]}</div>
          </div>
        ))}
      </div>

      <SectionLabel>Clips in this order</SectionLabel>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginTop: 6, marginBottom: 20 }}>
        {clips.map(c => <Thumb key={c.id} clip={c} showPlay={false} />)}
      </div>

      <SectionLabel>Rendered variants</SectionLabel>
      <div style={{ marginTop: 6 }}>
        {window.AF.LANGS.slice(0, Math.max(2, o.clipCount % 4 + 1)).map((l, i) => (
          <div key={l} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 0', borderTop: '1px solid var(--divider)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Icon name="film" size={16} style={{ color: 'var(--text-3)' }} />
              <span className="mono" style={{ fontSize: 13 }}>{o.id}_{l}_{o.aspect.replace(':', 'x')}.mp4</span>
            </div>
            {curIdx >= 2 ? <Button size="sm" variant="ghost" icon="download">Download</Button> : <span style={{ fontSize: 12, color: 'var(--text-3)' }}>queued</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

Object.assign(window, { OrderBuilder, Orders, Stepper });
