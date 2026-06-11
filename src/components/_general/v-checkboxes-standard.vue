<template>

  <div class="d-grid">
    <label class="f-weight-bold f-size-12 f-weight-500 c-mode-1" style="margin-bottom: 6px;" >{{label}}</label>
    <span class="f-size-very-small">{{span}}</span>
    <div class="m-top-05 checkboxes d-grid l-height-1">
      <div v-for="checkbox in checkboxes" :key="checkbox.id">
        <label class="container d-flex">
          <span class="c-mode-3 f-size-15" v-if="this.label_key">{{checkbox[this.label_key]}}</span>
          <span class="c-mode-3 f-size-15" v-else>{{checkbox.title}}</span>
          <input type="checkbox" :checked="selected_item_ids_from_props !== null ? selected_item_ids_from_props.find(id => checkbox.id === id) : selected_ids.find(id => checkbox.id === id)" @change="onChange(checkbox)">
          <span class="checkmark outline-content"></span>
        </label>
      </div>
    </div>

  </div>

</template>

<script>
export default {
  props: ['checkboxes', 'label', 'span', 'checked', 'label_key', 'selected_item_ids'],
  data(){
    return{
      selected_ids: [],
      selected_item_ids_from_props: null
    }
  },
  mounted() {
    if(this.selected_item_ids){
      this.selected_item_ids.forEach(id => {
        this.selected_ids.push(id)
      })
    }
    this.sendEmit()
  },
  methods: {
    onChange(item){
      if(this.selected_ids.find(select_id => select_id === item.id))
        this.selected_ids.splice(this.selected_ids.indexOf(item.id), 1);

      else
        this.selected_ids.push(item.id)
      this.sendEmit()
    },
    sendEmit(){
      this.$emit('select', this.selected_ids)
    }
  }
}
</script>

<style scoped>
.container {
  display: block;
  position: relative;
  padding-left: 26px;
  margin-bottom: 12px;
  cursor: pointer;
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
  user-select: none;
}

/* Hide the browser's default checkbox */
.container input {
  position: absolute;
  opacity: 0;
  cursor: pointer;
  height: 0;
  width: 0;
}

/* Create a custom checkbox */
.checkmark {
  position: absolute;
  top: 0;
  left: 0;
  height: 18px;
  width: 18px;
  background-color: #eee;
}

/* On mouse-over, add a grey background color */
.container:hover input ~ .checkmark {
  background-color: #ccc;
}

/* When the checkbox is checked, add a blue background */
.container input:checked ~ .checkmark {
  background-color: #102fc8;
}

/* Create the checkmark/indicator (hidden when not checked) */
.checkmark:after {
  content: "";
  position: absolute;
  display: none;
}

/* Show the checkmark when checked */
.container input:checked ~ .checkmark:after {
  display: block;
}

/* Style the checkmark/indicator */
.container .checkmark:after {
  left: 5px;
  top: 2px;
  width: 5px;
  height: 8px;
  border: solid white;
  border-width: 0 3px 3px 0;
  -webkit-transform: rotate(45deg);
  -ms-transform: rotate(45deg);
  transform: rotate(45deg);
}
span{
  line-height: 1.2;
}
</style>
