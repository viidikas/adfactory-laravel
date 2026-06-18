<script setup>
import { ref, computed, onMounted, watch, nextTick } from 'vue';
import { useForm, router, usePage } from '@inertiajs/vue3';
import Field from '../../Components/Field.vue';
import Input from '../../Components/Input.vue';
import Button from '../../Components/Button.vue';
import Icon from '../../Components/Icon.vue';
import BrandLockup from '../../Components/BrandLockup.vue';

// `step` is driven by the server (email -> code) so the proven OTP backend stays
// authoritative; this single page renders both steps in the new design.
const props = defineProps({
  step: { type: String, default: 'email' },   // 'email' | 'code'
  userEmail: { type: String, default: '' },
  userName: { type: String, default: '' },
  theme: { type: String, default: null },
  density: { type: String, default: null },
});

const page = usePage();
const flashError = computed(() => page.props.flash?.error || '');
const flashSuccess = computed(() => page.props.flash?.success || '');

const ls = (k) => { try { return localStorage.getItem(k); } catch { return null; } };
const theme = ref(props.theme || ls('af-theme') || 'dark');
const density = ref(props.density || ls('af-density') || 'regular');

// ── Email step ──────────────────────────────────────────────────
const emailForm = useForm({ email: props.userEmail || '' });
const validEmail = computed(() => /\S+@\S+\.\S+/.test(emailForm.email));
function sendCode() {
  if (!validEmail.value || emailForm.processing) return;
  emailForm.post('/login/select', { preserveScroll: true });
}

// ── Code step ───────────────────────────────────────────────────
const code = ref(['', '', '', '', '', '']);
const codeForm = useForm({ code: '' });
const inputs = ref([]);
const setInput = (el, i) => { if (el) inputs.value[i] = el; };
const codeComplete = computed(() => code.value.join('').length === 6);

function distribute(digits, start = 0) {
  const arr = String(digits).replace(/\D/g, '').slice(0, 6 - start).split('');
  arr.forEach((d, k) => { code.value[start + k] = d; });
  nextTick(() => inputs.value[Math.min(start + arr.length, 5)]?.focus());
}
function setDigit(i, v) {
  v = String(v).replace(/\D/g, '');
  if (v.length > 1) { distribute(v, i); return; }
  code.value[i] = v;
  if (v && i < 5) inputs.value[i + 1]?.focus();
}
function onPaste(e) { e.preventDefault(); distribute(e.clipboardData?.getData('text') || '', 0); }
function onKey(e, i) {
  if (e.key === 'Backspace' && !code.value[i] && i) inputs.value[i - 1]?.focus();
  if (e.key === 'Enter') verify();
}
function verify() {
  if (!codeComplete.value || codeForm.processing) return;
  codeForm.code = code.value.join('');
  codeForm.post('/login/verify', { preserveScroll: true });
}
function back() { router.visit('/login'); }
function resend() { router.visit('/login/resend'); }

// A bad/expired code re-renders the code step with a flash error — reset the
// boxes and refocus so the next attempt is clean.
watch(flashError, (e) => {
  if (e && props.step === 'code') { code.value = ['', '', '', '', '', '']; nextTick(() => inputs.value[0]?.focus()); }
});
onMounted(() => { if (props.step === 'code') nextTick(() => inputs.value[0]?.focus()); });
</script>

