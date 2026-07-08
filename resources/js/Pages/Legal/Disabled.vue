<script setup>
import { ref } from 'vue';
import { router } from '@inertiajs/vue3';
import BrandLockup from '../../Components/BrandLockup.vue';
import Button from '../../Components/Button.vue';
import Icon from '../../Components/Icon.vue';

// Neutral landing shown to a legal reviewer while the legal-review module is
// switched OFF. Deliberately standalone (no legal nav / review queue) so it can
// never link back into the dormant review surface — just a clear message and a
// way to sign out.
defineProps({ theme: { type: String, default: null }, density: { type: String, default: null } });

const ls = (k) => { try { return localStorage.getItem(k); } catch { return null; } };
const theme = ref(ls('af-theme') || 'dark');
const density = ref(ls('af-density') || 'regular');

function logout() { router.post('/logout'); }
</script>

<template>
  <div class="af-app" :data-theme="theme" :data-density="density"
    :style="{ minHeight: '100vh', background: 'var(--surface-0)', color: 'var(--text-1)', display: 'grid', placeItems: 'center', padding: '24px' }">
    <div :style="{ width: '100%', maxWidth: '440px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '18px' }">
      <BrandLockup />
      <div :style="{ width: '52px', height: '52px', borderRadius: '999px', background: 'var(--surface-2)', display: 'grid', placeItems: 'center', color: 'var(--text-3)' }">
        <Icon name="eye" :size="24" />
      </div>
      <div>
        <h1 :style="{ fontSize: '21px', fontWeight: 800, letterSpacing: '-0.02em', margin: 0 }">Legal review is turned off</h1>
        <p :style="{ color: 'var(--text-2)', margin: '10px 0 0', fontSize: '14.5px', lineHeight: 1.5 }">
          Clip legal review is currently disabled for this workspace, so there is nothing to
          review right now. If this changes, an administrator will re-enable it and your review
          queue will return here.
        </p>
      </div>
      <Button variant="secondary" icon="logout" @click="logout">Sign out</Button>
    </div>
  </div>
</template>
