<template>
<div v-if="path || symbol" class="d-flex a-items-center">
  <img :src="path" :width="size" :height="size" alt="" v-if="path">
  <img :src="fdx" :width="size" :height="size" alt="" v-else-if="symbol.toLowerCase() === 'fdx'">
  <img :src="arb" :width="size" :height="size" alt="" v-else-if="symbol.toLowerCase() === 'arb'">
  <img :src="pol" :width="size" :height="size" alt="" v-else-if="symbol.toLowerCase() === 'pol'">
  <img :src="base" :width="size" :height="size" alt="" v-else-if="symbol.toLowerCase() === 'base'">
  <img :src="aoa" :width="size" :height="size" alt="" v-else-if="symbol.toLowerCase() === 'aoa'">
  <img :src="shib" :width="size" :height="size" alt="" v-else-if="symbol.toLowerCase() === 'shib'">
  <img :src="ton" :width="size" :height="size" alt="" v-else-if="symbol.toLowerCase() === 'ton'">

  <CryptoIcon :symbol="symbol" :size="size" v-else/>
</div>
</template>

<script>
import fdx from '@/assets/coins/fdx.svg';
import arb from '@/assets/coins/arb.svg';
import pol from '@/assets/coins/pol.svg'
import base from '@/assets/coins/base.svg'
import aoa from '@/assets/coins/aoa.svg'
import shib from '@/assets/coins/shib.svg'
import ton from '@/assets/coins/ton.svg'

import CryptoIcon from 'vue-cryptoicon/src/components/Cryptoicon.vue';
import {Eth, Btc, Xrp, Ltc,  Bnb, Usdt, Mona, Doge, Bch, Zec, Bsv, Btg, Ftc, Vtc, Ppc, Nmc, Grs, Dcr, Bcd, Btcp, Via, Btx, Dgb, Ada, Sol, Dot, Avax, Link, Matic, Xlm, Algo, Vet, Atom, Icp, Trx, Fil, Xmr, Eos, Aave, Xtz, Miota, Neo} from 'vue-cryptoicon/src/icons';

CryptoIcon.add([Eth, Btc, Xrp, Usdt, Ltc, Bnb, Usdt, Mona, Doge, Bch, Zec, Bsv, Btg, Ftc, Vtc, Ppc, Nmc, Grs, Dcr, Bcd, Btcp, Via, Btx, Dgb, Ada, Sol, Dot, Avax, Link, Matic, Xlm, Algo, Vet, Atom, Icp, Trx, Fil, Xmr, Eos, Aave, Xtz, Miota, Neo]);
export default {
  components: {
    CryptoIcon,
  },
  props: ['symbol', 'size', 'path'],
  data(){
    return{
      fdx,
      arb,
      pol,
      base,
      aoa,
      shib,
      ton,
    }
  }
}
</script>

<style scoped>

</style>
