<script setup>
import { ref, onMounted } from 'vue';
import AppLayout from '../../Layouts/AppLayout.vue';
import Card from '../../Components/Card.vue';
import Button from '../../Components/Button.vue';
import Input from '../../Components/Input.vue';
import Field from '../../Components/Field.vue';
import Icon from '../../Components/Icon.vue';
import { api } from '../../lib/api.js';

defineProps({
  theme: { type: String, default: null },
  density: { type: String, default: null },
});

const projects = ref([]);
const loading = ref(true);
const error = ref('');
const toast = ref('');
const np = ref({ name: '', path: '' });
const creating = ref(false);
const busyId = ref(null);

function flash(msg) {
  toast.value = msg;
  setTimeout(() => { if (toast.value === msg) toast.value = ''; }, 3000);
}

async function load() {
  const data = await api.get('/api/projects');
  projects.value = Array.isArray(data) ? data : [];
}

onMounted(async () => {
  try { await load(); } catch (e) { error.value = e.message || 'Failed to load projects.'; }
  finally { loading.value = false; }
});

async function create() {
  if (!np.value.name.trim() || !np.value.path.trim()) { flash('Name and folder are required.'); return; }
  creating.value = true;
  try {
    await api.post('/api/projects', { name: np.value.name.trim(), path: np.value.path.trim() });
    np.value = { name: '', path: '' };
    await load();
    flash('Project created.');
  } catch (e) { flash(e.message || 'Could not create project.'); }
  finally { creating.value = false; }
}

async function scan(p) {
  busyId.value = p.id;
  try {
    const res = await api.post('/api/projects/' + p.id + '/scan');
    await load();
    flash(`Scanned ${res?.count ?? 0} clips in ${p.name}.`);
  } catch (e) { flash(e.message || 'Scan failed.'); }
  finally { busyId.value = null; }
}

async function activate(p) {
  busyId.value = p.id;
  try { await api.put('/api/projects/' + p.id + '/activate'); await load(); flash(`${p.name} is now active.`); }
  catch (e) { flash(e.message || 'Could not activate.'); }
  finally { busyId.value = null; }
}

async function remove(p) {
  if (!confirm(`Delete project "${p.name}" and all its scanned clips? This cannot be undone.`)) return;
  busyId.value = p.id;
  try { await api.del('/api/projects/' + p.id); await load(); flash('Project deleted.'); }
  catch (e) { flash(e.message || 'Could not delete.'); }
  finally { busyId.value = null; }
}

const scannedAgo = (iso) => (iso ? new Date(iso).toLocaleString() : 'never scanned');
</script>

<template>
  <AppLayout active="projects" workspace="admin" :theme="theme" :density="density">
    <div :style="{ padding: 'var(--pad-screen)', display: 'flex', flexDirection: 'column', gap: 'var(--gap)' }">
      <div>
        <h1 :style="{ fontSize: '27px', fontWeight: 800, letterSpacing: '-0.02em', margin: 0 }">Projects</h1>
        <p :style="{ color: 'var(--text-2)', margin: '6px 0 0', fontSize: '14.5px' }">Footage folders. Scan to index clips; activate the one the library and orders draw from.</p>
      </div>

      <div v-if="error" :style="{ padding: '14px 18px', borderRadius: '12px', background: 'var(--danger-soft)', color: 'var(--danger)', fontSize: '14px' }">{{ error }}</div>
      <div v-else-if="loading" :style="{ color: 'var(--text-3)', fontSize: '14px' }">Loading…</div>

      <div v-else-if="!projects.length" :style="{ color: 'var(--text-3)', fontSize: '14px' }">No projects yet — create one below.</div>

      <div v-else :style="{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 'var(--gap)' }">
        <Card v-for="p in projects" :key="p.id">
          <div :style="{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px' }">
            <div :style="{ minWidth: 0 }">
              <div :style="{ display: 'flex', alignItems: 'center', gap: '8px' }">
                <div :style="{ fontSize: '16px', fontWeight: 700 }">{{ p.name }}</div>
                <span v-if="p.is_active" :style="{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '11.5px', fontWeight: 700, color: 'var(--accent)', background: 'var(--accent-soft)', padding: '2px 8px', borderRadius: '999px' }">
                  <span :style="{ width: '6px', height: '6px', borderRadius: '999px', background: 'currentColor' }" />Active
                </span>
              </div>
              <div class="mono" :style="{ fontSize: '12px', color: 'var(--text-3)', marginTop: '5px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }">{{ p.path }}</div>
            </div>
            <Icon name="folder" :size="22" :style="{ color: 'var(--text-3)', flexShrink: 0 }" />
          </div>

          <div :style="{ display: 'flex', gap: '18px', margin: '16px 0', fontSize: '13px' }">
            <div>
              <div class="hero-num" :style="{ fontSize: '24px' }">{{ p.clips_count ?? 0 }}</div>
              <div :style="{ color: 'var(--text-3)', fontSize: '12px', marginTop: '2px' }">clips</div>
            </div>
            <div :style="{ alignSelf: 'flex-end', color: 'var(--text-3)', fontSize: '12px' }">{{ scannedAgo(p.scanned_at) }}</div>
          </div>

          <div :style="{ display: 'flex', gap: '8px', flexWrap: 'wrap' }">
            <Button size="sm" variant="secondary" icon="foldersearch" :disabled="busyId === p.id" @click="scan(p)">{{ busyId === p.id ? 'Working…' : 'Scan' }}</Button>
            <Button v-if="!p.is_active" size="sm" :disabled="busyId === p.id" @click="activate(p)">Activate</Button>
            <Button size="sm" variant="danger" icon="trash" :disabled="busyId === p.id" @click="remove(p)">Delete</Button>
          </div>
        </Card>
      </div>

      <Card>
        <div :style="{ fontSize: '16px', fontWeight: 700, marginBottom: '4px' }">Create project</div>
        <p :style="{ color: 'var(--text-2)', fontSize: '13.5px', margin: '0 0 14px' }">Folder is relative to the footage root. Use <span class="mono">.</span> for the root itself.</p>
        <div :style="{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '12px', alignItems: 'end' }">
          <Field label="Name"><Input v-model="np.name" placeholder="Q3 Shoot" /></Field>
          <Field label="Folder"><Input v-model="np.path" placeholder="q3-shoot" /></Field>
          <Button icon="plus" :disabled="creating" @click="create">Create</Button>
        </div>
      </Card>
    </div>

    <div v-if="toast" :style="{ position: 'fixed', bottom: '28px', left: '50%', transform: 'translateX(-50%)', zIndex: 80, display: 'flex', alignItems: 'center', gap: '10px', padding: '13px 20px', borderRadius: '14px', background: 'var(--surface-1)', border: '1px solid var(--border-strong)', boxShadow: 'var(--shadow-pop)', fontSize: '14px', fontWeight: 600 }">
      <Icon name="check_circle" :size="18" :style="{ color: 'var(--accent)' }" /> {{ toast }}
    </div>
  </AppLayout>
</template>
