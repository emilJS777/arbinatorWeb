<template>
  <div class="modal d-flex a-items-center j-content-center">
    <div class="bg-mode-2 padding-2 w-max-content bg-mode-1 border-secondary animation-from-hidden-long b-radius-8 overflow-auto" style="max-height: 500px;">

      <h4 class="c-mode-2 margin-0 d-flex a-items-center j-content-space-between g-gap-_5"> {{this.title}}</h4>
      <p v-if="descriptions" v-for="description in descriptions" class="c-mode-2 f-size-12 font-weight-bold">{{description}}</p>
      <div :class="`d-grid ${this.gridTemplateColumn || 'grid-template-column-3fr'} g-gap-1 m-top-1`">
        <slot name="inputs"></slot>
      </div>
      <div class="d-flex a-items-center g-gap-_5 j-content-flex-end m-top-1">
        <v-button-standard :label="this.saveLabel || 'Save'" @click="this.$emit('save')"/>
        <v-button-standard :label="cancelLabel || 'Cancel'" @click="this.$emit('cancel')" class="bg-ccc-opacity c-mode-1"/>
      </div>
    </div>
  </div>
</template>

<script>
import VButtonStandard from "@/components/_general/v-button-standard.vue";

export default {
  components: {VButtonStandard},
  props: ['title', 'descriptions', 'saveLabel', 'cancelLabel', 'gridTemplateColumn']
};
</script>

<style scoped>
/* стили тут */
</style>
