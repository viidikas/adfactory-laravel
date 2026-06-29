<script setup>
// Brand lockup: the Creditstar logo. The artwork is white (built for the dark
// UI); on the light theme it's inverted to dark via the `.cs-brand-logo` rule in
// theme.css so it stays legible on light surfaces.
</script>

<template>
  <img class="cs-brand-logo" src="/img/creditstar-logo.png" alt="Creditstar"
    :style="{ height: '32px', width: 'auto', display: 'block' }" />
</template>
