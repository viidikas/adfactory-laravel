<template>
  <div class="login-screen">
    <div class="login-box">
      <div class="login-logo">AD<span class="accent">.</span>FACTORY</div>
      <div class="login-sub">GROWTH PORTAL</div>

      <div class="login-label">WHO ARE YOU?</div>

      <div class="user-list">
        <button
          v-for="user in users"
          :key="user.id"
          class="user-card"
          :class="{ loading: form.processing && form.user_id === user.id }"
          :disabled="form.processing"
          @click="selectUser(user)"
        >
          <div class="user-initials" :class="user.role === 'admin' ? 'initials-admin' : 'initials-growth'">
            {{ getInitials(user.name) }}
          </div>
          <div class="user-info">
            <div class="user-name">{{ user.name }}</div>
            <div class="user-meta">
              <span class="role-label" :class="user.role === 'admin' ? 'role-admin' : 'role-growth'">
                {{ user.role === 'admin' ? 'Admin' : 'Growth Lead' }}
              </span>
              <span v-if="user.market" class="market-badge">{{ user.market }}</span>
            </div>
          </div>
          <div v-if="form.processing && form.user_id === user.id" class="spinner"></div>
          <div v-else class="arrow">&#8250;</div>
        </button>
      </div>

      <div v-if="$page.props.flash?.error" class="login-error">
        {{ $page.props.flash.error }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { useForm } from '@inertiajs/vue3';

const props = defineProps({
  users: Array,
});

const form = useForm({
  user_id: null,
});

function getInitials(name) {
  return name
    .split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function selectUser(user) {
  form.user_id = user.id;
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

.login-label {
  font-size: 10px;
  color: #7a8399;
  letter-spacing: 1.5px;
  text-transform: uppercase;
  margin-bottom: 16px;
}

.user-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.user-card {
  display: flex;
  align-items: center;
  gap: 14px;
  width: 100%;
  padding: 14px 16px;
  background: #0e1117;
  border: 1px solid #2d333b;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.15s ease;
  color: #e8eaf0;
  font-family: 'DM Mono', monospace;
  text-align: left;
}

.user-card:hover:not(:disabled) {
  border-color: #e8ff47;
  background: #1a1f28;
}

.user-card:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.user-card.loading {
  border-color: #e8ff47;
  opacity: 1;
}

.user-initials {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 600;
  flex-shrink: 0;
  letter-spacing: 0.5px;
}

.initials-admin {
  background: rgba(232, 255, 71, 0.15);
  color: #e8ff47;
}

.initials-growth {
  background: rgba(71, 200, 255, 0.15);
  color: #47c8ff;
}

.user-info {
  flex: 1;
  min-width: 0;
}

.user-name {
  font-size: 13px;
  font-weight: 500;
  margin-bottom: 3px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.user-meta {
  display: flex;
  align-items: center;
  gap: 8px;
}

.role-label {
  font-size: 9px;
  letter-spacing: 0.5px;
  text-transform: uppercase;
}

.role-admin { color: #e8ff47; }
.role-growth { color: #47c8ff; }

.market-badge {
  font-size: 9px;
  padding: 2px 6px;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.06);
  color: #7a8399;
  letter-spacing: 0.5px;
  font-weight: 500;
}

.arrow {
  font-size: 20px;
  color: #484f58;
  flex-shrink: 0;
}

.spinner {
  width: 18px;
  height: 18px;
  border: 2px solid #2d333b;
  border-top-color: #e8ff47;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
  flex-shrink: 0;
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
</style>
