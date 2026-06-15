<script setup>
import { ref, computed } from 'vue';
import { router } from '@inertiajs/vue3';
import AppLayout from '../../Layouts/AppLayout.vue';
import Button from '../../Components/Button.vue';
import Input from '../../Components/Input.vue';
import Select from '../../Components/Select.vue';
import Segmented from '../../Components/Segmented.vue';
import Tag from '../../Components/Tag.vue';
import Card from '../../Components/Card.vue';
import Thumb from '../../Components/Thumb.vue';
import EmptyState from '../../Components/EmptyState.vue';
import Drawer from '../../Components/Drawer.vue';

const props = defineProps({
  clips: { type: Array, default: () => [] },
  markets: { type: Array, default: () => [] },
  categories: { type: Array, default: () => [] },
  workspace: { type: String, default: 'admin' },
  theme: { type: String, default: 'dark' },
  density: { type: String, default: 'regular' },
});

const portal = computed(() => props.workspace === 'portal');
const wsq = computed(() => (props.workspace === 'portal' ? '?ws=portal' : ''));
const startOrder = () => router.visit('/design/orders/create' + wsq.value);
const marketOf = (code) => props.markets.find((m) => m.code === code) || { flag: '🏳️', name: code };

const q = ref('');
const cat = ref('All');
const market = ref('All');
const view = ref('grid');
const sort = ref('recent');
const preview = ref(null);

const filtered = computed(() => {
  let list = props.clips.filter((c) =>
    (cat.value === 'All' || c.category === cat.value) &&
    (market.value === 'All' || c.market === market.value) &&
    (!q.value || c.name.toLowerCase().includes(q.value.toLowerCase()) || (c.tags || []).some((t) => t.includes(q.value.toLowerCase())))
  );
  if (sort.value === 'recent') list = [...list].sort((a, b) => a.addedDays - b.addedDays);
  if (sort.value === 'used') list = [...list].sort((a, b) => b.usedCount - a.usedCount);
  if (sort.value === 'duration') list = [...list].sort((a, b) => a.duration - b.duration);
  return list;
});

const marketOptions = computed(() => [{ value: 'All', label: 'All markets' }, ...props.markets.map((m) => ({ value: m.code, label: m.flag + ' ' + m.name }))]);
const sortOptions = [
  { value: 'recent', label: 'Recently added' },
  { value: 'used', label: 'Most used' },
  { value: 'duration', label: 'Shortest first' },
];
const viewOptions = [{ value: 'grid', icon: 'grid' }, { value: 'list', icon: 'sliders' }];

function clearFilters() { q.value = ''; cat.value = 'All'; market.value = 'All'; }
const dur = (s) => '0:' + String(s).padStart(2, '0');
</script>

