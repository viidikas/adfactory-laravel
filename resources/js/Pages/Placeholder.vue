<script setup>
import AppLayout from '../Layouts/AppLayout.vue';
import Card from '../Components/Card.vue';
import Button from '../Components/Button.vue';
import Icon from '../Components/Icon.vue';

defineProps({
  active: { type: String, default: '' },
  workspace: { type: String, default: 'admin' },
  theme: { type: String, default: null },
  density: { type: String, default: null },
  title: { type: String, default: 'Coming soon' },
  blurb: { type: String, default: '' },
  legacy: { type: String, default: '/legacy' },
});
</script>

<template>
  <AppLayout :active="active" :workspace="workspace" :theme="theme" :density="density">
    <div :style="{ padding: 'var(--pad-screen)', display: 'flex', flexDirection: 'column', gap: 'var(--gap)' }">
      <div>
        <h1 :style="{ fontSize: '27px', fontWeight: 800, letterSpacing: '-0.02em', margin: 0 }">{{ title }}</h1>
        <p :style="{ color: 'var(--text-2)', margin: '6px 0 0', fontSize: '14.5px' }">Being rebuilt in the new design</p>
      </div>

      <Card :style="{ maxWidth: '620px' }">
        <div :style="{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '16px', padding: '14px 8px' }">
          <div :style="{ width: '52px', height: '52px', borderRadius: '14px', background: 'var(--accent-soft)', color: 'var(--accent)', display: 'grid', placeItems: 'center' }">
            <Icon name="wand" :size="26" />
          </div>
          <div>
            <div :style="{ fontSize: '17px', fontWeight: 700 }">This screen is part of the redesign in progress.</div>
            <p :style="{ color: 'var(--text-2)', fontSize: '14px', lineHeight: 1.55, margin: '8px 0 0' }">{{ blurb }}</p>
            <p :style="{ color: 'var(--text-3)', fontSize: '13px', lineHeight: 1.55, margin: '10px 0 0' }">
              Every existing capability still works in the classic interface in the meantime — open it below.
            </p>
          </div>
          <a :href="legacy" :style="{ textDecoration: 'none' }">
            <Button icon="external">Open in classic UI</Button>
          </a>
        </div>
      </Card>
    </div>
  </AppLayout>
</template>
