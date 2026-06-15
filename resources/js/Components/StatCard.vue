<script setup>
import Card from './Card.vue';
import Sparkline from './Sparkline.vue';
defineProps({ stat: { type: Object, required: true } }); // { label, value, delta, good, spark }
</script>

<template>
  <Card>
    <div :style="{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }">
      <div :style="{ fontSize: '13px', color: 'var(--text-2)', fontWeight: 500 }">{{ stat.label }}</div>
      <Sparkline :data="stat.spark" />
    </div>
    <div :style="{ display: 'flex', alignItems: 'baseline', gap: '10px', marginTop: '10px' }">
      <div class="hero-num" :style="{ fontSize: '34px' }">{{ stat.value }}</div>
      <span :style="{ fontSize: '12.5px', fontWeight: 700, color: stat.good ? 'var(--success)' : 'var(--danger)' }">{{ stat.delta }}</span>
    </div>
  </Card>
</template>
