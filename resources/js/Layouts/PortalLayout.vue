<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { router, usePage } from '@inertiajs/vue3';
import AppLayout from './AppLayout.vue';
import Drawer from '../Components/Drawer.vue';
import Button from '../Components/Button.vue';
import Select from '../Components/Select.vue';
import Tag from '../Components/Tag.vue';
import Icon from '../Components/Icon.vue';
import Thumb from '../Components/Thumb.vue';
import NavItem from '../Components/NavItem.vue';
import { api } from '../lib/api.js';
import { usePortalStore, setMarket, removeFromBasket, clearBasket } from '../lib/portalStore.js';

const props = defineProps({
  active: { type: String, default: '' },
  theme: { type: String, default: null },
  density: { type: String, default: null },
});

const store = usePortalStore();
const page = usePage();
const markets = ref([]);
const designs = ref([]);     // active project designs (all brands) for render-row calc
const deliveredCount = ref(0); // delivered clips for the selected market (badge)
const drawerOpen = ref(false);
const note = ref('');
const submitting = ref(false);
const toast = ref('');

function flash(msg) { toast.value = msg; setTimeout(() => { if (toast.value === msg) toast.value = ''; }, 3000); }

const marketOptions = computed(() => [
  { value: '', label: markets.value.length ? 'Select market…' : 'No active markets' },
  ...markets.value.map((m) => ({ value: String(m.id), label: `${m.code} · ${m.name}` })),
]);

async function loadMarkets() {
  const data = await api.get('/api/markets');
  markets.value = (data || []).filter((m) => m.active);
  // Reconcile the stored market against the live list.
  if (store.market) {
    const live = markets.value.find((m) => m.id === store.market.id);
    if (!live) setMarket(markets.value[0] || null);
    else store.market = live;
  } else if (markets.value.length) {
    // Default to the user's home market if available, else the first.
    const home = markets.value.find((m) => m.code === page.props.auth?.user?.market);
    setMarket(home || markets.value[0], { clearBasket: false });
  }
}

async function loadDesigns() {
  try {
    const projects = await api.get('/api/projects');
    const activeP = (projects || []).find((p) => p.is_active);
    designs.value = activeP?.designs || [];
  } catch { designs.value = []; }
}

onMounted(async () => {
  try { await Promise.all([loadMarkets(), loadDesigns()]); } catch (e) { flash(e.message || 'Failed to load.'); }
});

// Delivered-clips count for the selected market — drives the badge next to the
// selector (shown only when the market has any).
async function loadDeliveredCount() {
  deliveredCount.value = 0;
  if (!store.market) return;
  try {
    const clips = await api.get('/api/delivered-clips?market_id=' + store.market.id);
    deliveredCount.value = Array.isArray(clips) ? clips.length : 0;
  } catch { deliveredCount.value = 0; }
}
watch(() => store.market?.id, loadDeliveredCount, { immediate: true });

function onMarketChange(id) {
  const m = markets.value.find((x) => String(x.id) === String(id)) || null;
  if (store.market && m && m.id === store.market.id) return;
  if (store.basket.length && !confirm('Changing market clears your current order. Continue?')) return;
  setMarket(m);
}

const designFmts = (key) => {
  const d = designs.value.find((x) => (typeof x === 'object' ? x.key : x) === key);
  return (typeof d === 'object' && d?.fmts?.length) ? d.fmts.length : 4;
};
const itemRows = (it) => {
  const langs = it.langs?.length || 1;
  const designsArr = it.designs || [];
  if (!designsArr.length) return langs;
  return designsArr.reduce((s, k) => s + designFmts(k) * langs, 0);
};
const totalRows = computed(() => store.basket.reduce((s, it) => s + itemRows(it), 0));

