<template>
  <div class="embed-layout">
    <router-view />
  </div>
</template>

<style scoped>
.embed-layout {
  height: 100vh;
  width: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--p-content-background);
}
</style>
