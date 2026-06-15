<script setup>
import { ref, computed } from 'vue';
import { router } from '@inertiajs/vue3';
import AppLayout from '../../Layouts/AppLayout.vue';
import Card from '../../Components/Card.vue';
import Button from '../../Components/Button.vue';
import Tag from '../../Components/Tag.vue';
import StatusPill from '../../Components/StatusPill.vue';
import Progress from '../../Components/Progress.vue';
import Drawer from '../../Components/Drawer.vue';
import Thumb from '../../Components/Thumb.vue';
import SectionLabel from '../../Components/SectionLabel.vue';
import Icon from '../../Components/Icon.vue';

const props = defineProps({
  orders: { type: Array, default: () => [] },
  markets: { type: Array, default: () => [] },
  designs: { type: Array, default: () => [] },
  clips: { type: Array, default: () => [] },
  statuses: { type: Array, default: () => [] },
  langs: { type: Array, default: () => [] },
  openId: { type: String, default: null },
  justSubmitted: { type: Boolean, default: false },
  workspace: { type: String, default: 'admin' },
  theme: { type: String, default: null },
  density: { type: String, default: null },
  user: { type: Object, default: () => ({ name: 'Mark Viidik', email: 'mark@creditstar.com' }) },
});

const wsq = computed(() => (props.workspace === 'portal' ? '?ws=portal' : ''));
const tab = ref('All');
const detail = ref(props.openId || null);

const marketOf = (code) => props.markets.find((m) => m.code === code) || { flag: '🏳️', name: code };
const designOf = (id) => props.designs.find((d) => d.id === id);
const counts = computed(() => Object.fromEntries(props.statuses.map((s) => [s, props.orders.filter((o) => o.status === s).length])));
const tabs = computed(() => ['All', ...props.statuses]);
const filtered = computed(() => props.orders.filter((o) => tab.value === 'All' || o.status === tab.value));
const detailOrder = computed(() => props.orders.find((o) => o.id === detail.value));

const timeline = ['Submitted', 'In production', 'Rendering', 'Review', 'Delivered'];
const curIdx = computed(() => (detailOrder.value ? timeline.indexOf(detailOrder.value.status) : -1));
const detailClips = computed(() => (detailOrder.value ? props.clips.filter((c) => c.aspect === detailOrder.value.aspect).slice(0, detailOrder.value.clipCount) : []));
const detailFacts = computed(() => {
  const o = detailOrder.value;
  if (!o) return [];
  return [
    ['Design', designOf(o.design)?.name || '—'],
    ['Clips', o.clipCount + ' selected'],
    ['Progress', o.progress + '%'],
    ['Due', o.dueDays < 0 ? Math.abs(o.dueDays) + 'd overdue' : 'in ' + o.dueDays + 'd'],
  ];
});
const renderVariants = computed(() => {
  const o = detailOrder.value;
  if (!o) return [];
  return props.langs.slice(0, Math.max(2, (o.clipCount % 4) + 1)).map((l) => `${o.id}_${l}_${o.aspect.replace(':', 'x')}.mp4`);
});
const go = (url) => router.visit(url);
</script>

