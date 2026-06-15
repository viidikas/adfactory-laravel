<script setup>
/* Maps the design's icon names (design_handoff_adfactory) to lucide-vue-next
   components, so screens can keep using <Icon name="grid" /> as the prototype did. */
import { computed } from 'vue';
import {
  LayoutGrid, Film, FileText, Clipboard, ClipboardList, Plus, Search,
  ChevronDown, ChevronRight, ChevronLeft, Check, X, Play, Star, Filter,
  SlidersHorizontal, Bell, Settings, User, LogOut, ArrowRight, ArrowLeft,
  MoreVertical, Upload, Download, Clock, Wand2, Globe, Calendar, Eye, Trash2,
  Pencil, Copy, PanelLeft, Layers, Zap, RefreshCw, CircleCheck, TriangleAlert,
  Send, Scissors, Folder, Sparkles, ExternalLink, Circle,
} from 'lucide-vue-next';

const MAP = {
  grid: LayoutGrid, film: Film, filetext: FileText, clipboard: Clipboard,
  clipboardlist: ClipboardList, plus: Plus, search: Search, chevdown: ChevronDown,
  chevright: ChevronRight, chevleft: ChevronLeft, check: Check, x: X, play: Play,
  star: Star, filter: Filter, sliders: SlidersHorizontal, bell: Bell,
  settings: Settings, user: User, logout: LogOut, arrowright: ArrowRight,
  arrowleft: ArrowLeft, kebab: MoreVertical, upload: Upload, download: Download,
  clock: Clock, wand: Wand2, globe: Globe, calendar: Calendar, eye: Eye,
  trash: Trash2, edit: Pencil, copy: Copy, panelleft: PanelLeft, layers: Layers,
  zap: Zap, refresh: RefreshCw, check_circle: CircleCheck, alert: TriangleAlert,
  send: Send, scissors: Scissors, folder: Folder, sparkles: Sparkles,
  external: ExternalLink, dot: Circle,
};

const props = defineProps({
  name: { type: String, required: true },
  size: { type: [Number, String], default: 18 },
  stroke: { type: [Number, String], default: 1.75 },
  fill: { type: String, default: null },
});

const filled = computed(() => ['play', 'star', 'dot'].includes(props.name));
const cmp = computed(() => MAP[props.name] || Circle);
</script>

<template>
  <component
    :is="cmp"
    :size="Number(size)"
    :stroke-width="filled ? 0 : Number(stroke)"
    :fill="filled ? (fill || 'currentColor') : 'none'"
    :style="{ flexShrink: 0, display: 'block' }"
  />
</template>
