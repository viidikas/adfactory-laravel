// Shared Growth Portal state across the portal's Inertia routes: the selected
// market and the order basket, persisted to localStorage (gp_market / gp_basket)
// exactly as the legacy portal did, so a refresh or navigation keeps both.
import { reactive, watch } from 'vue';

function read(key, fallback) {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; }
  catch { return fallback; }
}

const store = reactive({
  market: read('gp_market', null),   // { id, code, name, brand, active }
  basket: read('gp_basket', []),     // [{ clipId, clip, copyKey, copyText, langs, designs, requiresDisclaimer }]
});

watch(() => store.market, (v) => { try { localStorage.setItem('gp_market', JSON.stringify(v)); } catch {} }, { deep: true });
watch(() => store.basket, (v) => { try { localStorage.setItem('gp_basket', JSON.stringify(v)); } catch {} }, { deep: true });

const sameItem = (a, b) =>
  a.clipId === b.clipId &&
  a.copyKey === b.copyKey &&
  JSON.stringify([...(a.langs || [])].sort()) === JSON.stringify([...(b.langs || [])].sort()) &&
  JSON.stringify([...(a.designs || [])].sort()) === JSON.stringify([...(b.designs || [])].sort());

export function usePortalStore() {
  return store;
}

export function setMarket(m, { clearBasket = true } = {}) {
  store.market = m;
  if (clearBasket) store.basket = [];
}

export function addToBasket(item) {
  if (store.basket.some((b) => sameItem(b, item))) return false; // duplicate
  store.basket.push(item);
  return true;
}

export function removeFromBasket(index) {
  store.basket.splice(index, 1);
}

export function clearBasket() {
  store.basket = [];
}
