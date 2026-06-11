<script>
import {mapState} from "vuex";
import VCryptocoinIcon from "@/components/_general/v-cryptocoin-icon.vue";

export default {
  components: {VCryptocoinIcon},
  props: ['orderBooks'],
  computed: {
    // ...mapState({
    //   orderBooks: state => state.orderBooks.ORDER_BOOKS,
    // }),
    pairsMinMaxPrices() {
      const result = {};

      // Проходим по биржам
      for (const exchange in this.orderBooks) {
        const exchangeData = this.orderBooks[exchange];

        // Проходим по парам внутри биржи
        for (const pair in exchangeData) {
          const pairData = exchangeData[pair];

          // Инициализация данных для пары
          if (!result[pair]) {
            result[pair] = {
              lowestSale: {
                price: Infinity,
                exchange: null,
                pair: pair,
                icon_path: null,
              },
              highestPurchase: {
                price: -Infinity,
                exchange: null,
                pair: pair,
                icon_path: null,
              },
            };
          }

          // Проверяем продажи
          if (pairData.sales && pairData.sales.length > 0) {
            const minSalePrice = Math.min(...pairData.sales.map(sale => sale.price));
            if (minSalePrice < result[pair].lowestSale.price) {
              result[pair].lowestSale = {
                price: minSalePrice,
                exchange,
                pair,
                icon_path: pairData.exchange_icon_path || null, // Используем exchange_icon_path
              };
            }
          }

          // Проверяем покупки
          if (pairData.purchases && pairData.purchases.length > 0) {
            const maxPurchasePrice = Math.max(...pairData.purchases.map(purchase => purchase.price));
            if (maxPurchasePrice > result[pair].highestPurchase.price) {
              result[pair].highestPurchase = {
                price: maxPurchasePrice,
                exchange,
                pair,
                icon_path: pairData.exchange_icon_path || null, // Используем exchange_icon_path
              };
            }
          }
        }
      }

      // Убираем Infinity и -Infinity для случаев отсутствия данных
      for (const pair in result) {
        if (result[pair].lowestSale.price === Infinity) {
          result[pair].lowestSale = null;
        }
        if (result[pair].highestPurchase.price === -Infinity) {
          result[pair].highestPurchase = null;
        }
      }

      return result;
    },
  }
}
</script>

<template>
  <div class="d-grid g-gap-1 m-top-1 grid-template-column-3fr">
    <div v-for="(data, pair) in pairsMinMaxPrices" :key="pair" class="bg-mode-2 b-radius-6 padding-1">
      <div class="d-flex a-items-center g-gap-_5">
        <div class="d-flex">
          <v-cryptocoin-icon :symbol="pair.split('/')[0]" size="30" style="margin-right: -10px; z-index: 1;"/>
          <v-cryptocoin-icon :symbol="pair.split('/')[1]" size="30"/>
        </div>
        <span class="c-mode-1 f-size-16 f-weight-bold">{{ pair }}</span>
      </div>
      <p v-if="data.lowestSale" class="d-flex a-items-center g-gap-1 c-mode-1 f-weight-bold">
        <span class="f-size-14"><span class="c-pallete-success-50">Sale</span> Min Price: {{ data.lowestSale.price }}</span>
        <span class="d-flex a-items-center g-gap-_5">
          <v-cryptocoin-icon :path="data.lowestSale.icon_path" size="20"/>
          <span class="f-size-16 f-weight-bold c-mode-2">{{ data.lowestSale.exchange }}</span>
        </span>
      </p>
      <p v-if="data.highestPurchase" class="d-flex a-items-center g-gap-1 c-mode-1 f-weight-bold">
        <span class="f-size-14"><span class="c-notification-warning">Purchases</span> Max Price: {{ data.highestPurchase.price }}</span>
        <span class="d-flex a-items-center g-gap-_5">
          <v-cryptocoin-icon :path="data.highestPurchase.icon_path" size="20"/>
          <span class="f-size-16 f-weight-bold c-mode-2">{{ data.highestPurchase.exchange }}</span>
        </span>
      </p>
    </div>
  </div>
</template>

<style scoped>

</style>