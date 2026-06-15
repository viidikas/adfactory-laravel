<script setup>
import { ref, computed } from 'vue';
import { router } from '@inertiajs/vue3';
import AppLayout from '../../Layouts/AppLayout.vue';
import Card from '../../Components/Card.vue';
import Button from '../../Components/Button.vue';
import Stepper from '../../Components/Stepper.vue';
import Field from '../../Components/Field.vue';
import Input from '../../Components/Input.vue';
import Select from '../../Components/Select.vue';
import Segmented from '../../Components/Segmented.vue';
import Tag from '../../Components/Tag.vue';
import Thumb from '../../Components/Thumb.vue';
import SectionLabel from '../../Components/SectionLabel.vue';
import Icon from '../../Components/Icon.vue';

const props = defineProps({
  clips: { type: Array, default: () => [] },
  designs: { type: Array, default: () => [] },
  markets: { type: Array, default: () => [] },
  brands: { type: Array, default: () => [] },
  langs: { type: Array, default: () => [] },
  workspace: { type: String, default: 'admin' },
  theme: { type: String, default: null },
  density: { type: String, default: null },
  user: { type: Object, default: () => ({ name: 'Mark Viidik', email: 'mark@creditstar.com' }) },
});

const wsq = computed(() => (props.workspace === 'portal' ? '?ws=portal' : ''));
const STEPS = ['Brief', 'Clips', 'Design', 'Copy', 'Review'];
const step = ref(0);
const brief = ref({ title: '', brand: 'Monefit SmartSaver', market: 'EE', aspect: '9:16', objective: 'Performance' });
const picked = ref([]);
const design = ref(null);
const locales = ref(['EN']);
const notes = ref('');

const marketOf = (code) => props.markets.find((m) => m.code === code) || { flag: '🏳️', name: code };
const designOf = (id) => props.designs.find((d) => d.id === id);
const marketOptions = computed(() => props.markets.map((m) => ({ value: m.code, label: m.flag + ' ' + m.name })));
const aspectOptions = [
  { value: '9:16', label: '9:16 · Reels/Stories' },
  { value: '1:1', label: '1:1 · Feed' },
  { value: '16:9', label: '16:9 · YouTube' },
];
const objectiveOptions = ['Performance', 'Awareness', 'Trust', 'Consideration'];

const clipsForAspect = computed(() => props.clips.filter((c) => c.aspect === brief.value.aspect));
const designsForAspect = computed(() => props.designs.filter((d) => d.aspect === brief.value.aspect));
const pickedClips = computed(() => props.clips.filter((c) => picked.value.includes(c.id)));

const canNext = computed(() => [
  brief.value.title.trim().length > 2,
  picked.value.length > 0,
  !!design.value,
  locales.value.length > 0,
  true,
][step.value]);

const toggle = (id) => { picked.value = picked.value.includes(id) ? picked.value.filter((x) => x !== id) : [...picked.value, id]; };
const toggleLang = (l) => { locales.value = locales.value.includes(l) ? locales.value.filter((x) => x !== l) : [...locales.value, l]; };
const back = () => { step.value === 0 ? router.visit('/design/orders' + wsq.value) : (step.value -= 1); };
const next = () => { if (canNext.value) step.value += 1; };
const submit = () => router.visit('/design/orders' + (wsq.value ? wsq.value + '&' : '?') + 'submitted=1');

const reviewRows = computed(() => [
  ['Title', brief.value.title || '—'],
  ['Brand', brief.value.brand],
  ['Market', marketOf(brief.value.market).flag + ' ' + marketOf(brief.value.market).name],
  ['Format', brief.value.aspect],
  ['Objective', brief.value.objective],
  ['Design', designOf(design.value)?.name || '—'],
  ['Clips', picked.value.length],
  ['Locales', locales.value.join(', ')],
  ['Est. variants', picked.value.length && locales.value.length ? locales.value.length + ' renders' : '—'],
]);
</script>

