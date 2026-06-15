<script setup>
import { ref, computed } from 'vue';
import { router } from '@inertiajs/vue3';
import Field from '../../Components/Field.vue';
import Input from '../../Components/Input.vue';
import Button from '../../Components/Button.vue';
import Icon from '../../Components/Icon.vue';
import BrandLockup from '../../Components/BrandLockup.vue';

const props = defineProps({
  clips: { type: Array, default: () => [] },
  theme: { type: String, default: null },
  density: { type: String, default: null },
});

const theme = ref(props.theme || localStorage.getItem('af-theme') || 'dark');
const density = ref(props.density || localStorage.getItem('af-density') || 'regular');

const step = ref('email');
const email = ref('');
const code = ref(['', '', '', '', '', '']);
const err = ref('');
const inputs = ref([]);
const setInput = (el, i) => { if (el) inputs.value[i] = el; };

const valid = computed(() => /\S+@\S+\.\S+/.test(email.value));
const heroStats = [['248', 'clips in library'], ['9.96%', 'APY hero'], ['5', 'markets']];

function sendCode() {
  if (!valid.value) { err.value = 'Please enter a valid work email.'; return; }
  err.value = ''; step.value = 'code';
  setTimeout(() => inputs.value[0]?.focus(), 60);
}
function setDigit(i, v) {
  v = v.replace(/\D/g, '').slice(-1);
  code.value[i] = v; err.value = '';
  if (v && i < 5) inputs.value[i + 1]?.focus();
}
function onKey(e, i) {
  if (e.key === 'Backspace' && !code.value[i] && i) inputs.value[i - 1]?.focus();
  if (e.key === 'Enter') verify();
}
function verify() {
  if (code.value.join('').length < 6) { err.value = 'Enter the 6-digit code we emailed you.'; return; }
  // Demo: any 6 digits "authenticate" → go to the dashboard (real OTP wiring is a follow-up).
  router.visit('/design');
}
</script>

<template>
  <div class="af-app" :data-theme="theme" :data-density="density" :style="{ minHeight: '100vh', display: 'grid', gridTemplateColumns: '1.1fr 1fr', background: 'var(--surface-0)' }">
    <!-- left — brand panel -->
    <div :style="{ position: 'relative', background: 'var(--surface-1)', borderRight: '1px solid var(--border)', padding: '56px 64px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', overflow: 'hidden' }">
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
      <div :style="{ display: 'flex', gap: '28px', position: 'relative', zIndex: 2 }">
        <div v-for="s in heroStats" :key="s[1]">
          <div class="hero-num" :style="{ fontSize: '26px' }">{{ s[0] }}</div>
          <div :style="{ fontSize: '12.5px', color: 'var(--text-3)', marginTop: '4px' }">{{ s[1] }}</div>
        </div>
      </div>
      <!-- decorative clip mosaic -->
      <div :style="{ position: 'absolute', right: '-80px', top: '60px', display: 'grid', gridTemplateColumns: 'repeat(3, 90px)', gap: '10px', opacity: 0.5, transform: 'rotate(8deg)' }">
        <div v-for="c in clips.slice(0, 9)" :key="c.id" :style="{ aspectRatio: '9/16', borderRadius: '8px', background: `linear-gradient(160deg, ${c.color}, #0d0f10)` }" />
      </div>
    </div>

    <!-- right — form -->
    <div :style="{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px' }">
      <div :style="{ width: '100%', maxWidth: '380px' }">
        <template v-if="step === 'email'">
          <h2 :style="{ fontSize: '26px', fontWeight: 800, letterSpacing: '-0.02em', margin: '0 0 8px' }">Sign in</h2>
          <p :style="{ color: 'var(--text-2)', margin: '0 0 28px', fontSize: '14.5px' }">Use your work email — we'll send a one-time login code.</p>
          <Field label="Work email" :error="err">
            <Input v-model="email" placeholder="you@creditstar.com" icon="user" autofocus :error="!!err" @keydown="(e) => e.key === 'Enter' && sendCode()" />
          </Field>
          <div :style="{ height: '18px' }" />
          <Button full size="lg" icon-right="arrowright" @click="sendCode">Send login code</Button>
        </template>

        <template v-else>
          <button @click="step = 'email'" :style="{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', color: 'var(--text-2)', cursor: 'pointer', fontSize: '13.5px', marginBottom: '18px', fontFamily: 'inherit' }">
            <Icon name="arrowleft" :size="16" /> Back
          </button>
          <h2 :style="{ fontSize: '26px', fontWeight: 800, letterSpacing: '-0.02em', margin: '0 0 8px' }">Almost there ⚡</h2>
          <p :style="{ color: 'var(--text-2)', margin: '0 0 26px', fontSize: '14.5px' }">Enter the 6-digit code sent to <strong :style="{ color: 'var(--text-1)' }">{{ email }}</strong></p>
          <div :style="{ display: 'flex', gap: '10px', marginBottom: '12px' }">
            <input
              v-for="(d, i) in code" :key="i" :ref="(el) => setInput(el, i)"
              :value="d" inputmode="numeric" class="mono"
              @input="setDigit(i, $event.target.value)" @keydown="onKey($event, i)"
              :style="{ width: '100%', height: '58px', textAlign: 'center', fontSize: '24px', fontWeight: 700, borderRadius: '12px', background: 'var(--surface-1)', color: 'var(--text-1)', border: '1px solid ' + (err ? 'var(--danger)' : 'var(--border-strong)'), outline: 'none' }"
            />
          </div>
          <div v-if="err" :style="{ fontSize: '12.5px', color: 'var(--danger)', marginBottom: '12px' }">{{ err }}</div>
          <Button full size="lg" icon-right="arrowright" @click="verify">Verify &amp; continue</Button>
          <div :style="{ textAlign: 'center', marginTop: '16px' }">
            <span :style="{ fontSize: '13px', color: 'var(--text-3)' }">Didn't get it? </span>
            <button :style="{ background: 'none', border: 'none', color: 'var(--link)', cursor: 'pointer', fontSize: '13px', fontFamily: 'inherit', textDecoration: 'underline', textUnderlineOffset: '3px' }">Resend code</button>
          </div>
        </template>

        <div :style="{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px', marginTop: '36px', color: 'var(--text-3)', fontSize: '12.5px' }">
          🔒 Your data is protected
        </div>
      </div>
    </div>
  </div>
</template>
