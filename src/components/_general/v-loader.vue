<template>
  <div class="loader-overlay">
    <div class="loader-spinner"></div>
  </div>
</template>

<script>
export default {
  name: "Loader"
}
</script>

<style scoped>
.loader-overlay {
  position: fixed;
  left: 0;
  top: 0;
  z-index: 99999;
  width: 100vw;
  height: 100vh;
  background-color: rgba(71, 71, 71, 0.38);
  display: flex;
  justify-content: center;
  align-items: center;
}

.loader-spinner {
  width: 60px;
  height: 60px;
  border: 6px solid rgba(0, 0, 0, 0.2);
  border-top-color: rgba(0, 0, 0, 0.7);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
