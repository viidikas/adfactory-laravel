<script setup>
import { ref, reactive, computed, onMounted } from 'vue';
import AppLayout from '../../Layouts/AppLayout.vue';
import Card from '../../Components/Card.vue';
import Button from '../../Components/Button.vue';
import Input from '../../Components/Input.vue';
import Field from '../../Components/Field.vue';
import Select from '../../Components/Select.vue';
import Segmented from '../../Components/Segmented.vue';
import Tag from '../../Components/Tag.vue';
import SectionLabel from '../../Components/SectionLabel.vue';
import Icon from '../../Components/Icon.vue';
import { api, upload } from '../../lib/api.js';
import { DEFAULT_DESIGNS, DEFAULT_FORMATS, ALL_LANGS, ALL_BRANDS } from '../../lib/templater.js';

defineProps({ theme: { type: String, default: null }, density: { type: String, default: null } });

const tab = ref('users');
const tabs = [
  { value: 'users', label: 'Users' },
  { value: 'output', label: 'Output' },
  { value: 'designs', label: 'Project designs' },
];
const toast = ref('');
function flash(msg) { toast.value = msg; setTimeout(() => { if (toast.value === msg) toast.value = ''; }, 3000); }

// ── Users ───────────────────────────────────────────────────────
const users = ref([]);
const nu = reactive({ name: '', email: '', role: 'growth_lead', market: '' });
const roleOptions = [{ value: 'growth_lead', label: 'Growth lead' }, { value: 'admin', label: 'Admin' }, { value: 'legal', label: 'Legal (clip review)' }];

async function loadUsers() { users.value = await api.get('/api/users'); }
async function addUser() {
  if (!nu.name.trim() || !nu.email.trim()) { flash('Name and email required.'); return; }
  try {
    await api.post('/api/users', { name: nu.name.trim(), email: nu.email.trim(), role: nu.role, market: nu.market.trim() || null });
    Object.assign(nu, { name: '', email: '', role: 'growth_lead', market: '' });
    await loadUsers();
    flash('User added.');
  } catch (e) { flash(e.message || 'Could not add user.'); }
}
async function deleteUser(u) {
  if (!confirm(`Delete ${u.name} (${u.email})?`)) return;
  try { await api.del('/api/users/' + u.id); await loadUsers(); flash('User deleted.'); }
  catch (e) { flash(e.message || 'Could not delete.'); }
}

// ── Output config ───────────────────────────────────────────────
const cfg = reactive({
  base_output_path: '', rendered_path: '',
  filename_parts: ['brand', 'slate', 'actor', 'design', 'format', 'lang'],
  folder_parts: ['brand', 'category', 'copyslug', 'actor', 'format'],
  templater_designs: [], templater_formats: [], templater_comp_names: {},
});
const FN_PART_LABELS = { brand: 'Brand', slate: 'Slate', actor: 'Actor', design: 'Design', format: 'Format', lang: 'Lang', category: 'Category', copyslug: 'Copy line' };
const FOLDER_PART_LABELS = { lang: 'Language', brand: 'Brand', category: 'Category', copyslug: 'Copy line', actor: 'Actor', format: 'Format', slate: 'Slate', design: 'Design' };
const savingOutput = ref(false);
const compBrand = ref('Creditstar');
const compLang = ref('EN');

async function loadConfig() {
  const c = await api.get('/api/config');
  cfg.base_output_path = c.base_output_path || '';
  cfg.rendered_path = c.rendered_path || '';
  cfg.filename_parts = c.filename_parts?.length ? c.filename_parts : cfg.filename_parts;
  cfg.folder_parts = c.folder_parts?.length ? c.folder_parts : cfg.folder_parts;
  cfg.templater_designs = c.templater_designs?.length ? c.templater_designs : JSON.parse(JSON.stringify(DEFAULT_DESIGNS));
  cfg.templater_formats = c.templater_formats?.length ? c.templater_formats : JSON.parse(JSON.stringify(DEFAULT_FORMATS));
  cfg.templater_comp_names = c.templater_comp_names && typeof c.templater_comp_names === 'object' ? c.templater_comp_names : {};
}

const availFn = computed(() => Object.keys(FN_PART_LABELS).filter((k) => !cfg.filename_parts.includes(k)));
const availFolder = computed(() => Object.keys(FOLDER_PART_LABELS).filter((k) => !cfg.folder_parts.includes(k)));

