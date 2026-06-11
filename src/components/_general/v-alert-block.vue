<script>
import VButtonStandard from "@/components/_general/v-button-standard.vue";

export default {
  components: {VButtonStandard},
  props: ['title', 'msg'],
}
</script>

<template>
  <div class="modal d-flex a-items-center j-content-center">
    <div class="p-fixed left-0 top-0 w-max h-max z-index-max" @click="this.$emit('close')"></div>

    <div class="bg-fff padding-05 padding-left-1 padding-right-1 b-radius-8 margin-1 bg-mode-2">
      <h4 class="m-bottom-_2 m-top-05 c-mode-1 f-size-15">{{this.title}}</h4>
      <p class="f-size-14 c-mode-2">{{this.msg}}</p>
      <v-button-standard label="OK" class="bg-555 c-fff w-max bg-button-primary" @click="this.$emit('close')"/>
    </div>
  </div>
</template>

<style scoped>

</style>
