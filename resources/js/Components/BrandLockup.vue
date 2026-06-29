<script setup>
// Brand lockup: the Creditstar logo + the AD.FACTORY product wordmark, together.
// The logo artwork is white (for the dark UI); theme.css inverts it to dark on
// the light theme via `.cs-brand-logo` so it stays legible on light surfaces.
</script>

<template>
  <div :style="{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }">
    <img class="cs-brand-logo" src="/img/creditstar-logo.png" alt="Creditstar"
      :style="{ height: '20px', width: 'auto', display: 'block', flexShrink: 0 }" />
    <span :style="{ width: '1px', height: '18px', background: 'var(--border-strong)', flexShrink: 0 }" />
    <span :style="{ fontSize: '14px', fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text-1)', whiteSpace: 'nowrap' }">
      AD<span :style="{ color: 'var(--text-1)' }">.</span>FACTORY
    </span>
  </div>
</template>