// Native drag reorder for a parts array.
const drag = reactive({ list: null, idx: null });
function dragStart(list, i) { drag.list = list; drag.idx = i; }
function dropOn(arr, listName, target) {
  if (drag.list !== listName || drag.idx === null || drag.idx === target) return;
  const [m] = arr.splice(drag.idx, 1);
  arr.splice(target, 0, m);
  drag.idx = null;
}
const fmtKeys = computed(() => cfg.templater_formats.map((f) => f.key));

function addDesign() { cfg.templater_designs.push({ key: 'design' + (cfg.templater_designs.length + 1), fmts: [...fmtKeys.value] }); }
function toggleDesignFmt(d, fk) { const i = d.fmts.indexOf(fk); if (i === -1) d.fmts.push(fk); else d.fmts.splice(i, 1); }
function addFormat() { cfg.templater_formats.push({ key: 'fmt' + (cfg.templater_formats.length + 1), label: '' }); }

const PREFIX = { Creditstar: 'CS', Monefit: 'MF' };
const FMT_LABEL = { '16x9': '16x9', '1x1': '1x1', '9x16': '9x16', '4x5v1': '4x5', '4x5v2': '4x5' };
const compRows = computed(() => {
  const rows = [];
  cfg.templater_designs.forEach((d) => d.fmts.forEach((fmt) => rows.push({ key: `${d.key}_${fmt}`, design: d.key, fmt })));
  return rows;
});
function compDefault(r) {
  return `TEMPLATE_${PREFIX[compBrand.value] || 'CS'}_${FMT_LABEL[r.fmt] || r.fmt} ${r.design.replace('design', 'd')} ${compLang.value}`;
}
function compValue(r) {
  return cfg.templater_comp_names?.[compBrand.value]?.[compLang.value]?.[r.key] || '';
}
function setComp(r, val) {
  if (!cfg.templater_comp_names[compBrand.value]) cfg.templater_comp_names[compBrand.value] = {};
  if (!cfg.templater_comp_names[compBrand.value][compLang.value]) cfg.templater_comp_names[compBrand.value][compLang.value] = {};
  cfg.templater_comp_names[compBrand.value][compLang.value][r.key] = val;
}

async function saveOutput() {
  savingOutput.value = true;
  try {
    await api.post('/api/config', {
      base_output_path: cfg.base_output_path.trim(),
      rendered_path: cfg.rendered_path.trim(),
      filename_parts: cfg.filename_parts,
      folder_parts: cfg.folder_parts,
      templater_designs: cfg.templater_designs,
      templater_formats: cfg.templater_formats,
      templater_comp_names: cfg.templater_comp_names,
    });
    flash('Output settings saved.');
  } catch (e) { flash(e.message || 'Could not save.'); }
  finally { savingOutput.value = false; }
}

// ── Project designs ─────────────────────────────────────────────
const project = ref(null);
const designs = ref([]);
const ASPECTS = ['16x9', '1x1', '9x16', '4x5'];
const nd = reactive({ key: '', label: '', brand: 'Creditstar' });

async function loadProjectDesigns() {
  const projects = await api.get('/api/projects');
  project.value = (projects || []).find((p) => p.is_active) || null;
  designs.value = project.value?.designs ? JSON.parse(JSON.stringify(project.value.designs)) : [];
}
async function persistDesigns() {
  if (!project.value) return;
  await api.put('/api/projects/' + project.value.id + '/designs', { designs: designs.value });
}
async function uploadImage(design, aspect, ev) {
  const file = ev.target.files?.[0];
  if (!file || !project.value) return;
  try {
    const fd = new FormData();
    fd.append('image', file);
    const res = await upload('/api/projects/' + project.value.id + '/designs/upload', fd);
    if (!design.images) design.images = {};
    design.images[aspect] = res.url;
    await persistDesigns();
    flash('Image uploaded.');
  } catch (e) { flash(e.message || 'Upload failed.'); }
  finally { ev.target.value = ''; }
}
async function addDesignProj() {
  if (!project.value) { flash('Activate a project first (Projects screen).'); return; }
  if (!nd.key.trim()) { flash('Design key required.'); return; }
  designs.value.push({ key: nd.key.trim(), label: nd.label.trim() || nd.key.trim(), brand: nd.brand, images: {} });
  Object.assign(nd, { key: '', label: '', brand: 'Creditstar' });
  await persistDesigns();
  flash('Design added.');
}
async function removeDesignProj(i) {
  if (!confirm('Remove this design?')) return;
  designs.value.splice(i, 1);
  await persistDesigns();
  flash('Design removed.');
}

