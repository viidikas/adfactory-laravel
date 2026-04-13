<template>
  <div>
    <!-- APP SHELL -->
    <div class="app" id="app" style="display:flex;">
      <div class="topbar">
        <div>
          <div class="topbar-logo">AD.FACTORY <span>GROWTH PORTAL</span></div>
        </div>
        <div style="display:flex;align-items:center;gap:12px;">
          <span id="topbar-user-name" style="font-size:11px;color:var(--muted);">&mdash;</span>
          <button class="logout-btn" @click="logout()">Sign out</button>
        </div>
      </div>

      <div class="tab-bar">
        <div class="tab active" id="tab-copy-browse" @click="showTab('copy-browse')">Browse by Copy</div>
        <div class="tab" id="tab-browse" @click="showTab('browse')">Browse by Clips</div>
        <div class="tab" id="tab-orders" @click="showTab('orders')">My Orders</div>
        <div class="tab hidden" id="tab-admin" @click="showTab('admin')">Admin</div>
      </div>

      <div class="content">
        <!-- MODE A: BROWSE BY COPY -->
        <div id="view-copy-browse">
          <div id="copy-browse-status" style="font-size:11px;color:var(--muted);padding:20px 0;"></div>
          <!-- Step 1: Copy cards -->
          <div id="copy-step-1">
            <div id="copy-cat-chips" class="browse-filters" style="margin-bottom:16px;"></div>
            <div id="copy-grid" class="copy-grid"></div>
            <div id="copy-empty" class="empty hidden">
              <div class="empty-icon">&#9997;</div>
              <div class="empty-title">No copy lines found</div>
              <div class="empty-sub">Admin needs to configure sheets in AD.FACTORY</div>
            </div>
          </div>
          <!-- Step 2: Clip selector for chosen copy -->
          <div id="copy-step-2" class="hidden">
            <div id="copy-breadcrumb" style="margin-bottom:16px;"></div>
            <div id="copy-clip-grid" class="clip-grid"></div>
            <div id="copy-clip-empty" class="empty hidden">
              <div class="empty-icon">&#127908;</div>
              <div class="empty-title">No clips in this category</div>
            </div>
          </div>
          <!-- Step 3: Language + Design selection -->
          <div id="copy-step-3" class="hidden">
            <div id="copy-step3-breadcrumb" style="margin-bottom:16px;"></div>
            <div id="copy-step3-summary" class="card" style="margin-bottom:16px;"></div>
            <div class="card">
              <div class="card-title">Languages</div>
              <div id="copy-lang-chips" style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px;"></div>
            </div>
            <div class="card">
              <div class="card-title">Designs</div>
              <div id="copy-design-chips" style="display:flex;gap:10px;flex-wrap:wrap;margin-top:8px;"></div>
            </div>
            <div style="margin-top:16px;">
              <button class="btn btn-primary" onclick="addCopyBrowseToBasket()">+ Add to order</button>
            </div>
          </div>
        </div>

        <!-- MODE B: BROWSE BY CLIPS -->
        <div id="view-browse" class="hidden">
          <div id="clips-status" style="font-size:11px;color:var(--muted);padding:20px 0;"></div>
          <div class="browse-filters" id="browse-filters" style="display:none;">
            <input type="text" id="search-input" placeholder="Search clips..." oninput="renderGrid()">
            <select id="filter-cat" onchange="onCatFilterChange()">
              <option value="">All categories</option>
              <option>Product Usage</option><option>Travel and Holiday</option><option>Home Renovation</option>
              <option>Lifestyle and Events</option><option>Electronics and Devices</option><option>Financial Relief</option>
            </select>
            <select id="filter-actor" onchange="renderGrid()"><option value="">All actors</option></select>
            <span id="grid-count" style="font-size:10px;color:var(--muted);margin-left:4px;"></span>
          </div>
          <div style="display:flex;gap:0;position:relative;">
            <div style="flex:1;min-width:0;">
              <div class="clip-grid" id="clip-grid"></div>
              <div id="browse-empty" class="empty hidden">
                <div class="empty-icon">&#128269;</div>
                <div class="empty-title">No clips found</div>
                <div class="empty-sub">Try a different search or category filter</div>
              </div>
            </div>
            <!-- Slide-in detail panel -->
            <div id="clip-detail-panel" class="clip-detail-panel hidden"></div>
          </div>
        </div>

        <!-- MY ORDERS TAB -->
        <div id="view-orders" class="hidden">
          <div id="orders-list"></div>
          <div id="orders-empty" class="empty hidden">
            <div class="empty-icon">&#128203;</div>
            <div class="empty-title">No orders yet</div>
            <div class="empty-sub">Browse clips and add them to an order to get started</div>
          </div>
        </div>

        <!-- ADMIN TAB -->
        <div id="view-admin" class="hidden">
          <div class="card">
            <div class="card-title">All Orders</div>
            <div class="card-sub">Review incoming orders from growth leads.</div>
          </div>
          <div id="admin-orders-list"></div>
          <div id="admin-empty" class="empty hidden">
            <div class="empty-icon">&#128237;</div>
            <div class="empty-title">No orders yet</div>
            <div class="empty-sub">Orders from growth leads will appear here</div>
          </div>
          <div class="card" style="margin-top:32px;border-color:var(--border2);">
            <div class="card-title">Growth Leads</div>
            <div class="card-sub">Manage who has access to the Growth Portal.</div>
            <div id="admin-users-list" style="margin-bottom:16px;"></div>
            <div style="font-size:10px;color:var(--muted2);margin-bottom:8px;font-weight:500;">Add new growth lead:</div>
            <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
              <input type="text" id="new-user-name" class="form-input" placeholder="Name" style="flex:1;min-width:120px;">
              <input type="email" id="new-user-email" class="form-input" placeholder="Email" style="flex:1;min-width:180px;">
              <button class="btn btn-primary" onclick="addUser()">+ Add</button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Order clip preview modal -->
    <div class="modal-overlay hidden" id="order-clip-modal">
      <div class="clip-modal">
        <div class="clip-modal-video">
          <video id="ocm-video" controls style="width:100%;border-radius:8px;background:#000;"></video>
          <div class="cm-nav">
            <button class="btn btn-ghost" id="ocm-prev" onclick="orderClipNav(-1)">&#8249; Prev</button>
            <span id="ocm-nav-label" style="font-size:10px;color:var(--muted2);"></span>
            <button class="btn btn-ghost" id="ocm-next" onclick="orderClipNav(1)">Next &#8250;</button>
          </div>
        </div>
        <div class="clip-modal-panel">
          <div class="clip-modal-panel-scroll" id="ocm-panel"></div>
          <div class="cm-actions">
            <div id="ocm-downloads"></div>
            <button class="btn btn-ghost" style="width:100%;margin-top:8px;" onclick="closeOrderClipModal()">Close</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Basket bar -->
    <div class="basket-bar" id="basket-bar">
      <div class="basket-count">
        <b id="basket-count-num">0</b> items in order
        <span style="font-size:9px;color:var(--muted);margin-left:8px;" id="basket-langs-summary"></span>
      </div>
      <div style="display:flex;gap:8px;">
        <button class="clear-basket-btn" onclick="clearBasket()">Clear</button>
        <button class="submit-order-btn" onclick="openSubmitModal()">Review &amp; Submit &rarr;</button>
      </div>
    </div>

    <!-- Submit modal -->
    <div class="modal-overlay hidden" id="submit-modal">
      <div class="modal-box" style="max-width:600px;">
        <div class="modal-title">Review &amp; Submit Order</div>
        <div class="modal-sub">Your order will be sent to production.</div>
        <div id="order-summary-items" style="background:var(--s2);border-radius:6px;padding:12px;margin-top:10px;font-size:10px;max-height:300px;overflow-y:auto;"></div>
        <div class="form-group" style="margin-top:16px;">
          <label class="form-label">Market / Audience</label>
          <input type="text" id="order-market" class="form-input" placeholder="e.g. FI, EE, DK...">
        </div>
        <div class="form-group">
          <label class="form-label">Note (optional)</label>
          <textarea id="order-note" class="form-input" placeholder="Any specific requirements..."></textarea>
        </div>
        <div class="modal-actions">
          <button class="btn btn-ghost" onclick="closeSubmitModal()">Cancel</button>
          <button class="btn btn-primary" onclick="submitOrder()">Submit Order</button>
        </div>
      </div>
    </div>

    <div id="toast"></div>
  </div>
