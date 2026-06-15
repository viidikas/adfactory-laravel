<script setup>
import { computed } from 'vue';
import { router } from '@inertiajs/vue3';
import AppLayout from '../Layouts/AppLayout.vue';
import Card from '../Components/Card.vue';
import Button from '../Components/Button.vue';
import StatCard from '../Components/StatCard.vue';
import StatusPill from '../Components/StatusPill.vue';
import Progress from '../Components/Progress.vue';
import Icon from '../Components/Icon.vue';

const props = defineProps({
  stats: { type: Array, default: () => [] },
  orders: { type: Array, default: () => [] },
  activity: { type: Array, default: () => [] },
  markets: { type: Array, default: () => [] },
  workspace: { type: String, default: 'admin' },
  theme: { type: String, default: null },
  density: { type: String, default: null },
  user: { type: Object, default: () => ({ name: 'Mark Viidik', email: 'mark@creditstar.com' }) },
});

const wsq = computed(() => (props.workspace === 'portal' ? '?ws=portal' : ''));
const firstName = computed(() => (props.user.name || 'there').split(' ')[0]);
const marketOf = (code) => props.markets.find((m) => m.code === code) || { flag: '🏳️' };
const attention = computed(() => props.orders.filter((o) => ['Review', 'In production', 'Submitted'].includes(o.status)).slice(0, 5));
const actIcon = { submit: 'send', render: 'film', clip: 'scissors', copy: 'filetext' };

const openOrder = (id) => router.visit(`/design/orders${wsq.value ? wsq.value + '&' : '?'}open=${id}`);
const go = (url) => router.visit(url);
</script>

<template>
  <AppLayout active="dashboard" :workspace="workspace" :theme="theme" :density="density" :user="user">
    <div :style="{ padding: 'var(--pad-screen)', display: 'flex', flexDirection: 'column', gap: 'var(--gap)' }">
      <div :style="{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }">
        <div>
          <h1 :style="{ fontSize: '27px', fontWeight: 800, letterSpacing: '-0.02em', margin: 0 }">Welcome back, {{ firstName }} 👋</h1>
          <p :style="{ color: 'var(--text-2)', margin: '6px 0 0', fontSize: '14.5px' }">Here's what's moving through the factory today.</p>
        </div>
        <Button icon="plus" @click="go('/design/orders/create' + wsq)">New order</Button>
      </div>

      <div :style="{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--gap)' }">
        <StatCard v-for="s in stats" :key="s.label" :stat="s" />
      </div>

      <div :style="{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 'var(--gap)', alignItems: 'start' }">
        <Card :pad="false">
          <div :style="{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px var(--pad-card)' }">
            <div :style="{ fontSize: '16px', fontWeight: 700 }">Needs your attention</div>
            <button @click="go('/design/orders' + wsq)" :style="{ background: 'none', border: 'none', color: 'var(--link)', fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: '4px' }">
              All orders <Icon name="chevright" :size="14" />
            </button>
          </div>
          <div>
            <div
              v-for="o in attention" :key="o.id"
              @click="openOrder(o.id)" class="row-hover"
              :style="{ display: 'grid', gridTemplateColumns: '1fr auto auto', alignItems: 'center', gap: '14px', padding: '13px var(--pad-card)', borderTop: '1px solid var(--divider)', cursor: 'pointer' }"
            >
              <div :style="{ minWidth: 0 }">
                <div :style="{ fontSize: '14px', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }">{{ o.title }}</div>
                <div :style="{ fontSize: '12.5px', color: 'var(--text-3)', marginTop: '3px' }">{{ marketOf(o.market).flag }} {{ o.brand }} · {{ o.clipCount }} clips · {{ o.id }}</div>
              </div>
              <div :style="{ width: '90px' }"><Progress :value="o.progress" /></div>
              <StatusPill :status="o.status" />
            </div>
          </div>
        </Card>

        <Card :pad="false">
          <div :style="{ padding: '16px var(--pad-card)', fontSize: '16px', fontWeight: 700 }">Recent activity</div>
          <div :style="{ padding: '0 var(--pad-card) 8px' }">
            <div v-for="(a, i) in activity" :key="i" :style="{ display: 'flex', gap: '12px', padding: '11px 0', borderTop: '1px solid var(--divider)' }">
              <div :style="{ width: '32px', height: '32px', borderRadius: '9px', background: 'var(--surface-3)', display: 'grid', placeItems: 'center', color: 'var(--text-2)', flexShrink: 0 }">
                <Icon :name="actIcon[a.kind]" :size="15" />
              </div>
              <div :style="{ fontSize: '13.5px', lineHeight: 1.45 }">
                <strong>{{ a.who }}</strong> <span :style="{ color: 'var(--text-2)' }">{{ a.what }}</span> <span :style="{ color: 'var(--text-1)' }">{{ a.target }}</span>
                <div :style="{ fontSize: '12px', color: 'var(--text-3)', marginTop: '2px' }">{{ a.when }}</div>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  </AppLayout>
</template>
