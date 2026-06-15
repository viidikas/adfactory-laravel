<script setup>
import { ref, computed } from 'vue';
import Icon from './Icon.vue';

const props = defineProps({
  clip: { type: Object, required: true }, // { aspect, color, duration, poster? }
  selected: Boolean,
  showPlay: { type: Boolean, default: true },
  height: { type: [String, Number], default: 'auto' },
});
const emit = defineEmits(['click']);
const hover = ref(false);

const ratio = computed(() => (props.clip.aspect === '16:9' ? '16 / 9' : props.clip.aspect === '1:1' ? '1 / 1' : '9 / 16'));
const bg = computed(() => {
  // Real poster frame when available; gradient placeholder otherwise.
  if (props.clip.poster) return `center/cover no-repeat url(${props.clip.poster})`;
  const c = props.clip.color || '#2e6b57';
  return `linear-gradient(150deg, ${c}, ${c}cc 55%, #0d0f10 140%)`;
});
const dur = computed(() => '0:' + String(props.clip.duration ?? 0).padStart(2, '0'));
</script>

<template>
  <div
    @click="emit('click')"
    @mouseenter="hover = true" @mouseleave="hover = false"
    :style="{
      position: 'relative', aspectRatio: ratio, height: typeof height === 'number' ? height + 'px' : height,
      borderRadius: '12px', overflow: 'hidden', background: bg,
      cursor: 'pointer',
      outline: selected ? '2.5px solid var(--accent)' : '1px solid var(--border)',
      outlineOffset: selected ? '0' : '-1px', transition: 'outline .15s',
    }"
  >
    <div :style="{ position: 'absolute', inset: 0, background: 'repeating-linear-gradient(180deg, transparent 0, transparent 13px, rgba(0,0,0,0.07) 13px, rgba(0,0,0,0.07) 14px)', opacity: 0.5 }" />
    <div v-if="showPlay" :style="{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', background: hover ? 'rgba(0,0,0,0.18)' : 'transparent', transition: 'background .15s' }">
      <div :style="{ width: '40px', height: '40px', borderRadius: '999px', display: 'grid', placeItems: 'center', background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)', color: '#fff', transform: hover ? 'scale(1.08)' : 'scale(1)', transition: 'transform .15s' }">
        <Icon name="play" :size="16" fill="#fff" />
      </div>
    </div>
    <span :style="{ position: 'absolute', top: '8px', left: '8px', fontSize: '10.5px', fontWeight: 700, color: 'rgba(255,255,255,0.85)', background: 'rgba(0,0,0,0.4)', padding: '2px 7px', borderRadius: '6px', letterSpacing: '0.02em' }">{{ clip.aspect }}</span>
    <span class="mono" :style="{ position: 'absolute', bottom: '8px', right: '8px', fontSize: '11px', fontWeight: 600, color: '#fff', background: 'rgba(0,0,0,0.55)', padding: '2px 7px', borderRadius: '6px' }">{{ dur }}</span>
    <span v-if="selected" :style="{ position: 'absolute', top: '8px', right: '8px', width: '22px', height: '22px', borderRadius: '999px', background: 'var(--accent)', color: 'var(--text-on-accent)', display: 'grid', placeItems: 'center' }">
      <Icon name="check" :size="13" :stroke="2.5" />
    </span>
  </div>
</template>
