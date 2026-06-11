<template>
  <button :class="`button-standard ${this.svg || this.icon ? 'padding-1' : ''} outline-content padding-y-8p f-size-16 d-flex b-radius-8 border-0 a-items-center c-text-text-headeings j-content-center f-weight-500 g-gap-1 bg-fff ${this.button_class ? button_class : ''}`">
    <i v-if="icon" :class="icon"></i>
    {{svg}}
    {{label}}
  </button>
</template>

<script>
export default {
  props: ['label', 'svg', 'icon', 'button_class']
}
</script>

<style scoped>
button{
  text-align: center;
  cursor: pointer;
}
.button-standard{
  min-height: 44px;
  padding-left: 16px;
  padding-right: 16px;
  border-radius: 14px;
  background: linear-gradient(180deg, rgba(255,255,255,0.12), rgba(255,255,255,0.05));
  border: 1px solid rgba(255,255,255,0.08);
  color: inherit;
  box-shadow: 0 10px 24px rgba(0, 0, 0, 0.14);
  transition: transform .18s ease, box-shadow .18s ease, background .18s ease;
}
.button-standard:hover{
  transform: translateY(-1px);
  box-shadow: 0 14px 28px rgba(0, 0, 0, 0.18);
}
</style>
