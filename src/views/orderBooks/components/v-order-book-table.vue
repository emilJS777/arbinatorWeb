<script>

import VTableStandard from "@/components/_general/v-table-standard.vue";
import VCryptocoinIcon from "@/components/_general/v-cryptocoin-icon.vue";
export default {
  components: {VCryptocoinIcon, VTableStandard},
  props: ['orderBook', 'type', 'fontSize'],
  data() {
    return {
      dataLabels: ['PRICE', 'AMOUNT', 'COMMISSION'],
      dataKeys: ['price', 'amount', 'commission'],
    }
  },
}
</script>

<template>
  <div class="">
    <div class="d-flex a-items-center g-gap-1">
      <span :class="`c-mode-1 ${type === 'sales' ? 'c-pallete-error-Error-50' : 'c-pallete-success-50'}`">{{ this.type }}</span>
    </div>

    <v-table-standard
        :fontSize="this.fontSize"
        grid-template-columns="1fr 1fr 1fr"
        :editable="false"
        table-width="max-content"
        :allowEnabled="true"
        :data="orderBook[this.type]"
        :data-labels="this.dataLabels"
        :data-keys="this.dataKeys"
        :total-pages="1"
        :total-records="'Nan'"
    />
    <div class="d-grid g-gap-_2 m-top-1">
      <span class="d-flex a-items-center j-content-space-between c-mode-3">{{type === 'purchases' ? 'Hight' : 'Low'}} Price: <span class="c-mode-1 f-weight-bold">$ {{type === 'purchases' ? orderBook.purchaseHighPrice.price : orderBook.saleLowPrice.price }}</span></span>
      <span class="d-flex a-items-center j-content-space-between c-mode-3  f-size-12">
                    Amount:
                    <span class="c-mode-1 f-weight-bold">
                     {{type === 'purchases' ? orderBook.purchaseHighPrice.amount : orderBook.saleLowPrice.amount}}
                    </span>
                  </span>
    </div>
  </div>
</template>

<style scoped>

</style>