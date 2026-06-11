<script>
export default {
  props: ['label', 'type', 'default_value'],
  data(){
    return{
      value: this.default_value || null,
      invalid_value: false
    }
  },
  methods:{
    closeBlur(){
      document.activeElement.blur();
    },
    setValue(value){
      this.value = value
    },
    checkValidate(){
      this.$emit('value', this.value)
      return this.invalid_value
    },
  },

}
</script>

<template>
  <form @submit="e => {e.preventDefault();closeBlur()}" class="d-grid a-items-center g-gap-_8 j-content-center" style="grid-template-columns: .7fr 1fr">
    <div class="d-flex j-content-flex-end a-items-center">
      <span class="c-mode-2"></span>
      <input  v-model="value" @input="checkValidate" :type="this.type ? this.type : 'text'" :class="`${this.value.toString().length > 8 ? 'f-size-18' : 'f-size-28'} f-weight-700 bg-initial border-0 outline-none c-mode-1 t-right`" autofocus  style="width: 130px;" value="0" min="0">
    </div>
    <div>
      <span class="f-size-28 f-weight-700 c-text-text-disabled">{{ this.label }}</span>
    </div>
  </form>
</template>

<style scoped>

</style>
