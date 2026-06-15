<script setup>
import { ref, computed, onMounted } from 'vue';
import { router, usePage } from '@inertiajs/vue3';
import AppLayout from '../../Layouts/AppLayout.vue';
import Card from '../../Components/Card.vue';
import Button from '../../Components/Button.vue';
import StatCard from '../../Components/StatCard.vue';
import StatusPill from '../../Components/StatusPill.vue';
import Icon from '../../Components/Icon.vue';
import { api } from '../../lib/api.js';

defineProps({
  theme: { type: String, default: null },
  density: { type: String, default: null },
});

const page = usePage();
const firstName = computed(() => (page.props.auth?.user?.name || 'there').split(' ')[0]);

const orders = ref([]);
const markets = ref([]);
const meta = ref({ clips_count: 0, active_project: null });
const loading = ref(true);
const error = ref('');

onMounted(async () => {
  try {
    const [o, m, cm] = await Promise.all([
      api.get('/api/orders'),
      api.get('/api/markets'),
      api.get('/api/clips-meta'),
    ]);
    orders.value = Array.isArray(o) ? o : [];
    markets.value = Array.isArray(m) ? m : [];
    meta.value = cm || meta.value;
  } catch (e) {
    error.value = e.message || 'Failed to load dashboard.';
  } finally {
    loading.value = false;
  }
});

const openOrders = computed(() => orders.value.filter((o) => o.status === 'pending' || o.status === 'processing'));
const readyOrders = computed(() => orders.value.filter((o) => o.status === 'ready'));
const pendingOrders = computed(() => orders.value.filter((o) => o.status === 'pending'));
const activeMarkets = computed(() => markets.value.filter((m) => m.active));

// 7-day order volume sparkline from real created timestamps.
const orderSpark = computed(() => {
  const days = Array(7).fill(0);
  const now = Date.now();
  orders.value.forEach((o) => {
    const t = (o.created || 0) * 1000;
    const ageDays = Math.floor((now - t) / 86400000);
    if (ageDays >= 0 && ageDays < 7) days[6 - ageDays] += 1;
  });
  return days;
});

const stats = computed(() => [
  { label: 'Open orders', value: openOrders.value.length, delta: pendingOrders.value.length + ' pending', good: true, spark: orderSpark.value },
  { label: 'Ready to ship', value: readyOrders.value.length, delta: '', good: true, spark: [] },
  { label: 'Active markets', value: activeMarkets.value.length, delta: markets.value.length + ' total', good: true, spark: [] },
  { label: 'Clips in library', value: meta.value.clips_count || 0, delta: meta.value.active_project?.name || '', good: true, spark: [] },
]);

// Oldest open orders first — what's been waiting.
const attention = computed(() =>
  [...openOrders.value].sort((a, b) => (a.created || 0) - (b.created || 0)).slice(0, 6)
);
// Most recent orders → activity feed.
const activity = computed(() =>
  [...orders.value].sort((a, b) => (b.created || 0) - (a.created || 0)).slice(0, 6)
);

const shortId = (id) => String(id || '').slice(0, 8);
const ago = (unix) => {
  if (!unix) return '';
  const s = Math.floor((Date.now() - unix * 1000) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return Math.floor(s / 60) + 'm ago';
  if (s < 86400) return Math.floor(s / 3600) + 'h ago';
  return Math.floor(s / 86400) + 'd ago';
};
const openOrder = (id) => router.visit('/orders?open=' + id);
</script>

<template>
  <AppLayout active="dashboard" workspace="admin" :theme="theme" :density="density">
    <div :style="{ padding: 'var(--pad-screen)', display: 'flex', flexDirection: 'column', gap: 'var(--gap)' }">
      <div :style="{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }">
        <div>
          <h1 :style="{ fontSize: '27px', fontWeight: 800, letterSpacing: '-0.02em', margin: 0 }">Welcome back, {{ firstName }} 👋</h1>
          <p :style="{ color: 'var(--text-2)', margin: '6px 0 0', fontSize: '14.5px' }">Here's what's moving through the factory today.</p>
        </div>
        <Button icon="clipboard" @click="router.visit('/orders')">All orders</Button>
      </div>

      <div v-if="error" :style="{ padding: '14px 18px', borderRadius: '12px', background: 'var(--danger-soft)', color: 'var(--danger)', fontSize: '14px' }">{{ error }}</div>

      <div :style="{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--gap)' }">
        <StatCard v-for="s in stats" :key="s.label" :stat="s" />
      </div>

      <div :style="{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 'var(--gap)', alignItems: 'start' }">
        <Card :pad="false">
          <div :style="{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px var(--pad-card)' }">
            <div :style="{ fontSize: '16px', fontWeight: 700 }">Needs your attention</div>
            <button @click="router.visit('/orders')" :style="{ background: 'none', border: 'none', color: 'var(--link)', fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: '4px' }">
              All orders <Icon name="chevright" :size="14" />
            </button>
          </div>
          <div v-if="loading" :style="{ padding: '24px var(--pad-card)', color: 'var(--text-3)', fontSize: '14px' }">Loading…</div>
          <div v-else-if="!attention.length" :style="{ padding: '24px var(--pad-card)', color: 'var(--text-3)', fontSize: '14px' }">Nothing waiting — all caught up. 🎉</div>
          <div v-else>
            <div
              v-for="o in attention" :key="o.id"
              @click="openOrder(o.id)" class="row-hover"
              :style="{ display: 'grid', gridTemplateColumns: '1fr auto', alignItems: 'center', gap: '14px', padding: '13px var(--pad-card)', borderTop: '1px solid var(--divider)', cursor: 'pointer' }"
            >
              <div :style="{ minWidth: 0 }">
                <div :style="{ fontSize: '14px', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }">{{ o.user_name || 'Order' }} · {{ o.brand }}</div>
                <div :style="{ fontSize: '12.5px', color: 'var(--text-3)', marginTop: '3px' }">{{ o.market || '—' }} · {{ (o.items || []).length }} clips · {{ shortId(o.id) }} · {{ ago(o.created) }}</div>
              </div>
              <StatusPill :status="o.status" />
            </div>
          </div>
        </Card>

        <Card :pad="false">
          <div :style="{ padding: '16px var(--pad-card)', fontSize: '16px', fontWeight: 700 }">Recent activity</div>
          <div v-if="!loading && !activity.length" :style="{ padding: '0 var(--pad-card) 20px', color: 'var(--text-3)', fontSize: '14px' }">No orders yet.</div>
          <div :style="{ padding: '0 var(--pad-card) 8px' }">
            <div v-for="a in activity" :key="a.id" :style="{ display: 'flex', gap: '12px', padding: '11px 0', borderTop: '1px solid var(--divider)' }">
              <div :style="{ width: '32px', height: '32px', borderRadius: '9px', background: 'var(--surface-3)', display: 'grid', placeItems: 'center', color: 'var(--text-2)', flexShrink: 0 }">
                <Icon name="send" :size="15" />
              </div>
              <div :style="{ fontSize: '13.5px', lineHeight: 1.45 }">
                <strong>{{ a.user_name || 'Someone' }}</strong> <span :style="{ color: 'var(--text-2)' }">submitted</span> <span :style="{ color: 'var(--text-1)' }">{{ a.brand }} · {{ a.market }}</span>
                <div :style="{ fontSize: '12px', color: 'var(--text-3)', marginTop: '2px' }">{{ ago(a.created) }} · {{ (a.items || []).length }} clips</div>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  </AppLayout>
</template>
