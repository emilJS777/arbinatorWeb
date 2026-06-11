<template>
  <div class="modal d-flex a-items-center j-content-center">
    <div class="p-fixed left-0 top-0 w-max h-max" @click="this.close"></div>
    <div class="modal-content w-max-content h-max-content">
      <i v-html="message" class=""></i>

      <div class="m-top-1 d-flex j-content-center">
        <v-button-standard label="OK" @click="this.close"/>
      </div>
    </div>
  </div>
</template>

<script>
import {mapState} from "vuex";
import VButtonStandard from "@/components/_general/v-button-standard.vue";
export default {
  props: ['message', 'reload'],
  components: {VButtonStandard},
  methods: {
    close(){
      if(this.reload){console.log("reload")}
      else
        this.$emit("close");
    }
  }
}
</script>

<style scoped>
.modal{
  z-index: 999;
}
</style>
