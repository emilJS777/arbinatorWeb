<script>
import VButtonStandard from "@/components/_general/v-button-standard.vue";

export default {
  components: {VButtonStandard},
  props: ['title', 'msg', 'okLabel', 'closeLabel'],
}
</script>

<template>
  <div class="modal d-flex a-items-center j-content-center">
    <div class="p-fixed left-0 top-0 w-max h-max z-index-max" @click="this.$emit('close')"></div>

    <div class="bg-mode-2 padding-05 padding-left-1 padding-right-1 b-radius-8 margin-1 z-index-max">
      <h4 class="m-bottom-_2 m-top-05 f-size-16 c-mode-3">{{this.title}}</h4>
      <p class="f-size-14 m-top-01 c-mode-2">{{this.msg}}</p>
      <div class="d-grid grid-template-column-2fr g-gap-_5">
        <v-button-standard :label="this.okLabel ? this.okLabel : 'OK'" class="bg-content w-max c-000" @click="this.$emit('confirm')"/>
        <v-button-standard :label="this.closeLabel ? this.closeLabel : 'CLOSE'" class="bg-mode-2  c-mode-1 w-max" @click="this.$emit('skip');this.$emit('close')"/>
      </div>
    </div>
  </div>
</template>

<style scoped>

</style>
