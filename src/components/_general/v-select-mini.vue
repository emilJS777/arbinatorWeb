<template>
  <div :class="`d-grid`" class="custom-select-container">
    <label for="" class="f-weight-bold f-size-12 f-weight-500 c-mode-1" style="margin-bottom: 6px;" v-if="label">{{ label }}</label>
    <span class="f-size-very-small" v-if="span">{{ span }}</span>

    <!-- Custom select container -->
    <div :class="`${this.standard ? 'custom-select-block-standard' : 'custom-select-block-mini'} bg-mode-2 c-mode-1 f-size-14 f-weight-500  border-secondary d-flex a-items-center b-radius-6 c-pointer`" @click="!disabled ? this.setModalName('selectOption') : null">
      <div class="selected-item d-flex a-items-center g-gap-_3 h-max-content j-content-space-between w-webkit-fill-available" :class="{ open: isOpen }">
        <div class="d-flex a-items-center" v-if="selectedItem">
          <v-cryptocoin-icon :size="28" v-if="this.standard && symbol_key || this.standard || icon_path_key" :path="selectedItem[icon_path_key]" :symbol="this.symbol_key_2 ? selectedItem[symbol_key][symbol_key_2] : selectedItem[symbol_key]" style="margin-right: 8px;"/>
          <span>{{ selectedItem ? this.label_key_2 ? selectedItem[this.label_key][this.label_key_2] : selectedItem[this.label_key] : 'Select an option' }}</span>
        </div>

        <div v-if="!disabled">
          <span class="arrow-down h-max-content l-height-0 c-mode-icon-rested" v-if="this.standard">
            <svg width="12" height="10" viewBox="0 0 12 10" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M9.50459 0.5L2.49542 0.5C0.957689 0.5 -0.000406987 2.00237 0.774409 3.19867L4.27899 8.6097C5.04782 9.79676 6.95218 9.79676 7.721 8.6097L11.2256 3.19867C12.0004 2.00237 11.0423 0.5 9.50459 0.5Z" fill="#B9BFD5"/>
            </svg>
          </span>

            <span class="arrow-down h-max-content l-height-0 c-mode-icon-rested" v-else>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path fill-rule="evenodd" clip-rule="evenodd" d="M4.27624 6.3543C4.44875 6.13867 4.76339 6.10371 4.97902 6.27621L8.00001 8.693L11.021 6.27621C11.2366 6.10371 11.5513 6.13867 11.7238 6.3543C11.8963 6.56993 11.8613 6.88457 11.6457 7.05708L8.31236 9.72374C8.12975 9.86983 7.87027 9.86983 7.68766 9.72374L4.35433 7.05708C4.1387 6.88457 4.10374 6.56993 4.27624 6.3543Z" fill="#B9BFD5"/>
            </svg>
          </span>
        </div>
      </div>
    </div>
  </div>

<!--  MODAL CONTENT BLOCK-->
  <div class="modal d-flex j-content-center a-items-center  animation-from-hidden" v-if="modalName === 'selectOption'">
    <div class="p-fixed w-max-content h-max-content" @click="this.setModalName(false)"></div>


    <div class="bg-surface-surface-secondary f-size-18 w-max-content padding-1 padding-top-05 z-index-max animation-from-hidden bg-mode-content-table" style="border-radius: 16px; height: 200px;">
      <div class="b-radius-40 bg-button-secondary-button-rested d-block m-0-auto m-bottom-1" style="width: 198px; height: 5px;"></div>

      <h3 class="c-mode-2 margin-0 f-size-14 d-flex a-items-center j-content-space-between" v-if="modal_title">
        <span>{{ modal_title }}</span>
        <span class="padding-02" @click="this.setModalName(false)"><i class="fa fa-close"></i></span>
      </h3>

      <v-input-normal :placeholder="$t('search')" icon="fa fa-search" v-if="search" :mode="2" class="m-top-05"/>

      <div class="m-top-05 overflow-auto" style="height: 80%;">
        <p class="margin-0 c-mode-3 c-pointer bg-ccc-opacity-hover d-flex a-items-center g-gap-_3 padding-y-10p padding-x-8p h-max-content" @click="this.selectItem(item, index)" v-for="(item, index) in this.items"><v-cryptocoin-icon :size="30" v-if="symbol_key" size="32" :path="item[icon_path_key]" :symbol="this.symbol_key_2 ? item[symbol_key][symbol_key_2] : item[symbol_key]" style="margin-right: 8px;"/><span>{{this.label_key_2 ? item[this.label_key][this.label_key_2] : item[this.label_key]}}</span></p>
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
  props: ['label', 'items', 'span', 'active_index', 'label_key', 'modal_title', 'standard', 'symbol_key', 'search', 'label_key_2', 'symbol_key_2', 'selected', 'disabled', 'icon_path_key'],
  mixins: [toggleMixin],
  data() {
    return {
      selectedItem: this.items[this.active_index],
    }
  },
  mounted() {
    if (this.selected) {
      this.selectedItem = this.items[this.active_index];
      this.selectItem(this.selected, this.active_index, true)
    }
    if(this.active_index !== undefined)
      this.selectItem(this.items[this.active_index], this.active_index, true)
  },
  methods: {
    selectItem(item, index, autoRender=false) {
      this.selectedItem = item;
      this.setModalName(false);
      this.$emit('select', ({item, index, autoRender}));
    }
  }
}
</script>

<style scoped>
.custom-select-block-mini{
  padding: 4px 6px;
  height: 26px;
}
.custom-select-block-standard{
  padding:16px;
  height: max-content;
}
</style>
