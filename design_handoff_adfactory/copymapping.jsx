/* AD.FACTORY — Copy mapping editor (Templater CSV source) ----------------- */
function CopyMapping({ onPreview }) {
  const [rows, setRows] = React.useState(() => window.AF.copyRows.map(r => ({ ...r, variants: { ...r.variants } })));
  const [edit, setEdit] = React.useState(null); // {row, lang}
  const [filter, setFilter] = React.useState('All');
  const [toast, setToast] = React.useState(false);
  const langs = window.AF.LANGS;

  const setCell = (ri, lang, val) => {
    setRows(rs => rs.map((r, i) => i === ri ? { ...r, variants: { ...r.variants, [lang]: val } } : r));
  };

  const visible = rows.filter(r => filter === 'All' || r.status === filter);
  const total = rows.length * langs.length;
  const filled = rows.reduce((n, r) => n + langs.filter(l => (r.variants[l] || '').trim()).length, 0);

  const exportCsv = () => { setToast(true); setTimeout(() => setToast(false), 2600); };

  return (
    <div data-screen-label="Copy mapping" style={{ padding: 'var(--pad-screen)', display: 'flex', flexDirection: 'column', gap: 'var(--gap)' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14 }}>
        <div>
          <h1 style={{ fontSize: 27, fontWeight: 800, letterSpacing: '-0.02em', margin: 0 }}>Copy mapping</h1>
          <p style={{ color: 'var(--text-2)', margin: '6px 0 0', fontSize: 14.5 }}>Localized strings mapped to clips &amp; scenes — exported as the Templater CSV.</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <Button variant="secondary" icon="plus">Add slot</Button>
          <Button icon="download" onClick={exportCsv}>Export Templater CSV</Button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 8 }}>
          {['All', 'approved', 'review', 'missing'].map(f => <Tag key={f} active={filter === f} onClick={() => setFilter(f)}>{f === 'All' ? 'All slots' : (window.AF, { approved: 'Approved', review: 'In review', missing: 'Missing' }[f])}</Tag>)}
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 13, color: 'var(--text-2)' }}>{filled}/{total} cells filled</span>
          <div style={{ width: 120 }}><Progress value={Math.round(filled / total * 100)} /></div>
        </div>
      </div>

      <Card pad={false} style={{ overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 980 }}>
            <thead>
              <tr style={{ fontSize: 12, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                <th style={thStyle(260, true)}>Slot · clip</th>
                {langs.map(l => <th key={l} style={thStyle(0)}>{l}</th>)}
                <th style={{ ...thStyle(110), textAlign: 'right' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((r) => {
                const ri = rows.indexOf(r);
                return (
                  <tr key={r.slot} style={{ borderTop: '1px solid var(--divider)' }}>
                    <td style={{ ...tdStyle, position: 'sticky', left: 0, background: 'var(--surface-2)', borderRight: '1px solid var(--divider)' }}>
                      <div style={{ fontSize: 14, fontWeight: 600 }}>{r.key}</div>
                      <div className="mono" style={{ fontSize: 11.5, color: 'var(--text-3)', marginTop: 3 }}>{r.slot}</div>
                      <div style={{ fontSize: 11.5, color: 'var(--text-3)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 5 }}>
                        <Icon name="film" size={12} /> {r.clip} · {r.scene}
                      </div>
                    </td>
                    {langs.map(l => {
                      const active = edit && edit.ri === ri && edit.lang === l;
                      const val = r.variants[l] || '';
                      return (
                        <td key={l} style={{ ...tdStyle, verticalAlign: 'top', cursor: 'text' }} onClick={() => setEdit({ ri, lang: l })}>
                          {active ? (
                            <textarea autoFocus value={val} rows={2}
                              onChange={(e) => setCell(ri, l, e.target.value)}
                              onBlur={() => setEdit(null)}
                              style={{ width: '100%', minWidth: 150, padding: 8, borderRadius: 8, background: 'var(--surface-1)', border: '1px solid var(--accent)', color: 'var(--text-1)', fontSize: 13, fontFamily: 'inherit', resize: 'vertical', outline: 'none', boxShadow: '0 0 0 3px var(--accent-ring)' }} />
                          ) : (
                            <div style={{ fontSize: 13, lineHeight: 1.4, minHeight: 19, color: val ? 'var(--text-1)' : 'var(--text-3)', padding: '2px 4px', borderRadius: 6, minWidth: 130 }}
                              className="copy-cell">
                              {val || <span style={{ fontStyle: 'italic' }}>— add —</span>}
                            </div>
                          )}
                        </td>
                      );
                    })}
                    <td style={{ ...tdStyle, textAlign: 'right' }}><StatusPill status={r.status} dot={false} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <div style={{ fontSize: 12.5, color: 'var(--text-3)', display: 'flex', alignItems: 'center', gap: 7 }}>
        <Icon name="sparkles" size={14} /> Click any cell to edit inline. The CSV maps each slot → clip → scene for every locale the Templater picks up.
      </div>

      {toast && (
        <div style={{ position: 'fixed', bottom: 28, left: '50%', transform: 'translateX(-50%)', zIndex: 80, display: 'flex', alignItems: 'center', gap: 10, padding: '13px 20px', borderRadius: 14, background: 'var(--surface-1)', border: '1px solid var(--border-strong)', boxShadow: 'var(--shadow-pop)', fontSize: 14, fontWeight: 600 }}>
          <Icon name="check_circle" size={18} style={{ color: 'var(--accent)' }} /> templater_copy_5locales.csv generated
        </div>
      )}
    </div>
  );
}

const thStyle = (w, left) => ({ textAlign: 'left', fontWeight: 700, padding: '13px 14px', whiteSpace: 'nowrap', width: w || 'auto', position: left ? 'sticky' : 'static', left: left ? 0 : 'auto', background: 'var(--surface-2)', zIndex: left ? 2 : 1 });
const tdStyle = { padding: '12px 14px', verticalAlign: 'top' };

Object.assign(window, { CopyMapping });
