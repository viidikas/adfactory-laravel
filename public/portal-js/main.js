// ═══════════════════════════════════════════════════════════════
//  STATE — globals shared across all portal modules
// ═══════════════════════════════════════════════════════════════
const LANGS = ['EN','ET','DE','FR','ES'];

let currentUser  = JSON.parse(localStorage.getItem('gp_user') || 'null');
let clipLibrary  = [];
let copyRows     = [];   // parsed from sheet: [{key, category, en, et, fr, de, es, brand, shot}]
let basket       = JSON.parse(localStorage.getItem('gp_basket') || '[]');
// basket item: { id, clip{name,slate,category,actor,url}, copyKey, copyText{en,et,...}, langs:[] }

const esc = s => String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');

function toast(msg, err=false) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.style.borderColor = err ? 'var(--orange)' : 'var(--accent)';
  t.style.color = err ? 'var(--orange)' : 'var(--accent)';
  t.style.opacity = 1; t.style.transform = 'translateY(0)';
  setTimeout(() => { t.style.opacity=0; t.style.transform='translateY(8px)'; }, 3000);
}

// ═══════════════════════════════════════════════════════════════
//  AUTH
// ═══════════════════════════════════════════════════════════════
async function loadUsers() {
  try {
    const r = await fetch('/api/users');
    const users = await r.json();
    renderUserList(users);
  } catch(e) {
    document.getElementById('user-list').innerHTML = '<div style="color:var(--orange);font-size:10px;">Could not load users — is proxy.py running?</div>';
  }
}

function renderUserList(users) {
  const colors = {'admin':'var(--accent)','growth_lead':'var(--blue)'};
  const initials = name => name.split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2);
  document.getElementById('user-list').innerHTML = users.map(u => `
    <div class="user-btn" onclick="login(${JSON.stringify(u).replace(/"/g,'&quot;')})">
      <div class="user-avatar" style="background:${colors[u.role]||'var(--muted)'};color:#000;">
        ${esc(initials(u.name))}
      </div>
      <div>
        <div class="user-name">${esc(u.name)}${u.market?' · '+esc(u.market):''}</div>
        <div class="user-role">${u.role === 'admin' ? '⚙ Admin' : '🌍 Growth Lead'}</div>
      </div>
    </div>`).join('');
}

async function login(user) {
  currentUser = user;
  localStorage.setItem('gp_user', JSON.stringify(user));
  document.getElementById('login-screen').style.display = 'none';
  document.getElementById('app').style.display = 'flex';
  document.getElementById('topbar-user-name').textContent = user.name + (user.market ? ' · '+user.market : '');
  if (user.role === 'admin') {
    document.getElementById('tab-admin').classList.remove('hidden');
  }
  updateBasketBar();
  loadOrders();
  loadDesigns();
  // Load copies BEFORE clips so renderGrid sees copy assignments
  await loadSheetFromConfig();
  loadClipsFromServer();
}

function logout() {
  currentUser = null;
  localStorage.removeItem('gp_user');
  document.getElementById('login-screen').style.display = 'flex';
  document.getElementById('app').style.display = 'none';
}

// ═══════════════════════════════════════════════════════════════
//  TABS
// ═══════════════════════════════════════════════════════════════
function showTab(tab) {
  ['browse','orders','designs','admin'].forEach(t => {
    document.getElementById('view-'+t)?.classList.toggle('hidden', t !== tab);
    document.getElementById('tab-'+t)?.classList.toggle('active', t === tab);
  });
  if (tab === 'orders')  loadOrders();
  if (tab === 'admin')   loadAdminOrders();
  if (tab === 'designs') renderDesignsPage();
}

// ═══════════════════════════════════════════════════════════════
//  INIT — deferred until all portal scripts have loaded so that
//  functions like loadClipsFromServer, loadOrders, loadDesigns and
//  loadSheetFromConfig (defined in clips.js, orders.js, designs.js
//  and copy.js respectively) are guaranteed to exist before login()
//  calls them.  Without this deferral, a returning user whose
//  session is persisted in localStorage triggers login() while
//  those scripts are still being parsed, causing ReferenceErrors
//  and leaving the clip grid empty.
// ═══════════════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', function portalInit() {
  loadUsers();
  if (currentUser) {
    login(currentUser);
  } else {
    document.getElementById('login-screen').style.display = 'flex';
  }
});
