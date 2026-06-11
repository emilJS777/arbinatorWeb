<template>
  <div :class="`d-grid`" class="custom-select-container">
    <label for="" class="f-weight-bold" v-if="label">{{ label }}</label>
    <span class="f-size-very-small" v-if="span">{{ span }}</span>

    <!-- Custom select container -->
    <div class="custom-select-block c-mode-1 f-size-12 d-flex a-items-center b-radius-6" @click="this.setModalName('selectOption')">
      <div class="selected-item d-flex a-items-center g-gap-_3 h-max-content" :class="{ open: isOpen }">
        <span><v-cryptocoin-icon :symbol="this.selectedItem[this.label_key]" :size="this.size || '30'"/></span>
        <span class="arrow-down h-max-content l-height-0">
          <svg width="18" height="18" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path fill-rule="evenodd" clip-rule="evenodd" d="M4.27624 6.3543C4.44875 6.13867 4.76339 6.10371 4.97902 6.27621L8.00001 8.693L11.021 6.27621C11.2366 6.10371 11.5513 6.13867 11.7238 6.3543C11.8963 6.56993 11.8613 6.88457 11.6457 7.05708L8.31236 9.72374C8.12975 9.86983 7.87027 9.86983 7.68766 9.72374L4.35433 7.05708C4.1387 6.88457 4.10374 6.56993 4.27624 6.3543Z" fill="#B9BFD5"/>
          </svg>
        </span>
      </div>
    </div>
  </div>

  <!--  MODAL CONTENT BLOCK-->
  <div class="modal d-flex j-content-center a-items-flex-end animation-from-hidden" v-if="modalName === 'selectOption'">
    <div class="p-fixed top-0 left-0 h-max w-max" @click="this.setModalName(false)"></div>


    <div class="bg-surface-surface-secondary f-size-18 w-max padding-1 padding-top-05 z-index-max animation-from-bottom" style="border-radius: 16px 16px 0px 0px; height: 50%;">
      <div class="b-radius-40 bg-button-secondary-button-rested d-block m-0-auto m-bottom-1" style="width: 198px; height: 5px;"></div>

      <h3 class="c-mode-2 margin-0 f-size-14 d-flex a-items-center j-content-space-between" v-if="modal_title">
        <span>{{ modal_title }}</span>
        <span class="padding-02" @click="this.setModalName(false)"><i class="fa fa-close"></i></span>
      </h3>

      <v-input-normal placeholder="Search" icon="fa fa-search" v-if="search" :mode="2" class="m-top-05"/>

      <div class="m-top-05 overflow-auto" style="height: 80%;">
        <p class="margin-0 c-mode-3 d-flex a-items-center g-gap-_3 padding-y-10p padding-x-8p h-max-content" @click="this.selectItem(item, index)" v-for="(item, index) in this.items"><v-cryptocoin-icon :size="30" v-if="symbol_key" size="32" :symbol="this.symbol_key_2 ? item[symbol_key][symbol_key_2] : item[symbol_key]" style="margin-right: 8px;"/><span>{{this.label_key_2 ? item[this.label_key][this.label_key_2] : item[this.label_key]}}</span></p>
      </div>
    </div>
  </div>
</template>

<script>
import toggleMixin from "@/mixins/toggle-mixin.js";
import VCryptocoinIcon from "@/components/_general/v-cryptocoin-icon.vue";
import VInputNormal from "@/components/_general/v-input-standard.vue";

export default {
  components: {VInputNormal, VCryptocoinIcon},
  props: ['label', 'items', 'span', 'active_index', 'label_key', 'modal_title', 'standard', 'symbol_key', 'search', 'label_key_2', 'symbol_key_2', 'size'],
  mixins: [toggleMixin],
  data() {
    return {
      selectedItem: this.items[this.active_index] || null,
    }
  },
  mounted() {
    if (this.selected) {
      this.selectedItem = this.selected;
    }
  },
  methods: {
    selectItem(item, index) {
      this.selectedItem = item;
      this.setModalName(false);
      this.$emit('select', ({item, index}));
    }
  }
}
</script>

<style scoped>
.custom-select-block{
  padding: 4px 6px;
  height: 26px;
}
</style>