<template>
  <AppLayout active="clips" :workspace="workspace" :theme="theme" :density="density">
    <div :style="{ padding: 'var(--pad-screen)', display: 'flex', flexDirection: 'column', gap: 'var(--gap)' }">
      <!-- header -->
      <div :style="{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }">
        <div>
          <h1 :style="{ fontSize: '27px', fontWeight: 800, letterSpacing: '-0.02em', margin: 0 }">{{ portal ? 'Browse clips' : 'Clip library' }}</h1>
          <p :style="{ color: 'var(--text-2)', margin: '6px 0 0', fontSize: '14.5px' }">{{ filtered.length }} clips · {{ portal ? 'pick what fits your campaign' : 'source footage, sorted and tagged' }}</p>
        </div>
        <Button v-if="portal" icon="plus" @click="startOrder">Start an order</Button>
        <Button v-else icon="upload">Upload clips</Button>
      </div>

      <!-- toolbar -->
      <div :style="{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }">
        <div :style="{ flex: '1 1 280px', minWidth: '220px' }">
          <Input v-model="q" placeholder="Search clips, tags…" icon="search" />
        </div>
        <Select v-model="market" :options="marketOptions" :style="{ width: '150px' }" />
        <Select v-model="sort" :options="sortOptions" :style="{ width: '160px' }" />
        <Segmented v-model="view" :options="viewOptions" size="sm" />
      </div>

      <!-- category chips -->
      <div :style="{ display: 'flex', gap: '8px', flexWrap: 'wrap' }">
        <Tag v-for="c in ['All', ...categories]" :key="c" :active="cat === c" @click="cat = c">{{ c }}</Tag>
      </div>

      <!-- results -->
      <Card v-if="filtered.length === 0">
        <EmptyState icon="film" title="No clips match" sub="Try clearing filters or a different search term.">
          <template #action><Button variant="soft" @click="clearFilters">Clear filters</Button></template>
        </EmptyState>
      </Card>

      <div v-else-if="view === 'grid'" :style="{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(var(--grid-min), 1fr))', gap: 'var(--gap)' }">
        <div v-for="c in filtered" :key="c.id">
          <Thumb :clip="c" @click="preview = c" />
          <div :style="{ padding: '10px 2px 0' }">
            <div :style="{ fontSize: '13.5px', fontWeight: 600, lineHeight: 1.3, display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden' }">{{ c.name }}</div>
            <div :style="{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '5px', fontSize: '12px', color: 'var(--text-3)' }">
              <span>{{ marketOf(c.market).flag }}</span><span>{{ c.category }}</span><span>·</span><span>used {{ c.usedCount }}×</span>
            </div>
          </div>
        </div>
      </div>

      <Card v-else :pad="false">
        <div
          v-for="(c, i) in filtered" :key="c.id"
          class="row-hover"
          @click="preview = c"
          :style="{ display: 'grid', gridTemplateColumns: '48px 1fr 110px 90px 90px', gap: '14px', alignItems: 'center', padding: '10px var(--pad-card)', borderTop: i ? '1px solid var(--divider)' : 'none', cursor: 'pointer' }"
        >
          <div :style="{ width: '48px' }"><Thumb :clip="c" :show-play="false" /></div>
          <div>
            <div :style="{ fontSize: '14px', fontWeight: 600 }">{{ c.name }}</div>
            <div :style="{ fontSize: '12px', color: 'var(--text-3)', marginTop: '2px' }">{{ c.id }} · {{ (c.tags || []).join(' · ') }}</div>
          </div>
          <div :style="{ fontSize: '12.5px', color: 'var(--text-2)' }">{{ marketOf(c.market).flag }} {{ c.category }}</div>
          <div class="mono" :style="{ fontSize: '12.5px', color: 'var(--text-2)' }">{{ dur(c.duration) }}</div>
          <div :style="{ fontSize: '12.5px', color: 'var(--text-3)', textAlign: 'right' }">used {{ c.usedCount }}×</div>
        </div>
      </Card>
    </div>

    <!-- Clip preview drawer -->
    <Drawer :open="!!preview" :title="preview ? preview.id : ''" @close="preview = null">
      <div v-if="preview">
        <Thumb :clip="preview" :height="preview.aspect === '9:16' ? 360 : 'auto'" />
        <h2 :style="{ fontSize: '20px', fontWeight: 800, letterSpacing: '-0.02em', margin: '18px 0 6px' }">{{ preview.name }}</h2>
        <div :style="{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '18px' }">
          <Tag v-for="t in (preview.tags || [])" :key="t" :clickable="false">{{ t }}</Tag>
        </div>
        <div :style="{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }">
          <div v-for="f in [['Category', preview.category], ['Market', marketOf(preview.market).flag + ' ' + marketOf(preview.market).name], ['Duration', dur(preview.duration)], ['Aspect', preview.aspect], ['Resolution', preview.resolution], ['Used in', preview.usedCount + ' orders']]" :key="f[0]"
            :style="{ padding: '12px', borderRadius: '12px', background: 'var(--surface-2)', border: '1px solid var(--border)' }">
            <div :style="{ fontSize: '12px', color: 'var(--text-3)' }">{{ f[0] }}</div>
            <div :style="{ fontSize: '14px', fontWeight: 700, marginTop: '3px' }">{{ f[1] }}</div>
          </div>
        </div>
      </div>
      <template #footer>
        <Button variant="secondary" icon="download" full>Download</Button>
        <Button v-if="portal" icon="plus" full @click="startOrder">Use in order</Button>
        <Button v-else icon="edit" full>Edit tags</Button>
      </template>
    </Drawer>
  </AppLayout>
</template>
