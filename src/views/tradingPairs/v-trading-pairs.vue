<script>
import VTableStandard from "@/components/_general/v-table-standard.vue";
import toggleMixin from "@/mixins/toggle-mixin.js";
import VEditForm from "@/components/_general/v-edit-form.vue";
import VInputNormal from "@/components/_general/v-input-standard.vue";
import VCheckboxesStandard from "@/components/_general/v-checkboxes-standard.vue";
import VConfirmModal from "@/components/_general/v-confirm-modal.vue";
import VSelectMini from "@/components/_general/v-select-mini.vue";
import {mapState} from "vuex";
import VTradingPairBlock from "@/views/tradingPairs/components/v-trading-pair-block.vue";
import VButtonStandard from "@/components/_general/v-button-standard.vue";
import VCryptocoinIcon from "@/components/_general/v-cryptocoin-icon.vue";
import VMinMaxPricesBlock from "@/views/tradingPairs/components/v-min-max-prices-block.vue";
import { getResponseMessage, isResponseSuccess } from "@/store/request.js";

export default {
  components: {
    VMinMaxPricesBlock,
    VCryptocoinIcon,
    VButtonStandard,
    VTradingPairBlock,
    VSelectMini, VConfirmModal, VCheckboxesStandard, VInputNormal, VEditForm, VTableStandard},
  mixins: [toggleMixin],
  computed: {
    ...mapState({
      tableData: state => state.tradingPairs.TRADING_PAIRS,
      orderBooks: state => state.orderBooks.ORDER_BOOKS,
    }),
  },
  data() {
    return {
      dataLabels: ['#', '', 'EXCHANGE', 'PAIR', 'ORDER LIMIT', 'MAX PURCHASE PRICE', '', 'B/TOTAL', 'B/FREE', 'B/USED', '', 'Q/TOTAL', 'Q/FREE', 'Q/USED', 'ENABLED'],
      dataKeys: ['id', {icon_path: {exchange: 'icon_path'}}, {'exchange': 'title'}, 'pair', 'order_limit', 'max_purchase_price', {'iconSymbol': 'base_symbol'}, 'total_base', 'free_base', 'used_base', {'iconSymbol': 'quote_symbol'}, 'total_quote', 'free_quote', 'used_quote', 'enabled'],
      exchanges: null,
      blocks: {},
      form: null,
      orderForm: null,
    }
  },


  mounted() {
    // this.getData();
    this.getExchanges();


  },
  methods: {

    setDefaultForm(type=null, pair=null, exchange_id=null){
      this.orderForm = {
        amount: 0,
        price: 0,
        pair: pair,
        exchange_id: exchange_id,
        type: type
      };

      this.form = {
        pair: "",
        icon_path: "",
        order_limit: 50,
        max_purchase_price: null,
        exchange_id: null,
        index: 1,
        enabled: false
      }
    },
    onOrder(){
      this.emitter.emit('loader', true)
      this.setModalName(false)
      this.$store.dispatch("accountOrders/POST", this.orderForm).then(res => {
        if(isResponseSuccess(res))
          this.emitter.emit('toster', {success: true, msg: 'Order created!'})
        else
          this.emitter.emit('toster', {success: false, msg: getResponseMessage(res)})
      }).finally(() => this.emitter.emit('loader', false))
    },
    getData(){
      this.$store.commit("tradingPairs/SET_TRADING_PAIRS", null)
      this.$store.dispatch("tradingPairs/GET", ``).then(res=>{
        if(res.data.success) {
          this.$store.commit("tradingPairs/SET_TRADING_PAIRS", res.data.obj)
        }
      })
    },
    getExchanges(){
      this.exchanges = null;
      this.$store.dispatch("exchanges/GET", ``).then(res=>{
        if(res.data.success)
          this.exchanges = res.data.obj;
      })
    },
    create(){
      this.$store.dispatch("tradingPairs/POST", this.form).then(res=>{
        if(res.data.success) {
          this.setModalName(false)
          this.emitter.emit('toster', {success: true, msg: 'Created!'})
          this.getData()
        }
        else
          this.emitter.emit('toster', {success: false, msg: res.message})
      })
    },
    update(id, data=null){
      this.$store.dispatch("tradingPairs/PUT", {form: data ? data : this.form, id: id}).then(res=>{
        if(res.data.success) {
          this.setModalName(false)
          this.emitter.emit('toster', {success: true, msg: 'Updated!'})
          this.getData()
        }
        else
          this.emitter.emit('toster', {success: false, msg: res.message})
      })
    },
    delete(id){
      this.$store.dispatch("tradingPairs/DELETE", id).then(res => {
        if(res.data.success) {
          this.getData()
          this.emitter.emit('toster', {success: true, msg: 'Deleted!'})
        }
        else
          this.emitter.emit('toster', {success: false, msg: res.response.data})
        this.setModalName(false)
      })
    },
  }
}
</script>

