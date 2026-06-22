<script setup>
import { ref, onMounted } from 'vue';
import { router } from '@inertiajs/vue3';
import AppLayout from '../../Layouts/AppLayout.vue';
import Card from '../../Components/Card.vue';
import Icon from '../../Components/Icon.vue';
import { api } from '../../lib/api.js';

defineProps({
  theme: { type: String, default: null },
  density: { type: String, default: null },
});

const markets = ref([]);
const loading = ref(true);
const error = ref('');

onMounted(async () => {
  try {
    const data = await api.get('/api/markets');
    markets.value = Array.isArray(data) ? data : [];
  } catch (e) {
    error.value = e.message || 'Failed to load markets.';
  } finally {
    loading.value = false;
  }
});

const openMarket = (m) => router.visit('/delivered/' + encodeURIComponent(m.code));
</script>

<template>
  <AppLayout active="delivered" workspace="admin" :theme="theme" :density="density">
    <div :style="{ padding: 'var(--pad-screen)', display: 'flex', flexDirection: 'column', gap: 'var(--gap)' }">
      <div>
        <h1 :style="{ fontSize: '27px', fontWeight: 800, letterSpacing: '-0.02em', margin: 0 }">Delivered clips</h1>
        <p :style="{ color: 'var(--text-2)', margin: '6px 0 0', fontSize: '14.5px' }">Final rendered creative per market. Pick a market to upload and manage its delivered clips.</p>
      </div>

      <div v-if="error" :style="{ padding: '14px 18px', borderRadius: '12px', background: 'var(--danger-soft)', color: 'var(--danger)', fontSize: '14px' }">{{ error }}</div>

      <Card :pad="false">
        <div :style="{ display: 'grid', gridTemplateColumns: '1.6fr 1fr 1fr 0.8fr', gap: '14px', padding: '12px var(--pad-card)', fontSize: '12px', fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.04em' }">
          <div>Market</div><div>Brand</div><div>Delivered clips</div><div :style="{ textAlign: 'right' }">State</div>
        </div>
        <div v-if="loading" :style="{ padding: '28px var(--pad-card)', color: 'var(--text-3)', fontSize: '14px' }">Loading…</div>
        <div v-else-if="!markets.length" :style="{ padding: '28px var(--pad-card)', color: 'var(--text-3)', fontSize: '14px' }">No markets yet.</div>
        <div
          v-for="m in markets" :key="m.id"
          class="row-hover"
          :style="{ display: 'grid', gridTemplateColumns: '1.6fr 1fr 1fr 0.8fr', gap: '14px', alignItems: 'center', padding: '13px var(--pad-card)', borderTop: '1px solid var(--divider)', cursor: 'pointer' }"
          @click="openMarket(m)"
        >
          <div :style="{ fontSize: '14px', fontWeight: 700 }">{{ m.code }} <span :style="{ color: 'var(--text-3)', fontWeight: 400 }">· {{ m.name }}</span></div>
          <div :style="{ fontSize: '13px', color: 'var(--text-2)' }">{{ m.brand }}</div>
          <div :style="{ fontSize: '13px', color: 'var(--text-2)' }">
            <span :style="{ color: m.delivered_count ? 'var(--accent)' : 'var(--text-3)', fontWeight: 600 }">{{ m.delivered_count || 0 }}</span> clip{{ m.delivered_count === 1 ? '' : 's' }}
          </div>
          <div :style="{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '8px' }">
            <span :style="{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', fontWeight: 600, color: m.active ? 'var(--success)' : 'var(--text-3)' }">
              <span :style="{ width: '7px', height: '7px', borderRadius: '999px', background: 'currentColor' }" />{{ m.active ? 'Active' : 'Inactive' }}
            </span>
            <Icon name="chevright" :size="16" :style="{ color: 'var(--text-3)' }" />
          </div>
        </div>
      </Card>
    </div>
  </AppLayout>
</template>