<template>
  <AppLayout active="orders" :workspace="workspace" :theme="theme" :density="density" :user="user">
    <div :style="{ padding: 'var(--pad-screen)', maxWidth: '1040px', margin: '0 auto', width: '100%' }">
      <button @click="router.visit('/design/orders' + wsq)" :style="{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', color: 'var(--text-2)', cursor: 'pointer', fontSize: '13.5px', marginBottom: '16px', fontFamily: 'inherit' }">
        <Icon name="arrowleft" :size="16" /> Cancel
      </button>
      <h1 :style="{ fontSize: '27px', fontWeight: 800, letterSpacing: '-0.02em', margin: '0 0 20px' }">New video ad order</h1>

      <Card :style="{ marginBottom: 'var(--gap)', padding: '18px var(--pad-card)' }"><Stepper :steps="STEPS" :current="step" /></Card>

      <Card :style="{ minHeight: '380px' }">
        <!-- 0: Brief -->
        <div v-if="step === 0" :style="{ display: 'grid', gap: '18px', maxWidth: '620px' }">
          <Field label="Order title"><Input v-model="brief.title" placeholder="e.g. Q3 SmartSaver — APY push (ES)" autofocus /></Field>
          <div :style="{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '18px' }">
            <Field label="Brand"><Select v-model="brief.brand" :options="brands" /></Field>
            <Field label="Market"><Select v-model="brief.market" :options="marketOptions" /></Field>
          </div>
          <Field label="Format"><Segmented v-model="brief.aspect" :options="aspectOptions" /></Field>
          <Field label="Objective"><Segmented v-model="brief.objective" :options="objectiveOptions" /></Field>
        </div>

        <!-- 1: Clips -->
        <div v-else-if="step === 1">
          <div :style="{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }">
            <SectionLabel>Pick clips · {{ brief.aspect }}</SectionLabel>
            <span :style="{ fontSize: '13px', color: picked.length ? 'var(--accent)' : 'var(--text-3)', fontWeight: 600 }">{{ picked.length }} selected</span>
          </div>
          <div :style="{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 'var(--gap)' }">
            <div v-for="c in clipsForAspect" :key="c.id">
              <Thumb :clip="c" :selected="picked.includes(c.id)" @click="toggle(c.id)" />
              <div :style="{ padding: '10px 2px 0' }">
                <div :style="{ fontSize: '13.5px', fontWeight: 600, lineHeight: 1.3, display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden' }">{{ c.name }}</div>
                <div :style="{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '5px', fontSize: '12px', color: 'var(--text-3)' }">
                  <span>{{ marketOf(c.market).flag }}</span><span>{{ c.category }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 2: Design -->
        <div v-else-if="step === 2">
          <SectionLabel>Choose an ad design · {{ brief.aspect }}</SectionLabel>
          <div :style="{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 'var(--gap)', marginTop: '14px' }">
            <div
              v-for="d in designsForAspect" :key="d.id"
              @click="design = d.id"
              :style="{ border: '1.5px solid', borderColor: design === d.id ? 'var(--accent)' : 'var(--border)', borderRadius: '14px', padding: '14px', cursor: 'pointer', background: design === d.id ? 'var(--accent-soft)' : 'var(--surface-1)', transition: 'all .15s' }"
            >
              <div :style="{ display: 'flex', gap: '6px', marginBottom: '12px' }">
                <div v-for="i in d.scenes" :key="i" :style="{ flex: 1, aspectRatio: d.aspect === '16:9' ? '16/9' : d.aspect === '1:1' ? '1' : '9/16', borderRadius: '6px', background: `linear-gradient(160deg, ${d.color}, #0d0f10)` }" />
              </div>
              <div :style="{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }">
                <div>
                  <div :style="{ fontSize: '14px', fontWeight: 700 }">{{ d.name }}</div>
                  <div :style="{ fontSize: '12px', color: 'var(--text-3)', marginTop: '3px' }">{{ d.scenes }} scenes · {{ d.dur }}s · {{ d.kind }}</div>
                </div>
                <span v-if="design === d.id" :style="{ width: '22px', height: '22px', borderRadius: '999px', background: 'var(--accent)', color: 'var(--text-on-accent)', display: 'grid', placeItems: 'center' }"><Icon name="check" :size="13" :stroke="2.5" /></span>
              </div>
            </div>
          </div>
        </div>

        <!-- 3: Copy -->
        <div v-else-if="step === 3" :style="{ maxWidth: '640px' }">
          <SectionLabel>Localize into</SectionLabel>
          <div :style="{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '22px' }">
            <Tag v-for="l in langs" :key="l" :active="locales.includes(l)" @click="toggleLang(l)">{{ l }}</Tag>
          </div>
          <Field label="Notes for the production team" hint="Tone, must-use lines, do-not-use clips, deadlines…">
            <textarea v-model="notes" rows="5" placeholder="Anything the editor should know…"
              :style="{ width: '100%', padding: '14px', borderRadius: '12px', background: 'var(--surface-1)', border: '1px solid var(--border)', color: 'var(--text-1)', fontSize: '14.5px', fontFamily: 'inherit', resize: 'vertical', outline: 'none' }" />
          </Field>
          <div :style="{ display: 'flex', alignItems: 'center', gap: '9px', marginTop: '18px', padding: '14px', borderRadius: '12px', background: 'var(--accent-soft)', color: 'var(--accent)', fontSize: '13.5px' }">
            <Icon name="sparkles" :size="18" /> Copy variants for these locales will be pulled from the copy map automatically.
          </div>
        </div>

        <!-- 4: Review -->
        <div v-else :style="{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '28px' }">
          <div>
            <SectionLabel>Summary</SectionLabel>
            <div :style="{ marginTop: '6px' }">
              <div v-for="r in reviewRows" :key="r[0]" :style="{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderTop: '1px solid var(--divider)', fontSize: '14px' }">
                <span :style="{ color: 'var(--text-2)' }">{{ r[0] }}</span><span :style="{ fontWeight: 600 }">{{ r[1] }}</span>
              </div>
            </div>
          </div>
          <div>
            <SectionLabel>Selected clips</SectionLabel>
            <div :style="{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginTop: '6px' }">
              <Thumb v-for="c in pickedClips" :key="c.id" :clip="c" :show-play="false" />
            </div>
          </div>
        </div>
      </Card>

      <div :style="{ display: 'flex', justifyContent: 'space-between', marginTop: 'var(--gap)' }">
        <Button variant="ghost" icon="arrowleft" @click="back">{{ step === 0 ? 'Cancel' : 'Back' }}</Button>
        <Button v-if="step < 4" icon-right="arrowright" :disabled="!canNext" @click="next">Continue</Button>
        <Button v-else icon="send" @click="submit">Submit order</Button>
      </div>
    </div>
  </AppLayout>
</template>
