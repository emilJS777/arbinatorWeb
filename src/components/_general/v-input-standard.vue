<template>
  <div class="d-grid w-max">
    <label class="f-weight-bold f-size-12 f-weight-500 c-mode-1" style="margin-bottom: 6px;" >{{label}}</label>
    <span :class="`f-size-very-small ${this.invalid_value ? 'err-msg' : ''}`">{{span}}</span>
    <form class="p-relative d-grid c-mode-3" @submit="e=>{e.preventDefault();submit();}">

      <span v-if="icon === 'fa fa-search'" class="p-absolute m-left-05 c-mode-icon-rested" style="margin-top: 12px; margin-left: 14px;">
           <svg width="20" height="20" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path fill-rule="evenodd" clip-rule="evenodd" d="M19.25 10.5C19.25 15.3325 15.3325 19.25 10.5 19.25C5.66751 19.25 1.75 15.3325 1.75 10.5C1.75 5.66751 5.66751 1.75 10.5 1.75C15.3325 1.75 19.25 5.66751 19.25 10.5ZM10.5 20.75C16.1609 20.75 20.75 16.1609 20.75 10.5C20.75 4.83908 16.1609 0.25 10.5 0.25C4.83908 0.25 0.25 4.83908 0.25 10.5C0.25 16.1609 4.83908 20.75 10.5 20.75ZM19.5303 18.4697C19.2374 18.1768 18.7626 18.1768 18.4697 18.4697C18.1768 18.7626 18.1768 19.2374 18.4697 19.5303L20.4696 21.5303C20.7625 21.8232 21.2374 21.8232 21.5303 21.5303C21.8232 21.2374 21.8232 20.7625 21.5303 20.4696L19.5303 18.4697Z" fill="#B9BFD5"/>
          </svg>
      </span>
      <span v-else-if="icon" class="p-absolute m-left-05" style="margin-top: 12px; margin-left: 14px;"><i :class="this.icon"></i></span>
      <input ref="inputField" @keydown="handleKeydown" :type="type" :disabled="disabled" min="0" :placeholder="placeholder" :style="`${this.icon ? 'padding-left: 45px;' : ''} ${this.size ? `width: ${size}%;` : ''} `" :class="` ${this.mode === 2 ? 'b-radius-40' : 'b-radius-8'}   bg-surface-surface-secondary border-secondary c-mode-1  c-mode-3-placeholder  outline-content w-webkit-fill-available form-standard bg-mode-4 f-size-14 f-weight-400 ${this.invalid_value ? 'err-border' : ''}`" v-model="value" @input="checkValidate">
    </form>
  </div>
</template>

<script>
export default {
  name: "v-input-normal",
  props: ['type', 'label', 'span', 'placeholder', 'default_value', 'input_class', 'validate', 'icon', 'mode', 'size', 'disabled', 'singleNumber'],
  data(){
    return{
      value: this.default_value || null,
      invalid_value: false
    }
  },

  methods: {
    submit(){
      document.activeElement.blur();
      this.$emit('submit')
    },
    onFocus(){
      this.$refs.inputField.focus();
    },
    onBlur() {
      this.$refs.inputField.blur();   // Remove focus
    },
    checkValidate(){
      if(this.singleNumber && this.value.toString().length > 1)
        this.value = Number(this.value.toString()[1])

      this.$emit('value', this.value)
      return this.invalid_value
    },
    setValue(value){
      this.value = value
    }
  }
}
</script>

<style scoped>
input{
  padding-right: 10px;
}

.err-border{
  border: 1px solid#a43506;
}
</style>
