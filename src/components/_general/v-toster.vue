<script>
export default {
  props: ['msg', 'success'],
  mounted() {
    setTimeout(() => {
      this.$emit('close')
    }, 4000)
  }
}
</script>

<template>
  <div class="d-flex a-items-flex-start j-content-center">
    <div :class="`p-fixed padding-1 bg-fff box-shadow-slim t-center animation-from-hidden bg-mode-3 b-radius-8 d-flex a-items-center g-gap-_5 ${this.success ? 'c-mode-1' : 'err-msg'}`" style="z-index: 9999; top: 10px;">
      <span v-if="this.success" class="color-green"><i class="fa-solid fa-circle-check"></i></span>
      <span v-else class="err-msg"><i class="fa-solid fa-circle-exclamation"></i></span>
      <span style="max-width: 350px;">{{this.msg}}</span>
    </div>
  </div>
</template>

<style scoped>

</style>