<template>
  <AppLayout active="orders" :workspace="workspace" :theme="theme" :density="density" :user="user">
    <div :style="{ padding: 'var(--pad-screen)', display: 'flex', flexDirection: 'column', gap: 'var(--gap)' }">
      <div v-if="justSubmitted" :style="{ display: 'flex', alignItems: 'center', gap: '10px', padding: '14px 18px', borderRadius: '14px', background: 'var(--accent-soft)', color: 'var(--accent)', fontSize: '14px', fontWeight: 600 }">
        <Icon name="check_circle" :size="20" /> Order submitted ⚡ — the production team has been notified.
      </div>

      <div :style="{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }">
        <div>
          <h1 :style="{ fontSize: '27px', fontWeight: 800, letterSpacing: '-0.02em', margin: 0 }">{{ workspace === 'portal' ? 'My orders' : 'Orders' }}</h1>
          <p :style="{ color: 'var(--text-2)', margin: '6px 0 0', fontSize: '14.5px' }">{{ orders.length }} orders in the pipeline</p>
        </div>
        <Button icon="plus" @click="go('/design/orders/create' + wsq)">New order</Button>
      </div>

      <div :style="{ display: 'flex', gap: '8px', flexWrap: 'wrap', overflowX: 'auto', paddingBottom: '2px' }">
        <Tag v-for="t in tabs" :key="t" :active="tab === t" @click="tab = t">
          {{ t }}<span v-if="t !== 'All' && counts[t]" :style="{ opacity: 0.6, marginLeft: '4px' }">{{ counts[t] }}</span>
        </Tag>
      </div>

      <Card :pad="false">
        <div :style="{ display: 'grid', gridTemplateColumns: '1.7fr 1fr 0.9fr 1.1fr 0.9fr', gap: '14px', padding: '12px var(--pad-card)', fontSize: '12px', fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.04em' }">
          <div>Order</div><div>Brand · market</div><div>Clips</div><div>Progress</div><div :style="{ textAlign: 'right' }">Status</div>
        </div>
        <div
          v-for="o in filtered" :key="o.id"
          @click="detail = o.id" class="row-hover"
          :style="{ display: 'grid', gridTemplateColumns: '1.7fr 1fr 0.9fr 1.1fr 0.9fr', gap: '14px', alignItems: 'center', padding: '13px var(--pad-card)', borderTop: '1px solid var(--divider)', cursor: 'pointer' }"
        >
          <div :style="{ minWidth: 0 }">
            <div :style="{ fontSize: '14px', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }">{{ o.title }}</div>
            <div :style="{ fontSize: '12px', color: 'var(--text-3)', marginTop: '3px' }">{{ o.id }} · {{ o.requestedBy }}</div>
          </div>
          <div :style="{ fontSize: '13px', color: 'var(--text-2)' }">{{ marketOf(o.market).flag }} {{ o.brand }}</div>
          <div :style="{ fontSize: '13px', color: 'var(--text-2)' }">{{ o.clipCount }}</div>
          <div :style="{ display: 'flex', alignItems: 'center', gap: '8px' }"><div :style="{ flex: 1, maxWidth: '90px' }"><Progress :value="o.progress" /></div><span :style="{ fontSize: '12px', color: 'var(--text-3)' }">{{ o.progress }}%</span></div>
          <div :style="{ display: 'flex', justifyContent: 'flex-end' }"><StatusPill :status="o.status" /></div>
        </div>
      </Card>
    </div>

    <!-- Order detail drawer -->
    <Drawer :open="!!detailOrder" :title="detailOrder ? detailOrder.id : ''" @close="detail = null">
      <div v-if="detailOrder">
        <StatusPill :status="detailOrder.status" />
        <h2 :style="{ fontSize: '21px', fontWeight: 800, letterSpacing: '-0.02em', margin: '12px 0 4px' }">{{ detailOrder.title }}</h2>
        <div :style="{ fontSize: '13.5px', color: 'var(--text-2)' }">{{ marketOf(detailOrder.market).flag }} {{ detailOrder.brand }} · {{ detailOrder.aspect }} · requested by {{ detailOrder.requestedBy }}</div>

        <!-- timeline -->
        <div :style="{ display: 'flex', alignItems: 'center', gap: '8px', margin: '22px 0', fontSize: '12.5px' }">
          <template v-for="(s, i) in timeline" :key="s">
            <div :style="{ textAlign: 'center', flex: 1 }">
              <div :style="{ width: '18px', height: '18px', borderRadius: '999px', margin: '0 auto 6px', background: i <= curIdx ? 'var(--accent)' : 'var(--surface-3)', display: 'grid', placeItems: 'center' }">
                <Icon v-if="i < curIdx" name="check" :size="11" :stroke="3" :style="{ color: 'var(--text-on-accent)' }" />
              </div>
              <div :style="{ color: i <= curIdx ? 'var(--text-1)' : 'var(--text-3)', fontWeight: i === curIdx ? 700 : 400, fontSize: '10.5px' }">{{ s }}</div>
            </div>
            <div v-if="i < timeline.length - 1" :style="{ height: '2px', flex: 0.5, background: i < curIdx ? 'var(--accent)' : 'var(--surface-3)', marginBottom: '20px' }" />
          </template>
        </div>

        <div :style="{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }">
          <div v-for="f in detailFacts" :key="f[0]" :style="{ padding: '12px', borderRadius: '12px', background: 'var(--surface-2)', border: '1px solid var(--border)' }">
            <div :style="{ fontSize: '12px', color: 'var(--text-3)' }">{{ f[0] }}</div>
            <div :style="{ fontSize: '14.5px', fontWeight: 700, marginTop: '3px', color: String(f[1]).includes('overdue') ? 'var(--danger)' : 'var(--text-1)' }">{{ f[1] }}</div>
          </div>
        </div>

        <SectionLabel>Clips in this order</SectionLabel>
        <div :style="{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginTop: '6px', marginBottom: '20px' }">
          <Thumb v-for="c in detailClips" :key="c.id" :clip="c" :show-play="false" />
        </div>

        <SectionLabel>Rendered variants</SectionLabel>
        <div :style="{ marginTop: '6px' }">
          <div v-for="name in renderVariants" :key="name" :style="{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 0', borderTop: '1px solid var(--divider)' }">
            <div :style="{ display: 'flex', alignItems: 'center', gap: '10px' }">
              <Icon name="film" :size="16" :style="{ color: 'var(--text-3)' }" />
              <span class="mono" :style="{ fontSize: '13px' }">{{ name }}</span>
            </div>
            <Button v-if="curIdx >= 2" size="sm" variant="ghost" icon="download">Download</Button>
            <span v-else :style="{ fontSize: '12px', color: 'var(--text-3)' }">queued</span>
          </div>
        </div>
      </div>
      <template #footer>
        <Button variant="secondary" icon="download" full>Templater CSV</Button>
        <Button icon="external" full>Open renders</Button>
      </template>
    </Drawer>
  </AppLayout>
</template>