onMounted(async () => {
  try { await Promise.all([loadUsers(), loadConfig(), loadProjectDesigns()]); }
  catch (e) { flash(e.message || 'Failed to load settings.'); }
});
</script>

<template>
  <AppLayout active="settings" workspace="admin" :theme="theme" :density="density">
    <div :style="{ padding: 'var(--pad-screen)', display: 'flex', flexDirection: 'column', gap: 'var(--gap)' }">
      <div>
        <h1 :style="{ fontSize: '27px', fontWeight: 800, letterSpacing: '-0.02em', margin: 0 }">Settings</h1>
        <p :style="{ color: 'var(--text-2)', margin: '6px 0 0', fontSize: '14.5px' }">Users, Templater output rules, and the designs shown to growth leads.</p>
      </div>
      <Segmented v-model="tab" :options="tabs" />

      <!-- USERS -->
      <template v-if="tab === 'users'">
        <Card :pad="false">
          <div :style="{ display: 'grid', gridTemplateColumns: '1.4fr 1.6fr 0.8fr 0.6fr 60px', gap: '14px', padding: '12px var(--pad-card)', fontSize: '12px', fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.04em' }">
            <div>Name</div><div>Email</div><div>Role</div><div>Market</div><div></div>
          </div>
          <div v-for="u in users" :key="u.id" :style="{ display: 'grid', gridTemplateColumns: '1.4fr 1.6fr 0.8fr 0.6fr 60px', gap: '14px', alignItems: 'center', padding: '12px var(--pad-card)', borderTop: '1px solid var(--divider)' }">
            <div :style="{ fontSize: '14px', fontWeight: 600 }">{{ u.name }}</div>
            <div :style="{ fontSize: '13px', color: 'var(--text-2)' }">{{ u.email }}</div>
            <div><Tag :clickable="false">{{ u.role }}</Tag></div>
            <div :style="{ fontSize: '13px', color: 'var(--text-2)' }">{{ u.market || '—' }}</div>
            <div :style="{ textAlign: 'right' }"><button @click="deleteUser(u)" title="Delete" :style="{ background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer' }"><Icon name="trash" :size="16" /></button></div>
          </div>
        </Card>
        <Card>
          <div :style="{ fontSize: '16px', fontWeight: 700, marginBottom: '14px' }">Add user</div>
          <div :style="{ display: 'grid', gridTemplateColumns: '1fr 1.3fr 0.9fr 0.7fr auto', gap: '12px', alignItems: 'end' }">
            <Field label="Name"><Input v-model="nu.name" placeholder="Jane Doe" /></Field>
            <Field label="Email"><Input v-model="nu.email" placeholder="jane@creditstar.com" /></Field>
            <Field label="Role"><Select v-model="nu.role" :options="roleOptions" /></Field>
            <Field label="Market"><Input v-model="nu.market" placeholder="EE" /></Field>
            <Button icon="plus" @click="addUser">Add</Button>
          </div>
        </Card>
      </template>

      <!-- OUTPUT -->
      <template v-else-if="tab === 'output'">
        <Card>
          <div :style="{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '18px' }">
            <Field label="Base output path" hint="Templater destination root."><Input v-model="cfg.base_output_path" placeholder="/mnt/renders" /></Field>
            <Field label="Rendered files path" hint="Where finished AE renders land (for downloads)."><Input v-model="cfg.rendered_path" placeholder="/mnt/exports" /></Field>
          </div>
        </Card>

        <Card>
          <SectionLabel>Filename convention <template #right><span :style="{ fontSize: '12px', color: 'var(--text-3)' }">drag to reorder · joined with _</span></template></SectionLabel>
          <div :style="{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center', marginTop: '8px' }">
            <template v-for="(p, i) in cfg.filename_parts" :key="p">
              <span draggable="true" @dragstart="dragStart('fn', i)" @dragover.prevent @drop="dropOn(cfg.filename_parts, 'fn', i)"
                :style="{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 10px', borderRadius: '999px', background: 'var(--surface-3)', cursor: 'grab', fontSize: '13px', fontWeight: 600 }">
                <Icon name="grip" :size="13" :style="{ color: 'var(--text-3)' }" />{{ FN_PART_LABELS[p] }}
                <button @click="cfg.filename_parts.splice(i, 1)" :style="{ background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer', padding: 0 }"><Icon name="x" :size="13" /></button>
              </span>
              <span v-if="i < cfg.filename_parts.length - 1" :style="{ color: 'var(--text-3)' }">_</span>
            </template>
          </div>
          <div v-if="availFn.length" :style="{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '12px' }">
            <Tag v-for="p in availFn" :key="p" @click="cfg.filename_parts.push(p)">+ {{ FN_PART_LABELS[p] }}</Tag>
          </div>
        </Card>

        <Card>
          <SectionLabel>Folder structure <template #right><span :style="{ fontSize: '12px', color: 'var(--text-3)' }">drag to reorder · joined with /</span></template></SectionLabel>
          <div :style="{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center', marginTop: '8px' }">
            <template v-for="(p, i) in cfg.folder_parts" :key="p">
              <span draggable="true" @dragstart="dragStart('fld', i)" @dragover.prevent @drop="dropOn(cfg.folder_parts, 'fld', i)"
                :style="{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 10px', borderRadius: '999px', background: 'var(--surface-3)', cursor: 'grab', fontSize: '13px', fontWeight: 600 }">
                <Icon name="grip" :size="13" :style="{ color: 'var(--text-3)' }" />{{ FOLDER_PART_LABELS[p] }}
                <button @click="cfg.folder_parts.splice(i, 1)" :style="{ background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer', padding: 0 }"><Icon name="x" :size="13" /></button>
              </span>
              <span v-if="i < cfg.folder_parts.length - 1" :style="{ color: 'var(--text-3)' }">/</span>
            </template>
          </div>
          <div v-if="availFolder.length" :style="{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '12px' }">
            <Tag v-for="p in availFolder" :key="p" @click="cfg.folder_parts.push(p)">+ {{ FOLDER_PART_LABELS[p] }}</Tag>
          </div>
        </Card>

        <Card>
          <SectionLabel>Designs &amp; formats</SectionLabel>
          <div :style="{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '8px' }">
            <div v-for="(d, i) in cfg.templater_designs" :key="i" :style="{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }">
              <Input v-model="d.key" :style="{ width: '140px' }" />
              <div :style="{ display: 'flex', gap: '6px', flexWrap: 'wrap' }">
                <Tag v-for="fk in fmtKeys" :key="fk" :active="d.fmts.includes(fk)" @click="toggleDesignFmt(d, fk)">{{ fk }}</Tag>
              </div>
              <button @click="cfg.templater_designs.splice(i, 1)" :style="{ background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer', marginLeft: 'auto' }"><Icon name="trash" :size="15" /></button>
            </div>
          </div>
          <Button variant="soft" size="sm" icon="plus" :style="{ marginTop: '12px' }" @click="addDesign">Add design</Button>

          <SectionLabel :style="{ marginTop: '20px' }">Formats</SectionLabel>
          <div :style="{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }">
            <div v-for="(f, i) in cfg.templater_formats" :key="i" :style="{ display: 'flex', alignItems: 'center', gap: '10px' }">
              <Input v-model="f.key" :style="{ width: '120px' }" />
              <Input v-model="f.label" placeholder="label" :style="{ width: '120px' }" />
              <button @click="cfg.templater_formats.splice(i, 1)" :style="{ background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer' }"><Icon name="trash" :size="15" /></button>
            </div>
          </div>
          <Button variant="soft" size="sm" icon="plus" :style="{ marginTop: '12px' }" @click="addFormat">Add format</Button>
        </Card>

        <Card>
          <SectionLabel>AE composition names</SectionLabel>
          <p :style="{ color: 'var(--text-2)', fontSize: '13px', margin: '0 0 12px' }">Map each design + format to an exact AE comp name, per brand &amp; language. Blank uses the auto default shown.</p>
          <div :style="{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center', marginBottom: '14px' }">
            <Segmented v-model="compBrand" :options="ALL_BRANDS" size="sm" />
            <div :style="{ display: 'flex', gap: '6px' }"><Tag v-for="l in ALL_LANGS" :key="l" :active="compLang === l" @click="compLang = l">{{ l }}</Tag></div>
          </div>
          <div :style="{ display: 'flex', flexDirection: 'column', gap: '8px' }">
            <div v-for="r in compRows" :key="r.key" :style="{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: '12px', alignItems: 'center' }">
              <span class="mono" :style="{ fontSize: '12.5px', color: 'var(--text-2)' }">{{ r.key }}</span>
              <Input :model-value="compValue(r)" :placeholder="compDefault(r)" @update:model-value="setComp(r, $event)" />
            </div>
          </div>
        </Card>

        <div :style="{ display: 'flex', justifyContent: 'flex-end' }">
          <Button icon="check" :disabled="savingOutput" @click="saveOutput">{{ savingOutput ? 'Saving…' : 'Save output settings' }}</Button>
        </div>
      </template>

      <!-- PROJECT DESIGNS -->
      <template v-else>
        <Card v-if="!project">
          <div :style="{ color: 'var(--text-2)', fontSize: '14px' }">No active project. Activate one on the <a href="/projects" :style="{ color: 'var(--link)' }">Projects</a> screen first.</div>
        </Card>
        <template v-else>
          <div :style="{ fontSize: '13.5px', color: 'var(--text-2)' }">Designs for <strong :style="{ color: 'var(--text-1)' }">{{ project.name }}</strong> — these appear to growth leads in the portal.</div>
          <Card v-for="(d, i) in designs" :key="i">
            <div :style="{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px', flexWrap: 'wrap' }">
              <Input v-model="d.label" :style="{ width: '200px' }" placeholder="Label" @blur="persistDesigns" />
              <Tag :clickable="false">{{ d.key }}</Tag>
              <Tag :clickable="false">{{ d.brand }}</Tag>
              <button @click="removeDesignProj(i)" :style="{ background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer', marginLeft: 'auto' }"><Icon name="trash" :size="16" /></button>
            </div>
            <div :style="{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }">
              <div v-for="a in ASPECTS" :key="a">
                <div :style="{ fontSize: '11px', color: 'var(--text-3)', marginBottom: '5px' }">{{ a }}</div>
                <div :style="{ aspectRatio: a === '16x9' ? '16/9' : a === '1x1' ? '1' : a === '9x16' ? '9/16' : '4/5', borderRadius: '10px', overflow: 'hidden', background: 'var(--surface-3)', border: '1px solid var(--border)', display: 'grid', placeItems: 'center', position: 'relative' }">
                  <img v-if="d.images?.[a]" :src="d.images[a]" alt="" :style="{ width: '100%', height: '100%', objectFit: 'cover' }" />
                  <Icon v-else name="sparkles" :size="18" :style="{ color: 'var(--text-3)' }" />
                  <label :style="{ position: 'absolute', inset: 0, cursor: 'pointer' }" :title="d.images?.[a] ? 'Replace' : 'Upload'">
                    <input type="file" accept="image/*" @change="uploadImage(d, a, $event)" :style="{ display: 'none' }" />
                  </label>
                </div>
              </div>
            </div>
          </Card>
          <Card>
            <div :style="{ fontSize: '16px', fontWeight: 700, marginBottom: '12px' }">Add design</div>
            <div :style="{ display: 'grid', gridTemplateColumns: '160px 1fr 180px auto', gap: '12px', alignItems: 'end' }">
              <Field label="Key"><Input v-model="nd.key" placeholder="design1" /></Field>
              <Field label="Label"><Input v-model="nd.label" placeholder="Bold headline" /></Field>
              <Field label="Brand"><Select v-model="nd.brand" :options="ALL_BRANDS" /></Field>
              <Button icon="plus" @click="addDesignProj">Add</Button>
            </div>
          </Card>
        </template>
      </template>
    </div>

    <div v-if="toast" :style="{ position: 'fixed', bottom: '28px', left: '50%', transform: 'translateX(-50%)', zIndex: 80, display: 'flex', alignItems: 'center', gap: '10px', padding: '13px 20px', borderRadius: '14px', background: 'var(--surface-1)', border: '1px solid var(--border-strong)', boxShadow: 'var(--shadow-pop)', fontSize: '14px', fontWeight: 600 }">
      <Icon name="check_circle" :size="18" :style="{ color: 'var(--accent)' }" /> {{ toast }}
    </div>
  </AppLayout>
</template>
