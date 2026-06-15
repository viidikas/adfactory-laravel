<script setup>
import { ref, reactive, computed } from 'vue';
import AppLayout from '../../Layouts/AppLayout.vue';
import Card from '../../Components/Card.vue';
import Button from '../../Components/Button.vue';
import Tag from '../../Components/Tag.vue';
import StatusPill from '../../Components/StatusPill.vue';
import Progress from '../../Components/Progress.vue';
import Icon from '../../Components/Icon.vue';

const props = defineProps({
  rows: { type: Array, default: () => [] },
  langs: { type: Array, default: () => [] },
  workspace: { type: String, default: 'admin' },
  theme: { type: String, default: null },
  density: { type: String, default: null },
  user: { type: Object, default: () => ({ name: 'Mark Viidik', email: 'mark@creditstar.com' }) },
});

// Editable working copy of the rows.
const rows = reactive(props.rows.map((r) => ({ ...r, variants: { ...r.variants } })));
const edit = ref(null); // { ri, lang }
const filter = ref('All');
const toast = ref(false);

const FILTER_LABELS = { All: 'All slots', approved: 'Approved', review: 'In review', missing: 'Missing' };
const visible = computed(() => rows.map((r, ri) => ({ r, ri })).filter(({ r }) => filter.value === 'All' || r.status === filter.value));
const total = computed(() => rows.length * props.langs.length);
const filled = computed(() => rows.reduce((n, r) => n + props.langs.filter((l) => (r.variants[l] || '').trim()).length, 0));

const thBase = { textAlign: 'left', fontWeight: 700, padding: '13px 14px', whiteSpace: 'nowrap', background: 'var(--surface-2)' };
const tdBase = { padding: '12px 14px', verticalAlign: 'top' };
const isEditing = (ri, lang) => edit.value && edit.value.ri === ri && edit.value.lang === lang;

function exportCsv() {
  toast.value = true;
  setTimeout(() => { toast.value = false; }, 2600);
}
</script>

<template>
  <AppLayout active="copy" :workspace="workspace" :theme="theme" :density="density" :user="user">
    <div :style="{ padding: 'var(--pad-screen)', display: 'flex', flexDirection: 'column', gap: 'var(--gap)' }">
      <div :style="{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }">
        <div>
          <h1 :style="{ fontSize: '27px', fontWeight: 800, letterSpacing: '-0.02em', margin: 0 }">Copy mapping</h1>
          <p :style="{ color: 'var(--text-2)', margin: '6px 0 0', fontSize: '14.5px' }">Localized strings mapped to clips &amp; scenes — exported as the Templater CSV.</p>
        </div>
        <div :style="{ display: 'flex', gap: '10px' }">
          <Button variant="secondary" icon="plus">Add slot</Button>
          <Button icon="download" @click="exportCsv">Export Templater CSV</Button>
        </div>
      </div>

      <div :style="{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }">
        <div :style="{ display: 'flex', gap: '8px' }">
          <Tag v-for="f in ['All', 'approved', 'review', 'missing']" :key="f" :active="filter === f" @click="filter = f">{{ FILTER_LABELS[f] }}</Tag>
        </div>
        <div :style="{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '12px' }">
          <span :style="{ fontSize: '13px', color: 'var(--text-2)' }">{{ filled }}/{{ total }} cells filled</span>
          <div :style="{ width: '120px' }"><Progress :value="total ? Math.round((filled / total) * 100) : 0" /></div>
        </div>
      </div>

      <Card :pad="false" :style="{ overflow: 'hidden' }">
        <div :style="{ overflowX: 'auto' }">
          <table :style="{ width: '100%', borderCollapse: 'collapse', minWidth: '980px' }">
            <thead>
              <tr :style="{ fontSize: '12px', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.04em' }">
                <th :style="{ ...thBase, width: '260px', position: 'sticky', left: 0, zIndex: 2 }">Slot · clip</th>
                <th v-for="l in langs" :key="l" :style="thBase">{{ l }}</th>
                <th :style="{ ...thBase, width: '110px', textAlign: 'right' }">Status</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="{ r, ri } in visible" :key="r.slot" :style="{ borderTop: '1px solid var(--divider)' }">
                <td :style="{ ...tdBase, position: 'sticky', left: 0, background: 'var(--surface-2)', borderRight: '1px solid var(--divider)' }">
                  <div :style="{ fontSize: '14px', fontWeight: 600 }">{{ r.key }}</div>
                  <div class="mono" :style="{ fontSize: '11.5px', color: 'var(--text-3)', marginTop: '3px' }">{{ r.slot }}</div>
                  <div :style="{ fontSize: '11.5px', color: 'var(--text-3)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '5px' }">
                    <Icon name="film" :size="12" /> {{ r.clip }} · {{ r.scene }}
                  </div>
                </td>
                <td v-for="l in langs" :key="l" :style="{ ...tdBase, cursor: 'text' }" @click="edit = { ri, lang: l }">
                  <textarea
                    v-if="isEditing(ri, l)" autofocus rows="2"
                    :value="r.variants[l] || ''"
                    @input="r.variants[l] = $event.target.value"
                    @blur="edit = null"
                    :style="{ width: '100%', minWidth: '150px', padding: '8px', borderRadius: '8px', background: 'var(--surface-1)', border: '1px solid var(--accent)', color: 'var(--text-1)', fontSize: '13px', fontFamily: 'inherit', resize: 'vertical', outline: 'none', boxShadow: '0 0 0 3px var(--accent-ring)' }"
                  />
                  <div v-else :style="{ fontSize: '13px', lineHeight: 1.4, minHeight: '19px', color: (r.variants[l] || '').trim() ? 'var(--text-1)' : 'var(--text-3)', padding: '2px 4px', borderRadius: '6px', minWidth: '130px' }">
                    <template v-if="(r.variants[l] || '').trim()">{{ r.variants[l] }}</template>
                    <span v-else :style="{ fontStyle: 'italic' }">— add —</span>
                  </div>
                </td>
                <td :style="{ ...tdBase, textAlign: 'right' }"><StatusPill :status="r.status" :dot="false" /></td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>

      <div :style="{ fontSize: '12.5px', color: 'var(--text-3)', display: 'flex', alignItems: 'center', gap: '7px' }">
        <Icon name="sparkles" :size="14" /> Click any cell to edit inline. The CSV maps each slot → clip → scene for every locale the Templater picks up.
      </div>
    </div>

    <div v-if="toast" :style="{ position: 'fixed', bottom: '28px', left: '50%', transform: 'translateX(-50%)', zIndex: 80, display: 'flex', alignItems: 'center', gap: '10px', padding: '13px 20px', borderRadius: '14px', background: 'var(--surface-1)', border: '1px solid var(--border-strong)', boxShadow: 'var(--shadow-pop)', fontSize: '14px', fontWeight: 600 }">
      <Icon name="check_circle" :size="18" :style="{ color: 'var(--accent)' }" /> templater_copy_5locales.csv generated
    </div>
  </AppLayout>
</template>
