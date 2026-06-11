<script>
import VCryptocoinIcon from "@/components/_general/v-cryptocoin-icon.vue";
import VButtonStandard from "@/components/_general/v-button-standard.vue";

export default {
  components: {VButtonStandard, VCryptocoinIcon},
  props: ['accountOrder']
}
</script>

<template>
  <div class="bg-mode-2 padding-1 b-radius-8 c-mode-1 d-grid g-gap-_5">
    <div class="d-flex a-items-center j-content-space-between h-max-content">
      <div class="d-flex a-items-center g-gap-_5">
        <v-cryptocoin-icon size="26" :path="accountOrder.exchange_icon_path"/>
        <h4 class="f-weight-bold margin-0 c-mode-2">{{accountOrder.exchange}}</h4>
      </div>
      <span class="f-weight-bold c-mode-2">{{accountOrder.pair}}</span>
    </div>

    <div class="d-grid j-content-flex-end g-gap-_5 t-right">
      <div>
        <span class="f-weight-bold f-size-10">STATUS: </span>
        <span :class="`f-size-18 f-weight-bold ${accountOrder.status === 'open' ? 'c-pallete-success-50' : 'c-pallete-error-Error-50'} f-size-16`">{{accountOrder.status}}</span>
      </div>
      <div>
        <span class="f-weight-bold f-size-10">SIDE: </span>
        <span :class="`f-size-18 f-weight-bold ${accountOrder.side === 'buy' ? 'c-pallete-success-50' : 'c-pallete-error-Error-50' } f-size-16`">{{accountOrder.side}}</span>
      </div>
    </div>

    <div class="d-grid g-gap-_3   f-size-12">
      <div class="h-max-content d-flex g-gap-_3 a-items-center">
        <h5 class="margin-0 c-mode-2">Id:</h5>
        <span class="c-mode-1 f-weight-bold">( {{accountOrder.id}} )</span>
      </div>
      <div class="h-max-content d-flex g-gap-_3 a-items-center">
        <h5 class="margin-0 c-mode-2">Price:</h5>
        <span class="c-mode-1 f-weight-bold">( {{accountOrder.price}} )</span>
      </div>
      <div class="h-max-content d-flex g-gap-_3 a-items-center">
        <h5 class="margin-0 c-mode-2">Amount:</h5>
        <span class="c-mode-1 f-weight-bold">( {{accountOrder.amount}} )</span>
      </div>
      <div class="h-max-content d-flex g-gap-_3 a-items-center">
        <h5 class="margin-0 c-mode-2">Filled:</h5>
        <span class="c-mode-1 f-weight-bold c-pallete-success-50">( {{accountOrder.filled}} )</span>
      </div>
      <div class="h-max-content d-flex g-gap-_3 a-items-center">
        <h5 class="margin-0 c-mode-2">Remaining:</h5>
        <span class="c-mode-1 f-weight-bold c-pallete-error-Error-50">( {{accountOrder.remaining}} )</span>
      </div>
      <div class="h-max-content d-flex g-gap-_3 a-items-center">
        <h5 class="margin-0 c-mode-2">Time in force:</h5>
        <span class="c-mode-1 f-weight-bold">( {{accountOrder.timeInForce}} )</span>
      </div>
    </div>
    <div class="h-max-content d-flex j-content-space-between b-top-ccc padding-top-05 f-weight-bold f-size-12">
      <span class="c-mode-1">{{accountOrder.type}}</span>
      <span class="c-mode-2">{{accountOrder.datetime}}</span>
    </div>
    <div class="d-flex j-content-flex-end m-top-1">
      <v-button-standard label="Cancel" class="bg-mode-2 c-mode-1" @click="this.$emit('cancel', accountOrder)"/>
    </div>
  </div>
</template>

<style scoped>

</style>