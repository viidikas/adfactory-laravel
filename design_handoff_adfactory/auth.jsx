/* AD.FACTORY — Login (email + emailed code). Brand-true auth. ------------- */
function LoginScreen({ onAuth }) {
  const [step, setStep] = React.useState('email');
  const [email, setEmail] = React.useState('');
  const [code, setCode] = React.useState(['', '', '', '', '', '']);
  const [err, setErr] = React.useState('');
  const refs = React.useRef([]);

  const valid = /\S+@\S+\.\S+/.test(email);

  const sendCode = () => {
    if (!valid) { setErr('Please enter a valid work email.'); return; }
    setErr(''); setStep('code');
    setTimeout(() => refs.current[0] && refs.current[0].focus(), 60);
  };
  const setDigit = (i, v) => {
    v = v.replace(/\D/g, '').slice(-1);
    const next = [...code]; next[i] = v; setCode(next); setErr('');
    if (v && i < 5) refs.current[i + 1] && refs.current[i + 1].focus();
  };
  const verify = () => {
    if (code.join('').length < 6) { setErr('Enter the 6-digit code we emailed you.'); return; }
    onAuth(email);
  };

  return (
    <div data-screen-label="Login" style={{ minHeight: '100vh', display: 'grid', gridTemplateColumns: '1.1fr 1fr', background: 'var(--surface-0)' }}>
      {/* left — brand panel */}
      <div style={{ position: 'relative', background: 'var(--surface-1)', borderRight: '1px solid var(--border)', padding: '56px 64px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', overflow: 'hidden' }}>
        <BrandLockup />
        <div style={{ position: 'relative', zIndex: 2, maxWidth: 460 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 12px', borderRadius: 999, background: 'var(--accent-soft)', color: 'var(--accent)', fontSize: 12.5, fontWeight: 700, marginBottom: 24 }}>
            <Icon name="zap" size={14} fill="currentColor" stroke={0} /> Video ad production, in-house
          </div>
          <h1 style={{ fontSize: 44, lineHeight: 1.05, letterSpacing: '-0.03em', fontWeight: 800, margin: '0 0 18px' }}>
            Ship on-brand video ads <span style={{ color: 'var(--accent)' }}>at the speed of growth.</span>
          </h1>
          <p style={{ fontSize: 16.5, color: 'var(--text-2)', lineHeight: 1.5, margin: 0 }}>
            Build clip libraries, map localized copy, and generate Templater-ready exports — across every Creditstar brand and market.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 28, position: 'relative', zIndex: 2 }}>
          {[['248', 'clips in library'], ['9.96%', 'APY hero'], ['5', 'markets']].map(s => (
            <div key={s[1]}>
              <div className="hero-num" style={{ fontSize: 26 }}>{s[0]}</div>
              <div style={{ fontSize: 12.5, color: 'var(--text-3)', marginTop: 4 }}>{s[1]}</div>
            </div>
          ))}
        </div>
        {/* decorative clip mosaic */}
        <div style={{ position: 'absolute', right: -80, top: 60, display: 'grid', gridTemplateColumns: 'repeat(3, 90px)', gap: 10, opacity: 0.5, transform: 'rotate(8deg)' }}>
          {window.AF.clips.slice(0, 9).map(c => <div key={c.id} style={{ aspectRatio: '9/16', borderRadius: 8, background: `linear-gradient(160deg, ${c.color}, #0d0f10)` }} />)}
        </div>
      </div>

      {/* right — form */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40 }}>
        <div style={{ width: '100%', maxWidth: 380 }}>
          {step === 'email' ? (
            <React.Fragment>
              <h2 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.02em', margin: '0 0 8px' }}>Sign in</h2>
              <p style={{ color: 'var(--text-2)', margin: '0 0 28px', fontSize: 14.5 }}>Use your work email — we’ll send a one-time login code.</p>
              <Field label="Work email" error={err}>
                <Input value={email} onChange={setEmail} placeholder="you@creditstar.com" icon="user"
                  autoFocus onKeyDown={(e) => e.key === 'Enter' && sendCode()} error={!!err} />
              </Field>
              <div style={{ height: 18 }} />
              <Button full size="lg" iconRight="arrowright" onClick={sendCode}>Send login code</Button>
            </React.Fragment>
          ) : (
            <React.Fragment>
              <button onClick={() => setStep('email')} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: 'var(--text-2)', cursor: 'pointer', fontSize: 13.5, marginBottom: 18, fontFamily: 'inherit' }}>
                <Icon name="arrowleft" size={16} /> Back
              </button>
              <h2 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.02em', margin: '0 0 8px' }}>Almost there ⚡</h2>
              <p style={{ color: 'var(--text-2)', margin: '0 0 26px', fontSize: 14.5 }}>Enter the 6-digit code sent to <strong style={{ color: 'var(--text-1)' }}>{email}</strong></p>
              <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
                {code.map((d, i) => (
                  <input key={i} ref={el => refs.current[i] = el} value={d} inputMode="numeric"
                    onChange={(e) => setDigit(i, e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Backspace' && !d && i) refs.current[i - 1].focus(); if (e.key === 'Enter') verify(); }}
                    className="mono"
                    style={{
                      width: '100%', height: 58, textAlign: 'center', fontSize: 24, fontWeight: 700,
                      borderRadius: 12, background: 'var(--surface-1)', color: 'var(--text-1)',
                      border: '1px solid ' + (err ? 'var(--danger)' : 'var(--border-strong)'), outline: 'none',
                    }} />
                ))}
              </div>
              {err && <div style={{ fontSize: 12.5, color: 'var(--danger)', marginBottom: 12 }}>{err}</div>}
              <Button full size="lg" onClick={verify} iconRight="arrowright">Verify &amp; continue</Button>
              <div style={{ textAlign: 'center', marginTop: 16 }}>
                <span style={{ fontSize: 13, color: 'var(--text-3)' }}>Didn’t get it? </span>
                <button style={{ background: 'none', border: 'none', color: 'var(--link)', cursor: 'pointer', fontSize: 13, fontFamily: 'inherit', textDecoration: 'underline', textUnderlineOffset: 3 }}>Resend code</button>
              </div>
            </React.Fragment>
          )}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, marginTop: 36, color: 'var(--text-3)', fontSize: 12.5 }}>
            🔒 Your data is protected
          </div>
        </div>
      </div>
    </div>
  );
}

