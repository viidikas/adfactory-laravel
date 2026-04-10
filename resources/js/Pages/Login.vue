<template>
  <div class="login-screen">
    <div class="login-box">
      <div class="login-logo">AD<span class="accent">.</span>FACTORY</div>
      <div class="login-sub">GROWTH PORTAL</div>

      <form @submit.prevent="submit" class="login-form">
        <label class="login-label" for="email">YOUR EMAIL</label>
        <input
          id="email"
          v-model="form.email"
          type="email"
          class="login-input"
          placeholder="name@company.com"
          :disabled="form.processing"
          autocomplete="email"
          autofocus
        />

        <button type="submit" class="login-button" :class="{ loading: form.processing }" :disabled="form.processing || !form.email">
          <span v-if="!form.processing">Send login code</span>
          <span v-else class="spinner"></span>
        </button>
      </form>

      <div v-if="$page.props.flash?.error" class="login-error">
        {{ $page.props.flash.error }}
      </div>
      <div v-if="$page.props.flash?.success" class="login-success">
        {{ $page.props.flash.success }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { useForm } from '@inertiajs/vue3';

const form = useForm({
  email: '',
});

function submit() {
  form.post('/login/select');
}
</script>

<style scoped>
* { box-sizing: border-box; margin: 0; padding: 0; }

.login-screen {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background: #0e1117;
  padding: 24px;
  font-family: 'DM Mono', monospace;
  color: #e8eaf0;
}

.login-box {
  background: #161b22;
  border: 1px solid #2d333b;
  border-radius: 16px;
  padding: 48px 40px;
  width: 100%;
  max-width: 440px;
}

.login-logo {
  font-family: 'Syne', sans-serif;
  font-weight: 800;
  font-size: 28px;
  color: #e8eaf0;
  text-align: center;
  margin-bottom: 4px;
}

.accent { color: #e8ff47; }

.login-sub {
  font-size: 10px;
  color: #7a8399;
  letter-spacing: 2px;
  text-transform: uppercase;
  text-align: center;
  margin-bottom: 36px;
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.login-label {
  font-size: 10px;
  color: #7a8399;
  letter-spacing: 1.5px;
  text-transform: uppercase;
}

.login-input {
  width: 100%;
  padding: 14px 16px;
  background: #0e1117;
  border: 1px solid #2d333b;
  border-radius: 10px;
  color: #e8eaf0;
  font-family: 'DM Mono', monospace;
  font-size: 14px;
  outline: none;
  transition: border-color 0.15s ease;
}

.login-input:focus {
  border-color: #e8ff47;
}

.login-input::placeholder {
  color: #484f58;
}

.login-input:disabled {
  opacity: 0.6;
}

.login-button {
  width: 100%;
  padding: 14px 16px;
  background: #e8ff47;
  border: none;
  border-radius: 10px;
  color: #0e1117;
  font-family: 'DM Mono', monospace;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.5px;
  cursor: pointer;
  transition: all 0.15s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 46px;
}

.login-button:hover:not(:disabled) {
  background: #f0ff6b;
}

.login-button:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.login-button.loading {
  opacity: 1;
  background: #2d333b;
}

.spinner {
  width: 18px;
  height: 18px;
  border: 2px solid #484f58;
  border-top-color: #e8ff47;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.login-error {
  margin-top: 20px;
  padding: 12px;
  border-radius: 8px;
  background: rgba(255, 107, 71, 0.1);
  border: 1px solid rgba(255, 107, 71, 0.3);
  color: #ff6b47;
  font-size: 11px;
  text-align: center;
}

.login-success {
  margin-top: 20px;
  padding: 12px;
  border-radius: 8px;
  background: rgba(232, 255, 71, 0.1);
  border: 1px solid rgba(232, 255, 71, 0.3);
  color: #e8ff47;
  font-size: 11px;
  text-align: center;
}
</style>
