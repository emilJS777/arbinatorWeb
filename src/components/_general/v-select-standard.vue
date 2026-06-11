<template>
  <div :class="`d-grid`">
    <label for="" class="f-weight-bold">{{ label }}</label>
    <span class="f-size-very-small">{{span}}</span>
    <select name="select" id="select" class="w-max-content form-standard" :style="`min-width: 130px;`" v-model="selectedItem" @change="onSelect">
      <option v-for="item in items" :key="item.id" :value="item[label_key]">
        {{item[label_key]}}
      </option>
    </select>
  </div>
</template>

<script>
import {mapState} from "vuex";

export default {
  props: ['label', 'items', 'span', 'selected', 'label_key'],

  data(){
    return{
      selectedItem: this.selected || null
    }
  },
  mounted() {
    if(this.selected)
      this.onSelect()
  },
  methods: {
    onSelect(){
      this.$emit('select', this.selectedItem)
    }
  }
}
</script>

<style scoped>
select {

  /* reset */

  margin: 0;
  -webkit-box-sizing: border-box;
  -moz-box-sizing: border-box;
  box-sizing: border-box;
  -webkit-appearance: none;
  -moz-appearance: none;

  background-image:
      linear-gradient(45deg, transparent 50%, #ffffff 50%),
      linear-gradient(135deg, #fafafa 50%, transparent 50%),
      linear-gradient(to right, #135DA4, #3b5873);
  background-position:
      calc(100% - 20px) calc(1em + 2px),
      calc(100% - 15px) calc(1em + 2px),
      100% 0;
  background-size:
      5px 5px,
      5px 5px,
      2.9em 2.5em;
  background-repeat: no-repeat;
}

select:focus {
  background-image:
      linear-gradient(45deg, white 50%, transparent 50%),
      linear-gradient(135deg, transparent 50%, white 50%),
      linear-gradient(to right, #135DA4, #5199de);

  background-position:
      calc(100% - 15px) 1em,
      calc(100% - 20px) 1em,
      100% 0;
  background-size:
      5px 5px,
      5px 5px,
      2.9em 2.5em;
  background-repeat: no-repeat;
  border-color: #3c8796;
  outline: 0;
}
</style>