function BrandLockup({ light }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, position: 'relative', zIndex: 2 }}>
      <div style={{ width: 40, height: 40, borderRadius: 11, background: 'var(--accent)', display: 'grid', placeItems: 'center', color: 'var(--text-on-accent)' }}>
        <svg width="22" height="15" viewBox="0 0 21.907 14.982" fill="currentColor"><path d="M 0.198 14.784 C 0.066 14.652 0 14.492 0 14.303 L 0 0.961 C 0 0.773 0.066 0.613 0.198 0.481 C 0.329 0.349 0.49 0.283 0.678 0.283 L 2.883 0.283 C 3.071 0.283 3.232 0.349 3.364 0.481 C 3.495 0.613 3.562 0.773 3.562 0.961 L 3.562 1.922 C 4.541 0.641 5.908 0 7.661 0 C 9.752 0 11.212 0.839 12.042 2.516 C 12.494 1.762 13.134 1.154 13.964 0.692 C 14.793 0.231 15.688 0 16.65 0 C 18.194 0 19.457 0.528 20.437 1.583 C 21.417 2.638 21.907 4.174 21.907 6.191 L 21.907 14.303 C 21.907 14.492 21.846 14.652 21.723 14.784 C 21.601 14.916 21.436 14.982 21.229 14.982 L 18.911 14.982 C 18.722 14.982 18.562 14.916 18.43 14.784 C 18.298 14.652 18.233 14.492 18.233 14.303 L 18.233 6.417 C 18.233 5.229 17.983 4.367 17.484 3.83 C 16.984 3.293 16.32 3.024 15.49 3.024 C 14.756 3.024 14.129 3.298 13.611 3.844 C 13.092 4.391 12.833 5.249 12.833 6.417 L 12.833 14.303 C 12.833 14.492 12.767 14.652 12.636 14.784 C 12.503 14.916 12.343 14.982 12.155 14.982 L 9.837 14.982 C 9.649 14.982 9.488 14.916 9.357 14.784 C 9.224 14.652 9.159 14.492 9.159 14.303 L 9.159 6.417 C 9.159 5.229 8.9 4.367 8.381 3.83 C 7.863 3.293 7.208 3.024 6.417 3.024 C 5.663 3.024 5.027 3.298 4.509 3.844 C 3.99 4.391 3.731 5.249 3.731 6.417 L 3.731 14.303 C 3.731 14.492 3.665 14.652 3.533 14.784 C 3.401 14.916 3.241 14.982 3.053 14.982 L 0.678 14.982 C 0.49 14.982 0.329 14.916 0.198 14.784" /></svg>
      </div>
      <div style={{ fontSize: 19, fontWeight: 800, letterSpacing: '-0.02em', color: light ? '#fff' : 'var(--text-1)' }}>
        AD<span style={{ color: 'var(--accent)' }}>.</span>FACTORY
      </div>
    </div>
  );
}

Object.assign(window, { LoginScreen, BrandLockup });
