<template>
  <div class="login-screen">
    <div class="login-box">
      <div class="login-logo">AD<span style="color:#e8ff47;">.</span>FACTORY</div>
      <div class="login-sub">Sign in with your company account</div>
      <a href="/auth/google" class="google-btn">
        <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
        Sign in with Google
      </a>
      <div v-if="$page.props.flash?.error" class="login-error">
        {{ $page.props.flash.error }}
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'Login',
};
</script>

<style scoped>
:root {
  --bg:#0a0b0e; --s1:#111318; --s2:#181b22; --s3:#1f232d;
  --border:#252a36; --border2:#2e3545;
  --accent:#e8ff47; --blue:#47c8ff; --orange:#ff6b47; --green:#34d399;
  --text:#e8eaf0; --muted:#5a6278; --muted2:#7a8399;
}
* { box-sizing: border-box; margin: 0; padding: 0; }
body { background: #0a0b0e; color: #e8eaf0; font-family: 'DM Mono', monospace; }
.login-screen {
  display: flex; align-items: center; justify-content: center;
  min-height: 100vh; background: #0a0b0e; padding: 24px;
}
.login-box {
  background: #111318; border: 1px solid #2e3545; border-radius: 16px;
  padding: 48px 40px; width: 100%; max-width: 440px; text-align: center;
}
.login-logo {
  font-family: 'Syne', sans-serif; font-weight: 800; font-size: 32px;
  color: #e8eaf0; margin-bottom: 4px;
}
.login-sub {
  font-size: 11px; color: #7a8399; letter-spacing: 1px;
  text-transform: uppercase; margin-bottom: 40px;
}
.google-btn {
  display: inline-flex; align-items: center; gap: 12px;
  padding: 14px 28px; border-radius: 8px;
  background: #fff; color: #333; font-family: 'DM Mono', monospace;
  font-size: 13px; font-weight: 500; text-decoration: none;
  transition: all 0.2s; border: none; cursor: pointer;
}
.google-btn:hover { background: #f0f0f0; transform: translateY(-1px); }
.login-error {
  margin-top: 20px; padding: 12px; border-radius: 6px;
  background: rgba(255,107,71,.1); border: 1px solid rgba(255,107,71,.3);
  color: #ff6b47; font-size: 11px;
}
</style>
