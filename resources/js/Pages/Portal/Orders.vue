<script setup>
import { ref, computed, onMounted } from 'vue';
import PortalLayout from '../../Layouts/PortalLayout.vue';
import Card from '../../Components/Card.vue';
import Button from '../../Components/Button.vue';
import Tag from '../../Components/Tag.vue';
import StatusPill from '../../Components/StatusPill.vue';
import EmptyState from '../../Components/EmptyState.vue';
import Icon from '../../Components/Icon.vue';
import { api } from '../../lib/api.js';

const props = defineProps({
  justSubmitted: { type: Boolean, default: false },
  theme: { type: String, default: null },
  density: { type: String, default: null },
});

const orders = ref([]);
const loading = ref(true);
const error = ref('');
const open = ref(null);
const showBanner = ref(props.justSubmitted);

async function load() {
  const data = await api.get('/api/orders');
  orders.value = Array.isArray(data) ? data : [];
}
onMounted(async () => {
  try { await load(); if (orders.value.length) open.value = orders.value[0].id; }
  catch (e) { error.value = e.message || 'Failed to load orders.'; }
  finally { loading.value = false; }
  if (showBanner.value) setTimeout(() => { showBanner.value = false; }, 6000);
});

const fmtDate = (unix) => (unix ? new Date(unix * 1000).toLocaleDateString() : '');
const renderedFor = (o, i) => (o.rendered_clips || []).filter((rc) => rc.item_index === i || rc.item_index === undefined);
const toggle = (id) => { open.value = open.value === id ? null : id; };
</script>

<template>
  <PortalLayout active="orders" :theme="theme" :density="density">
    <div :style="{ padding: 'var(--pad-screen)', display: 'flex', flexDirection: 'column', gap: 'var(--gap)' }">
      <div v-if="showBanner" :style="{ display: 'flex', alignItems: 'center', gap: '10px', padding: '14px 18px', borderRadius: '14px', background: 'var(--accent-soft)', color: 'var(--accent)', fontSize: '14px', fontWeight: 600 }">
        <Icon name="check_circle" :size="20" /> Order submitted — you'll be notified when your clips are ready.
      </div>

      <div>
        <h1 :style="{ fontSize: '27px', fontWeight: 800, letterSpacing: '-0.02em', margin: 0 }">My orders</h1>
        <p :style="{ color: 'var(--text-2)', margin: '6px 0 0', fontSize: '14.5px' }">{{ orders.length }} order(s) in the pipeline.</p>
      </div>

      <div v-if="error" :style="{ padding: '14px 18px', borderRadius: '12px', background: 'var(--danger-soft)', color: 'var(--danger)', fontSize: '14px' }">{{ error }}</div>
      <div v-else-if="loading" :style="{ color: 'var(--text-3)', fontSize: '14px' }">Loading…</div>
      <Card v-else-if="!orders.length"><EmptyState icon="clipboard" title="No orders yet" sub="Browse clips and add them to an order to get started." /></Card>

      <Card v-for="o in orders" :key="o.id" :pad="false">
        <div class="row-hover" @click="toggle(o.id)" :style="{ display: 'flex', alignItems: 'center', gap: '14px', padding: '16px var(--pad-card)', cursor: 'pointer' }">
          <Icon :name="open === o.id ? 'chevdown' : 'chevright'" :size="18" :style="{ color: 'var(--text-3)' }" />
          <div :style="{ flex: 1, minWidth: 0 }">
            <div :style="{ fontSize: '15px', fontWeight: 700 }">{{ o.brand }} · {{ o.market }}</div>
            <div :style="{ fontSize: '12.5px', color: 'var(--text-3)', marginTop: '2px' }">{{ (o.items || []).length }} clips · {{ fmtDate(o.created) }}</div>
          </div>
          <StatusPill :status="o.status" />
        </div>

        <div v-if="open === o.id" :style="{ padding: '0 var(--pad-card) 18px', borderTop: '1px solid var(--divider)' }">
          <div v-if="o.note" :style="{ fontSize: '13.5px', color: 'var(--text-2)', margin: '14px 0', padding: '10px 12px', background: 'var(--surface-2)', borderRadius: '10px' }">{{ o.note }}</div>
          <div :style="{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '12px', marginTop: '14px' }">
            <div v-for="(it, i) in o.items" :key="i" :style="{ padding: '12px', borderRadius: '12px', background: 'var(--surface-2)', border: '1px solid var(--border)' }">
              <div :style="{ fontSize: '13.5px', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }">{{ it.clipName }}</div>
              <div :style="{ fontSize: '12px', color: 'var(--text-3)', margin: '4px 0 8px' }">{{ it.slate }} · {{ it.copyText?.en || it.copyKey }}</div>
              <div :style="{ display: 'flex', gap: '5px', flexWrap: 'wrap' }">
                <Tag v-for="l in it.langs" :key="l" :clickable="false">{{ String(l).toUpperCase() }}</Tag>
                <Tag v-for="d in (it.designs || [])" :key="d" :clickable="false">{{ d }}</Tag>
              </div>
              <div v-for="(rc, ri) in renderedFor(o, i)" :key="ri" :style="{ marginTop: '8px' }">
                <a :href="rc.url" :style="{ textDecoration: 'none' }"><Button size="sm" variant="secondary" icon="download" full>{{ rc.filename || 'Download' }}</Button></a>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  </PortalLayout>
</template>