<template>
  <div class="w-max animation-from-hidden-long">
    <h2 class="c-mode-1 margin-0 t-center">Trading Pairs</h2>

    <v-min-max-prices-block :order-books="orderBooks"/>

    <div class="d-grid grid-template-column-2fr g-gap-1 m-top-1">
      <v-trading-pair-block
          @delete="(deletedData) => this.setModalName('deleteConfirm', deletedData.id)"
          @buy="buyData => {this.setDefaultForm('buy', buyData.pair, buyData.exchange.id);this.setModalName('orderForm', '', buyData)}"
          @sell="sellData => {this.setDefaultForm('sell', sellData.pair, sellData.exchange.id);this.setModalName('orderForm', '', sellData)}"
          @edit="(editableData) => {this.setModalName('edit', editableData.id); this.form = JSON.parse(JSON.stringify(editableData))}"
          :trading-pair="data"
          v-for="(data, index) in tableData"
          :key="index"/>

      <v-button-standard label="ADD" icon="fa fa-plus" class="bg-mode-2 c-mode-1" @click="this.setDefaultForm();setModalName('add')"/>
    </div>
  </div>

  <v-edit-form title="Trading Pair Form" @save="this.modalName === 'add' ? this.create() : this.update(this.id)" @cancel="this.setModalName(false)" v-if="modalName === 'add' || modalName === 'edit'">
    <template #inputs>
      <v-input-normal label="Pair *" @value="val => this.form.pair = val" :default_value="this.form.pair"/>
      <v-input-normal label="Order limit *" type="number" @value="val => this.form.order_limit = val" :default_value="this.form.order_limit"/>
      <v-input-normal label="Index" type="number" @value="val => this.form.index = val" :default_value="this.form.index"/>
      <v-input-normal label="Max purchase price" type="number" @value="val => this.form.max_purchase_price = val" :default_value="this.form.max_purchase_price"/>
      <v-select-mini :items="this.exchanges" label="Exchange *" icon_path_key="icon_path" label_key="title" :standard="true" modal_title="Exchanges" :active_index="this.modalName === 'add' ? 0 : this.exchanges.findIndex(n => n.id === this.form.exchange_id)" @select="item => this.form.exchange_id = item.item.id"/>

      <v-checkboxes-standard :selected_item_ids="this.form.enabled ? [1] : null" @select="ids => this.form.enabled = ids.length > 0" :checkboxes="[{id: 1, title: 'Enabled'}]" />
    </template>
  </v-edit-form>


  <v-edit-form title="Order Form" save-label="Submit" @save="this.onOrder()" @cancel="this.setModalName(false)" v-if="modalName === 'orderForm'">
    <template #inputs>
      <v-input-normal label="Amount *" type="number" @value="val => this.orderForm.amount = val" :default_value="this.orderForm.amount"/>
      <v-input-normal label="Price *" type="number" @value="val => this.orderForm.price = val" :default_value="this.orderForm.price"/>
      <v-input-normal label="Type *" :disabled="true" @value="val => this.orderForm.type = val" :default_value="this.orderForm.type"/>
      <v-input-normal label="Exchange Id*" :disabled="true" @value="val => this.orderForm.exchange = val" :default_value="this.obj.exchange.id"/>
      <v-input-normal label="Pair *" :disabled="true" @value="val => this.orderForm.pair = val" :default_value="this.obj.pair"/>


<!--      <v-input-normal label="Order limit *" type="number" @value="val => this.form.order_limit = val" :default_value="this.form.order_limit"/>-->
<!--      <v-input-normal label="Icon path" @value="val => this.form.icon_path = val" :default_value="this.form.icon_path"/>-->
<!--      <v-input-normal label="Index" type="number" @value="val => this.form.index = val" :default_value="this.form.index"/>-->
<!--      <v-input-normal label="Max purchase price" type="number" @value="val => this.form.max_purchase_price = val" :default_value="this.form.max_purchase_price"/>-->
<!--      <v-select-mini :items="this.exchanges" label="Exchange *" icon_path_key="icon_path" label_key="title" :standard="true" modal_title="Exchanges" :active_index="this.modalName === 'add' ? 0 : this.exchanges.findIndex(n => n.id === this.form.exchange_id)" @select="item => this.form.exchange_id = item.item.id"/>-->
    </template>
  </v-edit-form>

  <v-confirm-modal title="Delete Trading Pair" msg="Do you really want to delete the trading pair?" @close="this.setModalName(false)" @confirm="this.delete(this.id)" v-if="modalName === 'deleteConfirm'"/>
</template>

<style scoped>

</style>
