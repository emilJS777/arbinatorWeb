<script>
import VConfirmModal from "@/components/_general/v-confirm-modal.vue";
import toggleMixin from "@/mixins/toggle-mixin.js";

export default {
  components: {VConfirmModal},
  mixins: [toggleMixin],
  props: ['default_switch', 'first_await', 'disabled', 'disableAlertMessage', 'enableAlertMessage', 'enableAlertTitle', 'disableAlertTitle'],
  data(){
    return{
      switch: false
    }
  },
  mounted() {
    this.switch = this.default_switch;
    if (!this.first_await) this.onSwitch();
  },
  methods: {
    onSwitch(){
      this.switch = !this.switch;
      console.log(this.switch)
      this.$emit('switch', this.switch);
    }
  }
}
</script>

<template>
  <div :class="`${this.switch === true ? 'bg-mode-1' : 'bg-ccc'} ${this.disabled ? '' : 'c-pointer'}  b-radius-20  d-flex a-items-center p-relative border-dark-1 fa-border `" @click="()=>{!this.disabled ? this.setModalName('confirm') : ''}" style="width: 40px; height: 8px;">
    <span :style="`width: 16px; height: 16px; margin-top: 0px; ${this.switch === true ? 'right: -1px;' : 'left: -1px;'}`" class="b-radius-50 p-absolute bg-mode-3"></span>
  </div>

  <v-confirm-modal :title="this.switch ? this.disableAlertTitle : this.enableAlertTitle" :msg="this.switch ? this.disableAlertMessage : this.enableAlertMessage" @close="this.setModalName(false)" @confirm="this.onSwitch()" v-if="modalName === 'confirm'"/>
</template>

<style scoped>

</style>
