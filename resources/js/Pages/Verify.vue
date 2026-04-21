<template>
  <div class="verify-screen">
    <div class="verify-box">
      <div class="verify-logo">AD<span class="accent">.</span>FACTORY</div>
      <div class="verify-sub">GROWTH PORTAL</div>

      <div class="verify-icon">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#e8ff47" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <rect x="2" y="4" width="20" height="16" rx="2"/>
          <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
        </svg>
      </div>

      <h2 class="verify-title">Check your email</h2>
      <p class="verify-desc">
        A 6-digit code was sent to <strong>{{ userName }}</strong>
        <br />
        <span class="verify-email">{{ userEmail }}</span>
      </p>

      <form @submit.prevent="submitCode" class="code-form">
        <div class="otp-row">
          <input
            v-for="(_, i) in 6"
            :key="i"
            :ref="el => { if (el) inputs[i] = el }"
            type="text"
            maxlength="1"
            inputmode="numeric"
            class="otp-input"
            :class="{ filled: digits[i] !== '' }"
            :value="digits[i]"
            @input="handleInput(i, $event)"
            @keydown="handleKeydown(i, $event)"
            @paste="handlePaste($event)"
            @focus="$event.target.select()"
          />
        </div>

        <div v-if="$page.props.flash?.error" class="verify-error">
          {{ $page.props.flash.error }}
        </div>

        <div v-if="$page.props.flash?.success" class="verify-success">
          {{ $page.props.flash.success }}
        </div>

        <button
          type="submit"
          class="verify-btn"
          :disabled="form.processing || !isComplete"
        >
          <span v-if="form.processing" class="spinner"></span>
          <span v-else>Verify</span>
        </button>
      </form>

      <div class="resend-row">
        <span class="resend-label">Didn't get the code?</span>
        <a href="/login/resend" class="resend-link" @click.prevent="resendCode">Resend</a>
      </div>

      <button type="button" class="change-email-btn" @click="goBack">
        &larr; Use a different email
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useForm, router } from '@inertiajs/vue3';

const props = defineProps({
  userName: String,
  userEmail: String,
});

const digits = ref(['', '', '', '', '', '']);
const inputs = ref([]);

const form = useForm({
  code: '',
});

const isComplete = computed(() => digits.value.every(d => d !== ''));

onMounted(() => {
  if (inputs.value[0]) {
    inputs.value[0].focus();
  }
});

function handleInput(index, event) {
  const val = event.target.value.replace(/\D/g, '');
  if (val.length === 0) {
    digits.value[index] = '';
    return;
  }

  digits.value[index] = val[0];
  event.target.value = val[0];

  // Auto-advance
  if (index < 5 && val[0]) {
    inputs.value[index + 1].focus();
  }

  // Auto-submit when all filled
  if (digits.value.every(d => d !== '')) {
    submitCode();
  }
}

function handleKeydown(index, event) {
  if (event.key === 'Backspace') {
    if (digits.value[index] === '' && index > 0) {
      // Move to previous on empty backspace
      digits.value[index - 1] = '';
      inputs.value[index - 1].focus();
      event.preventDefault();
    } else {
      digits.value[index] = '';
    }
  }
}

function handlePaste(event) {
  event.preventDefault();
  const pasted = (event.clipboardData || window.clipboardData).getData('text').replace(/\D/g, '');
  if (pasted.length === 0) return;

  for (let i = 0; i < 6 && i < pasted.length; i++) {
    digits.value[i] = pasted[i];
    if (inputs.value[i]) {
      inputs.value[i].value = pasted[i];
    }
  }

  // Focus last filled or last input
  const focusIndex = Math.min(pasted.length, 5);
  if (inputs.value[focusIndex]) {
    inputs.value[focusIndex].focus();
  }

  // Auto-submit if 6 digits pasted
  if (pasted.length >= 6) {
    submitCode();
  }
}

function submitCode() {
  form.code = digits.value.join('');
  form.post('/login/verify', {
    onError: () => {
      // Clear on error
      digits.value = ['', '', '', '', '', ''];
      if (inputs.value[0]) inputs.value[0].focus();
    },
  });
}