async function submit() {
  if (!store.market) { flash('Select a market first.'); return; }
  if (!store.basket.length) { flash('Your order is empty.'); return; }
  if (!confirm(`Submit ${store.basket.length} item(s) to production for ${store.market.code}? (~${totalRows.value} renders)`)) return;
  submitting.value = true;
  try {
    const items = store.basket.map((b) => ({
      clipId: b.clipId,
      clipName: b.clip?.nameNoExt || b.clip?.name || b.clipId,
      slate: b.clip?.slate || '',
      category: b.clip?.category || '',
      actor: b.clip?.actor || '',
      copyKey: b.copyKey,
      copyText: b.copyText,
      langs: b.langs,
      designs: b.designs || [],
    }));
    await api.post('/api/orders', { user_name: page.props.auth?.user?.name, market_id: store.market.id, note: note.value.trim(), items });
    clearBasket();
    note.value = '';
    drawerOpen.value = false;
    router.visit('/portal/orders?submitted=1');
  } catch (e) {
    if (e.data?.error_code === 'market_inactive') {
      drawerOpen.value = false;
      await loadMarkets();
      flash('That market was just disabled — order cleared. Pick another market.');
      clearBasket();
    } else {
      flash(e.message || 'Submit failed.');
    }
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <AppLayout :active="active" workspace="portal" :theme="theme" :density="density">
    <!-- Delivered clips lives in the left nav, set apart below the other items. -->
    <template v-if="store.market && deliveredCount" #nav-extra>
      <NavItem :item="{ label: `Delivered clips (${deliveredCount})`, icon: 'inbox', href: '/portal/delivered' }" :active="active === 'delivered'" />
    </template>

    <!-- market selector bar -->
    <div :style="{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px var(--pad-screen)', borderBottom: '1px solid var(--border)', flexWrap: 'wrap' }">
      <span :style="{ fontSize: '11.5px', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-3)', fontWeight: 700 }">Market</span>
      <div :style="{ width: '230px' }"><Select :model-value="store.market ? String(store.market.id) : ''" :options="marketOptions" @update:model-value="onMarketChange" /></div>
      <Tag v-if="store.market" :clickable="false">{{ store.market.brand }}</Tag>
    </div>

    <slot :market="store.market" />

    <!-- basket bar -->
    <div v-if="store.basket.length && !drawerOpen" :style="{ position: 'fixed', bottom: '22px', left: '50%', transform: 'translateX(calc(-50% + 126px))', zIndex: 50 }">
      <button @click="drawerOpen = true" :style="{ display: 'inline-flex', alignItems: 'center', gap: '10px', padding: '12px 20px', borderRadius: '999px', background: 'var(--btn-primary-bg)', color: 'var(--btn-primary-ink)', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: '14px', fontWeight: 700, boxShadow: 'var(--shadow-pop)' }">
        <Icon name="clipboard" :size="17" /> Your order · {{ store.basket.length }} <span :style="{ opacity: 0.7 }">(~{{ totalRows }} renders)</span> <Icon name="arrowright" :size="16" />
      </button>
    </div>

    <!-- basket drawer -->
    <Drawer :open="drawerOpen" title="Your order" :width="460" @close="drawerOpen = false">
      <div v-if="!store.basket.length" :style="{ color: 'var(--text-3)', fontSize: '14px', padding: '20px 0', textAlign: 'center' }">No items yet — browse clips to add to your order.</div>
      <div v-else>
        <div v-for="(b, i) in store.basket" :key="i" :style="{ display: 'flex', gap: '12px', padding: '12px 0', borderTop: i ? '1px solid var(--divider)' : 'none' }">
          <div :style="{ width: '54px', flexShrink: 0 }"><Thumb :clip="{ poster: '/api/thumb?path=' + encodeURIComponent(b.clip?.relativePath || ''), aspect: undefined, duration: null }" :show-play="false" /></div>
          <div :style="{ flex: 1, minWidth: 0 }">
            <div :style="{ fontSize: '13.5px', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }">{{ b.clip?.nameNoExt || b.clipId }}</div>
            <div :style="{ fontSize: '12px', color: 'var(--text-3)', margin: '3px 0' }">{{ b.copyText?.en || b.copyKey }}</div>
            <div :style="{ display: 'flex', gap: '5px', flexWrap: 'wrap' }">
              <Tag v-for="l in b.langs" :key="l" :clickable="false">{{ String(l).toUpperCase() }}</Tag>
              <Tag v-for="d in (b.designs || [])" :key="d" :clickable="false">{{ d }}</Tag>
            </div>
          </div>
          <button @click="removeFromBasket(i)" :style="{ background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer', alignSelf: 'flex-start' }"><Icon name="x" :size="16" /></button>
        </div>
      </div>
      <template #footer>
        <div :style="{ width: '100%' }">
          <div :style="{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px', color: 'var(--text-3)', marginBottom: '10px' }">
            <span>Market: <strong :style="{ color: 'var(--accent)' }">{{ store.market?.code || '—' }}</strong></span>
            <span>~{{ totalRows }} renders</span>
          </div>
          <textarea v-model="note" rows="2" placeholder="Note for the production team (optional)…"
            :style="{ width: '100%', padding: '10px', borderRadius: '10px', background: 'var(--surface-1)', border: '1px solid var(--border)', color: 'var(--text-1)', fontSize: '13.5px', fontFamily: 'inherit', resize: 'vertical', outline: 'none', marginBottom: '10px' }" />
          <Button full icon="send" :disabled="submitting || !store.basket.length" @click="submit">{{ submitting ? 'Submitting…' : 'Submit order' }}</Button>
        </div>
      </template>
    </Drawer>

    <div v-if="toast" :style="{ position: 'fixed', bottom: '28px', left: '50%', transform: 'translateX(-50%)', zIndex: 80, display: 'flex', alignItems: 'center', gap: '10px', padding: '13px 20px', borderRadius: '14px', background: 'var(--surface-1)', border: '1px solid var(--border-strong)', boxShadow: 'var(--shadow-pop)', fontSize: '14px', fontWeight: 600 }">
      <Icon name="check_circle" :size="18" :style="{ color: 'var(--accent)' }" /> {{ toast }}
    </div>
  </AppLayout>
</template>
