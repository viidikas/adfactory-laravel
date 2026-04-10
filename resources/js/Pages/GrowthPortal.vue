<template>
  <div>
    <!-- LOGIN SCREEN (hidden when logged in via portal JS) -->
    <div class="login-screen" id="login-screen">
      <div class="login-box">
        <div class="login-logo">AD.FACTORY</div>
        <div class="login-sub">Growth Portal</div>
        <div class="login-label">Who are you?</div>
        <div class="user-list" id="user-list">
          <div style="font-size:10px;color:var(--muted);text-align:center;">Loading users...</div>
        </div>
      </div>
    </div>

    <!-- APP SHELL -->
    <div class="app" id="app">
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
        <div class="tab active" id="tab-browse" @click="showTab('browse')">&#127908; Browse Clips</div>
        <div class="tab" id="tab-orders" @click="showTab('orders')">&#128203; My Orders</div>
        <div class="tab" id="tab-designs" @click="showTab('designs')">&#127912; Designs</div>
        <div class="tab hidden" id="tab-admin" @click="showTab('admin')">&#9881; Admin</div>
      </div>

      <div class="content">
        <!-- BROWSE TAB -->
        <div id="view-browse">
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
          <div class="clip-grid" id="clip-grid"></div>
          <div id="browse-empty" class="empty hidden">
            <div class="empty-icon">&#128269;</div>
            <div class="empty-title">No clips found</div>
            <div class="empty-sub">Try a different search or category filter</div>
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

        <!-- DESIGNS TAB -->
        <div id="view-designs" class="hidden">
          <div id="designs-grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:20px;padding:4px 0;"></div>
          <div id="designs-empty" class="empty hidden">
            <div class="empty-icon">&#127912;</div>
            <div class="empty-title">No designs configured</div>
            <div class="empty-sub">Ask admin to add designs in AD.FACTORY settings</div>
          </div>
        </div>

        <!-- ADMIN TAB -->
        <div id="view-admin" class="hidden">
          <div class="card">
            <div class="card-title">&#128203; All Orders</div>
            <div class="card-sub">Review incoming orders from growth leads.</div>
          </div>
          <div id="admin-orders-list"></div>
          <div id="admin-empty" class="empty hidden">
            <div class="empty-icon">&#128237;</div>
            <div class="empty-title">No orders yet</div>
            <div class="empty-sub">Orders from growth leads will appear here</div>
          </div>
          <div class="card" style="margin-top:32px;border-color:var(--border2);">
            <div class="card-title">&#128101; Growth Leads</div>
            <div class="card-sub">Manage who has access to the Growth Portal.</div>
            <div id="admin-users-list" style="margin-bottom:16px;"></div>
            <div style="font-size:10px;color:var(--muted2);margin-bottom:8px;font-weight:500;">Add new growth lead:</div>
            <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
              <input type="text" id="new-user-name" class="form-input" placeholder="Name" style="flex:1;min-width:120px;">
              <input type="email" id="new-user-email" class="form-input" placeholder="Email" style="flex:1;min-width:180px;">
              <input type="text" id="new-user-market" class="form-input" placeholder="Market" style="width:100px;">
              <button class="btn btn-primary" onclick="addUser()">+ Add</button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Clip detail modal -->
    <div class="modal-overlay hidden" id="clip-modal-overlay">
      <div class="clip-modal">
        <div class="clip-modal-video">
          <div class="clip-modal-path" id="cm-path"></div>
          <video id="cm-video" controls style="width:100%;border-radius:8px;background:#000;"></video>
          <div class="cm-nav">
            <button class="btn btn-ghost" id="cm-prev" onclick="clipModalNav(-1)">&#8249; Prev</button>
            <span id="cm-nav-label" style="font-size:10px;color:var(--muted2);"></span>
            <button class="btn btn-ghost" id="cm-next" onclick="clipModalNav(1)">Next &#8250;</button>
          </div>
        </div>
        <div class="clip-modal-panel">
          <div class="clip-modal-panel-scroll">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">
              <div style="font-family:'Syne',sans-serif;font-weight:700;font-size:14px;">&#128203; Clip Info</div>
              <button onclick="closeClipModal()" style="background:none;border:none;color:var(--muted2);cursor:pointer;font-size:18px;padding:4px;">&times;</button>
            </div>
            <div class="cm-info-block" id="cm-info"></div>
            <div style="margin-top:18px;">
              <div style="font-family:'Syne',sans-serif;font-weight:700;font-size:12px;margin-bottom:6px;">&#9997;&#65039; Select Copy</div>
              <select id="cm-copy-select" onchange="onCopySelect()" style="width:100%;background:var(--s3);border:1px solid var(--border2);border-radius:6px;color:var(--text);padding:9px 12px;font-family:'DM Mono',monospace;font-size:11px;outline:none;margin-bottom:10px;">
                <option value="">&mdash; choose copy &mdash;</option>
              </select>
              <div id="cm-copy-langs" style="background:var(--s3);border-radius:6px;padding:12px;display:none;"></div>
            </div>
            <div style="margin-top:18px;">
              <div style="font-family:'Syne',sans-serif;font-weight:700;font-size:12px;margin-bottom:6px;">&#127758; Language</div>
              <div id="cm-lang-chips" style="display:flex;gap:6px;flex-wrap:wrap;"></div>
            </div>
            <div style="margin-top:18px;">
              <div style="font-family:'Syne',sans-serif;font-weight:700;font-size:12px;margin-bottom:6px;">&#127912; Design</div>
              <div id="cm-design-chips" style="display:flex;gap:8px;flex-wrap:wrap;"></div>
            </div>
            <div id="cm-duplicate-warning" style="display:none;background:rgba(251,191,36,.1);border:1px solid rgba(251,191,36,.3);border-radius:6px;padding:10px 12px;font-size:10px;color:var(--warn);margin-top:14px;">
              This exact combination is already in your order.
            </div>
          </div>
          <div id="cm-existing-variants" style="margin-top:14px;"></div>
          <div class="cm-actions">
            <div style="display:flex;gap:8px;flex-wrap:wrap;">
              <button class="btn btn-primary" style="flex:1;" onclick="addClipFromModal()">+ Add Variant</button>
              <button class="btn btn-ghost" onclick="closeClipModal()">Done</button>
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
        <b id="basket-count-num">0</b> clips in order
        <span style="font-size:9px;color:var(--muted);margin-left:8px;" id="basket-langs-summary"></span>
      </div>
      <div style="display:flex;gap:8px;">
        <button class="clear-basket-btn" onclick="clearBasket()">Clear</button>
        <button class="submit-order-btn" onclick="openSubmitModal()">Submit Order &rarr;</button>
      </div>
    </div>

    <!-- Submit modal -->
    <div class="modal-overlay hidden" id="submit-modal">
      <div class="modal-box">
        <div class="modal-title">Submit Order</div>
        <div class="modal-sub">Your order will be sent to production.</div>
        <div class="form-group">
          <label class="form-label">Market / Audience</label>
          <input type="text" id="order-market" class="form-input" placeholder="e.g. FI, EE, DK...">
        </div>
        <div class="form-group">
          <label class="form-label">Note (optional)</label>
          <textarea id="order-note" class="form-input" placeholder="Any specific requirements..."></textarea>
        </div>
        <div id="order-summary-items" style="background:var(--s2);border-radius:6px;padding:12px;margin-top:10px;font-size:10px;max-height:220px;overflow-y:auto;"></div>
        <div class="modal-actions">
          <button class="btn btn-ghost" onclick="closeSubmitModal()">Cancel</button>
          <button class="btn btn-primary" onclick="submitOrder()">&#9889; Submit</button>
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
    // Load CSS
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = '/portal-css/growth-portal.css';
    document.head.appendChild(link);

    // Load scripts in dependency order
    const scripts = [
      '/portal-js/main.js',
      '/portal-js/designs.js',
      '/portal-js/copy.js',
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
      if (index >= scripts.length) return;
      const script = document.createElement('script');
      script.src = scripts[index];
      script.onload = () => this.loadScriptsSequential(scripts, index + 1);
      document.body.appendChild(script);
    },
  },
};
</script>

<style>
/* Base styles are loaded from growth-portal.css via the dynamic link tag */
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