function resendCode() {
  router.get('/login/resend');
}

function goBack() {
  router.get('/login');
}
</script>

<style scoped>
* { box-sizing: border-box; margin: 0; padding: 0; }

.verify-screen {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background: #0e1117;
  padding: 24px;
  font-family: 'DM Mono', monospace;
  color: #e8eaf0;
}

.verify-box {
  background: #161b22;
  border: 1px solid #2d333b;
  border-radius: 16px;
  padding: 48px 40px;
  width: 100%;
  max-width: 440px;
  text-align: center;
}

.verify-logo {
  font-family: 'Syne', sans-serif;
  font-weight: 800;
  font-size: 28px;
  color: #e8eaf0;
  margin-bottom: 4px;
}

.accent { color: #e8ff47; }

.verify-sub {
  font-size: 10px;
  color: #7a8399;
  letter-spacing: 2px;
  text-transform: uppercase;
  margin-bottom: 36px;
}

.verify-icon {
  margin-bottom: 20px;
}

.verify-title {
  font-family: 'Syne', sans-serif;
  font-weight: 700;
  font-size: 20px;
  color: #e8eaf0;
  margin-bottom: 8px;
}

.verify-desc {
  font-size: 12px;
  color: #7a8399;
  line-height: 1.5;
  margin-bottom: 32px;
}

.verify-desc strong {
  color: #c9d1d9;
}

.verify-email {
  display: inline-block;
  margin-top: 4px;
  color: #e8ff47;
  font-weight: 500;
  word-break: break-all;
}

.code-form {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.otp-row {
  display: flex;
  gap: 8px;
  margin-bottom: 24px;
}

.otp-input {
  width: 48px;
  height: 56px;
  background: #0e1117;
  border: 1px solid #2d333b;
  border-radius: 10px;
  text-align: center;
  font-family: 'DM Mono', monospace;
  font-size: 22px;
  font-weight: 600;
  color: #e8ff47;
  caret-color: #e8ff47;
  outline: none;
  transition: border-color 0.15s ease;
}

.otp-input:focus {
  border-color: #e8ff47;
}

.otp-input.filled {
  border-color: rgba(232, 255, 71, 0.3);
}

.verify-btn {
  width: 100%;
  padding: 14px;
  background: #e8ff47;
  color: #0e1117;
  border: none;
  border-radius: 10px;
  font-family: 'DM Mono', monospace;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.verify-btn:hover:not(:disabled) {
  background: #f0ff7a;
  transform: translateY(-1px);
}

.verify-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.spinner {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(14, 17, 23, 0.3);
  border-top-color: #0e1117;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.verify-error {
  width: 100%;
  padding: 10px 14px;
  margin-bottom: 16px;
  border-radius: 8px;
  background: rgba(255, 107, 71, 0.1);
  border: 1px solid rgba(255, 107, 71, 0.3);
  color: #ff6b47;
  font-size: 11px;
}

.verify-success {
  width: 100%;
  padding: 10px 14px;
  margin-bottom: 16px;
  border-radius: 8px;
  background: rgba(52, 211, 153, 0.1);
  border: 1px solid rgba(52, 211, 153, 0.3);
  color: #34d399;
  font-size: 11px;
}

.resend-row {
  margin-top: 24px;
  font-size: 11px;
  color: #7a8399;
}

.resend-label {
  margin-right: 6px;
}

.resend-link {
  color: #e8ff47;
  text-decoration: none;
  cursor: pointer;
  font-weight: 500;
}

.resend-link:hover {
  text-decoration: underline;
}

.change-email-btn {
  display: inline-block;
  margin-top: 20px;
  padding: 10px 16px;
  background: transparent;
  border: 1px solid #2d333b;
  border-radius: 8px;
  color: #c9d1d9;
  font-family: 'DM Mono', monospace;
  font-size: 11px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.change-email-btn:hover {
  border-color: #e8ff47;
  color: #e8ff47;
}
</style>