<template>
  <div class="af-app login-grid" :data-theme="theme" :data-density="density" :style="{ minHeight: '100vh', background: 'var(--surface-0)', color: 'var(--text-1)' }">
    <!-- left — brand panel -->
    <div class="login-brand" :style="{ position: 'relative', background: 'var(--surface-1)', borderRight: '1px solid var(--border)', padding: '56px 64px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', overflow: 'hidden' }">
      <BrandLockup />
      <div :style="{ position: 'relative', zIndex: 2, maxWidth: '460px' }">
        <div :style="{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 12px', borderRadius: '999px', background: 'var(--accent-soft)', color: 'var(--accent)', fontSize: '12.5px', fontWeight: 700, marginBottom: '24px' }">
          <Icon name="zap" :size="14" fill="currentColor" :stroke="0" /> Video ad production, in-house
        </div>
        <h1 :style="{ fontSize: '44px', lineHeight: 1.05, letterSpacing: '-0.03em', fontWeight: 800, margin: '0 0 18px' }">
          Ship on-brand video ads <span :style="{ color: 'var(--accent)' }">at the speed of growth.</span>
        </h1>
        <p :style="{ fontSize: '16.5px', color: 'var(--text-2)', lineHeight: 1.5, margin: 0 }">
          Build clip libraries, map localized copy, and generate Templater-ready exports — across every Creditstar brand and market.
        </p>
      </div>
      <div :style="{ position: 'relative', zIndex: 2, fontSize: '12.5px', color: 'var(--text-3)' }">Creditstar · Monefit</div>
    </div>

    <!-- right — form -->
    <div :style="{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px' }">
      <div :style="{ width: '100%', maxWidth: '380px' }">
        <!-- brand mark on small screens (brand panel hidden) -->
        <div class="login-brand-sm" :style="{ marginBottom: '28px' }"><BrandLockup /></div>

        <template v-if="step !== 'code'">
          <h2 :style="{ fontSize: '26px', fontWeight: 800, letterSpacing: '-0.02em', margin: '0 0 8px' }">Sign in</h2>
          <p :style="{ color: 'var(--text-2)', margin: '0 0 28px', fontSize: '14.5px' }">Use your work email — we'll send a one-time login code.</p>
          <form @submit.prevent="sendCode">
            <Field label="Work email">
              <Input v-model="emailForm.email" type="email" placeholder="you@creditstar.com" icon="user" autofocus @keydown="(e) => e.key === 'Enter' && sendCode()" />
            </Field>
            <div v-if="flashSuccess" :style="{ marginTop: '14px', fontSize: '13px', color: 'var(--success)' }">{{ flashSuccess }}</div>
            <div v-if="flashError" :style="{ marginTop: '14px', fontSize: '13px', color: 'var(--danger)' }">{{ flashError }}</div>
            <div :style="{ height: '18px' }" />
            <Button type="submit" full size="lg" icon-right="arrowright" :disabled="!validEmail || emailForm.processing">
              {{ emailForm.processing ? 'Sending…' : 'Send login code' }}
            </Button>
          </form>
        </template>

        <template v-else>
          <button @click="back" :style="{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', color: 'var(--text-2)', cursor: 'pointer', fontSize: '13.5px', marginBottom: '18px', fontFamily: 'inherit' }">
            <Icon name="arrowleft" :size="16" /> Back
          </button>
          <h2 :style="{ fontSize: '26px', fontWeight: 800, letterSpacing: '-0.02em', margin: '0 0 8px' }">Check your email</h2>
          <p :style="{ color: 'var(--text-2)', margin: '0 0 26px', fontSize: '14.5px' }">
            Enter the 6-digit code sent to <strong :style="{ color: 'var(--text-1)' }">{{ userEmail }}</strong>
          </p>
          <div :style="{ display: 'flex', gap: '10px', marginBottom: '12px' }">
            <input
              v-for="(d, i) in code" :key="i" :ref="(el) => setInput(el, i)"
              :value="d" inputmode="numeric" maxlength="1" autocomplete="one-time-code" class="mono"
              @input="setDigit(i, $event.target.value)" @keydown="onKey($event, i)" @paste="onPaste"
              :style="{ width: '100%', height: '58px', textAlign: 'center', fontSize: '24px', fontWeight: 700, borderRadius: '12px', background: 'var(--surface-1)', color: 'var(--text-1)', border: '1px solid ' + (flashError ? 'var(--danger)' : 'var(--border-strong)'), outline: 'none' }"
            />
          </div>
          <div v-if="flashError" :style="{ fontSize: '12.5px', color: 'var(--danger)', marginBottom: '12px' }">{{ flashError }}</div>
          <div v-else-if="flashSuccess" :style="{ fontSize: '12.5px', color: 'var(--success)', marginBottom: '12px' }">{{ flashSuccess }}</div>
          <Button full size="lg" icon-right="arrowright" :disabled="!codeComplete || codeForm.processing" @click="verify">
            {{ codeForm.processing ? 'Verifying…' : 'Verify & continue' }}
          </Button>
          <div :style="{ textAlign: 'center', marginTop: '16px' }">
            <span :style="{ fontSize: '13px', color: 'var(--text-3)' }">Didn't get it? </span>
            <button @click="resend" :style="{ background: 'none', border: 'none', color: 'var(--link)', cursor: 'pointer', fontSize: '13px', fontFamily: 'inherit', textDecoration: 'underline', textUnderlineOffset: '3px' }">Resend code</button>
          </div>
        </template>

        <div :style="{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px', marginTop: '36px', color: 'var(--text-3)', fontSize: '12.5px' }">
          🔒 Your data is protected
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.login-grid { display: grid; grid-template-columns: 1.1fr 1fr; }
.login-brand-sm { display: none; }
@media (max-width: 860px) {
  .login-grid { grid-template-columns: 1fr; }
  .login-brand { display: none; }
  .login-brand-sm { display: block; }
}
</style>
