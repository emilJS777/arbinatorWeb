<script>
import {mapState} from "vuex";

export default {
  props: ['page', 'wallet', 'outline', 'back'],
  computed: mapState({
    wallet: state => state.wallet.WALLET,
  }),
  data(){
    return{
      active_coin_index: 0,
    }
  },
  methods: {
    goBack(){
      this.$router.go(-1)
    }
  }
}
</script>

<template>
  <div :class="`d-flex j-content-space-between a-items-center padding-1 ${!this.outline ? 'bg-surface-surface-tertiary' : ''}`" v-if="wallet">
    <div class="d-flex a-items-center g-gap-_5" @click="goBack">
      <div class="c-mode-icon-rested d-flex a-items-center">
<!--        Back icon-->
        <svg width="6" height="12" viewBox="0 0 6 12" fill="none" xmlns="http://www.w3.org/2000/svg" v-if="back" class="padding-03">
          <path fill-rule="evenodd" clip-rule="evenodd" d="M5.46849 0.414468C5.79194 0.673225 5.84438 1.14519 5.58562 1.46864L1.96044 6.00012L5.58562 10.5316C5.84438 10.855 5.79194 11.327 5.46849 11.5858C5.14505 11.8445 4.67308 11.7921 4.41432 11.4686L0.414321 6.46864C0.195189 6.19473 0.195189 5.80551 0.414321 5.5316L4.41432 0.531598C4.67308 0.208151 5.14505 0.15571 5.46849 0.414468Z" fill="#B9BFD5"/>
        </svg>
<!--        Close icon-->
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" v-else>
          <path fill-rule="evenodd" clip-rule="evenodd" d="M6.26399 6.26399C6.61598 5.912 7.18666 5.912 7.53865 6.26399L12 10.7253L16.4613 6.26405C16.8133 5.91207 17.384 5.91207 17.7359 6.26405C18.0879 6.61604 18.0879 7.18673 17.7359 7.53872L13.2747 12L17.7359 16.4613C18.0879 16.8133 18.0879 17.384 17.7359 17.7359C17.384 18.0879 16.8133 18.0879 16.4613 17.7359L12 13.2747L7.53865 17.736C7.18666 18.088 6.61598 18.088 6.26399 17.736C5.912 17.384 5.912 16.8133 6.26399 16.4613L10.7253 12L6.26399 7.53865C5.912 7.18666 5.912 6.61598 6.26399 6.26399Z" fill="#B9BFD5"/>
        </svg>
      </div>
      <h3 class="margin-0 d-flex a-items-center j-content-space-between f-size-18 f-weight-500 c-mode-1">{{ page }}</h3>
    </div>

    <div class="d-flex a-items-center g-gap-_3" v-if="wallet">
      <span class="d-flex a-items-center c-mode-icon-rested">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path fill-rule="evenodd" clip-rule="evenodd" d="M22.75 7C22.75 4.37665 20.6234 2.25 18 2.25H6C3.37665 2.25 1.25 4.37665 1.25 7V17C1.25 19.6234 3.37665 21.75 6 21.75H18C20.6234 21.75 22.75 19.6234 22.75 17V7ZM18 3.75C19.7949 3.75 21.25 5.20507 21.25 7V17C21.25 18.7949 19.7949 20.25 18 20.25H6C4.20507 20.25 2.75 18.7949 2.75 17V7C2.75 5.20507 4.20507 3.75 6 3.75H18Z" fill="#B9BFD5"/>
          <path fill-rule="evenodd" clip-rule="evenodd" d="M8.75 12C8.75 9.92893 7.07107 8.25 5 8.25H2C1.58579 8.25 1.25 8.58579 1.25 9V15C1.25 15.4142 1.58579 15.75 2 15.75H5C7.07107 15.75 8.75 14.0711 8.75 12ZM5 9.75C6.24264 9.75 7.25 10.7574 7.25 12C7.25 13.2426 6.24264 14.25 5 14.25H2.75V9.75H5Z" fill="#B9BFD5"/>
        </svg>
      </span>
      <span class="c-pallete-primary-primary-20 f-weight-500">0</span>
    </div>
  </div>
</template>

<style scoped>

</style>
