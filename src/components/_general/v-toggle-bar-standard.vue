<script>
import toggleMixin from "@/mixins/toggle-mixin.js";

export default {
  props: ['toggle_list', 'label_key', 'default_value'],
  mixins: [toggleMixin],
  mounted() {
    this.setModalName(this.toggle_list[0][this.label_key])
    this.onValue(this.toggle_list[0])
  },
  methods: {
      onValue(toggleBlock){
        this.$emit('value', toggleBlock)
        this.setModalName(toggleBlock[this.label_key])
      }
  }
}
</script>

<template>
  <div class="d-flex a-items-center g-gap-_5">
    <div v-for="toggleBlock in this.toggle_list" @click="this.onValue(toggleBlock)" :class="`${modalName === toggleBlock[label_key] && default_value === parseFloat(toggleBlock[label_key]) ? 'bg-content' : ''} padding-05  fa-border c-pointer b-radius-8`">
      {{toggleBlock[label_key]}}
    </div>
  </div>
</template>

<style scoped>

</style>