</template>

<script>
import { router } from '@inertiajs/vue3';

export default {
  name: 'GrowthPortal',
  mounted() {
    const authUser = this.$page.props.auth?.user;
    if (authUser) {
      window.__portalUser = authUser;
    }

    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = '/portal-css/growth-portal.css';
    document.head.appendChild(link);

    const scripts = [
      '/portal-js/main.js',
      '/portal-js/designs.js',
      '/portal-js/copy.js',
      '/portal-js/copy-browse.js',
      '/portal-js/clips.js',
      '/portal-js/orders.js',
      '/portal-js/admin.js',
    ];

    this.loadScriptsSequential(scripts, 0);
  },
  methods: {
    showTab(tab) {
      if (typeof window.showTab === 'function') window.showTab(tab);
    },
    logout() {
      router.post('/logout');
    },
    loadScriptsSequential(scripts, index) {
      if (index >= scripts.length) {
        if (typeof window.portalInit === 'function') window.portalInit();
        return;
      }
      const script = document.createElement('script');
      script.src = scripts[index];
      script.onload = () => this.loadScriptsSequential(scripts, index + 1);
      document.body.appendChild(script);
    },
  },
};
</script>

<style>
.logout-btn {
  background: none;
  border: 1px solid var(--border, #2d333b);
  border-radius: 6px;
  color: var(--muted, #7a8399);
  font-family: 'DM Mono', monospace;
  font-size: 10px;
  padding: 6px 12px;
  cursor: pointer;
  transition: all 0.15s ease;
}
.logout-btn:hover {
  border-color: #e8ff47;
  color: #e8ff47;
}
</style>
