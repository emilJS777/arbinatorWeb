<script>
import {mapState} from "vuex";
import VAccountOrder from "@/views/accountOrders/components/v-account-order.vue";
import toggleMixin from "@/mixins/toggle-mixin.js";
import VConfirmModal from "@/components/_general/v-confirm-modal.vue";

export default {
  components: {VConfirmModal, VAccountOrder},
  mixins: [toggleMixin],
  computed: {
    ...mapState({
      accountActiveOrders: state => state.accountOrders.ACCOUNT_ACTIVE_ORDERS,
    }),

    flattenAccountOrders() {
      return Object.values(this.accountActiveOrders) // по биржам
          .map(pairs => Object.values(pairs).flat())  // по парам
          .flat(); // финальное объединение
    }
  },
  methods: {
    cancelOrder(exchange_id, order_id, pair){
      this.emitter.emit('loader', true)
      this.setModalName(false)
      this.$store.dispatch("accountOrders/DELETE", `?exchange_id=${exchange_id}&order_id=${order_id}&pair=${pair}`).then(data => {
        if(data.response.data.success){
          this.emitter.emit('toster', {success: true, msg: 'Order canceled'})
        }
        else{
          this.emitter.emit('toster', {success: false, msg: data.response.data.obj.msg})
        }
      }).finally(() => this.emitter.emit('loader', false))
    }
  }
}
</script>

<template>
  <div class="d-grid grid-template-column-3fr g-gap-1">
    <v-account-order
        v-for="(order, index) in flattenAccountOrders"
        :key="index"
        :accountOrder="order"
        @cancel="canceledOrder => this.setModalName('cancelOrderConfirm', canceledOrder.id, canceledOrder)"
        class="animation-from-hidden"
    />
  </div>


<!--  CONFIRM MODAL-->
  <v-confirm-modal @confirm="this.cancelOrder(this.obj.exchange_id, this.obj.id, this.obj.pair)"
                   @close="this.setModalName(false)"
                   title="Cancel order?"
                   msg="are your sure ?"
                   ok-label="CONFIRM"
                   v-if="modalName === 'cancelOrderConfirm'"/>
</template>

<style scoped>

</style>