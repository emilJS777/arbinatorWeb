<script>

import VInputNormal from "@/components/_general/v-input-standard.vue";
export default {
  components: {VInputNormal},
  data(){
    return {
      password: "",
      regex: /^(?=.*[a-zA-Z])(?=.*\d)(?=.*[\W_])[a-zA-Z\d\W_]{8,}$/

    }
  },
  mounted() {
    // this.$refs["inputField"][0].onFocus()
  },
  methods: {
    onInput(val){
      this.password = val;
      if(this.regex.test(this.password))
        this.$emit('value', this.password)
      else
        this.$emit('value', false)
    }
  }
}
</script>

<template>
  <form class="d-flex a-items-center j-content-center">
    <v-input-normal ref="inputField" @value="val => this.onInput(val)" type="password"/>
  </form>
<!--  <form class="d-flex a-items-center j-content-center" @submit="this.$emit('value', this.password.join(''))">-->
<!--    <v-input-normal ref="inputField" v-for="(symbol, index) in password" @value="val => this.onInput(val.toString(), index)" :singleNumber="true" type="number" size="25"/>-->
<!--  </form>-->
</template>

<style scoped>

</style>
