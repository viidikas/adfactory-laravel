import { reactive } from 'vue';
import { api } from './api.js';

// Shared, reactive count of clips awaiting legal review. Drives the nav badge in
// AppLayout and the header count in the legal view, so a decision made in the
// review view decrements the badge live (no full reload).
export const legalState = reactive({ pendingCount: 0 });

export function setPendingCount(n) {
  legalState.pendingCount = Number.isFinite(n) ? n : 0;
}

export async function refreshPendingCount() {
  try {
    const r = await api.get('/api/legal/pending-count');
    legalState.pendingCount = r?.count ?? 0;
  } catch {
    /* leave the last known count on transient errors */
  }
}
