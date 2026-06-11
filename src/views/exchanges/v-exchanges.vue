<script>
import VTableStandard from "@/components/_general/v-table-standard.vue";
import toggleMixin from "@/mixins/toggle-mixin.js";
import VEditForm from "@/components/_general/v-edit-form.vue";
import VInputNormal from "@/components/_general/v-input-standard.vue";
import VCheckboxesStandard from "@/components/_general/v-checkboxes-standard.vue";
import VConfirmModal from "@/components/_general/v-confirm-modal.vue";

export default {
  components: {VConfirmModal, VCheckboxesStandard, VInputNormal, VEditForm, VTableStandard},
  mixins: [toggleMixin],
  data() {
    return {
      dataLabels: ['#', '', 'TITLE', 'ENABLED'],
      dataKeys: ['id', 'icon_path', 'title', 'enabled'],
      tableData: [],
      blocks: {},
      form: null,
    }
  },


  mounted() {
    this.getData();
  },
  methods: {
    setDefaultForm(){
      this.form = {
        title: "",
        icon_path: "",
        index: 1,
        enabled: false,
        api_key: "",
        api_secret: "",
        password: "",
      }
    },
    getData(){
      this.tableData = [];
      this.$store.dispatch("exchanges/GET", ``).then(res=>{
        if(res.data.success)
          this.tableData = res.data.obj;
      })
    },
    create(){
      this.$store.dispatch("exchanges/POST", this.form).then(res=>{
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
      this.$store.dispatch("exchanges/PUT", {form: data ? data : this.form, id: id}).then(res=>{
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
      this.$store.dispatch("exchanges/DELETE", id).then(res => {
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
    <div class="page-heading">
      <p class="page-heading__eyebrow margin-0">Exchange Directory</p>
      <h2 class="c-mode-1 margin-0">Connect and manage your execution venues.</h2>
      <p class="page-heading__copy margin-0">Keep API credentials organized, enable only the venues you trust, and build a cleaner foundation for live arbitrage execution.</p>
    </div>

    <v-table-standard
        grid-template-columns="50px 40px minmax(220px, 1fr) 80px 140px"
        :editable="false"
        @delete="(data) => this.setModalName('deleteConfirm', data.id)"
        @edit="(data) => {this.setModalName('edit', data.id); this.form = JSON.parse(JSON.stringify(data))}"
        @update="(data) => this.update(data.id, data)"
        @add="this.setDefaultForm();setModalName('add')"
        enable-alert-title="Exchange activation ?"
        disable-alert-title="Exchange deactivation ?"
        :create-label="'Add Exchange'"
        table-width="max-content"
        :allowEnabled="true"
        :buttons="[
            {
                    iconName: 'fa-solid fa-pen',
                    emitName: 'edit',
                    className: 'bg-blue c-fff f-size-10',
                    title: 'View',
            },
            {
                    iconName: 'fa-regular fa-trash-can',
                    emitName: 'delete',
                    className: 'c-pointer bg-err-msg padding-03 err-msg d-flex a-items-center j-content-center bg-trash',
                    title: 'Delete',
            },
          ]"
        :data="this.tableData"
        :data-labels="this.dataLabels"
        :data-keys="this.dataKeys"
        :total-pages="1"
        :total-records="'Nan'"
    />
  </div>

  <v-edit-form title="Exchange Form" @save="this.modalName === 'add' ? this.create() : this.update(this.id)" @cancel="this.setModalName(false)" v-if="modalName === 'add' || modalName === 'edit'">
    <template #inputs>
      <v-input-normal label="Title *" @value="val => this.form.title = val" :default_value="this.form.title"/>
      <v-input-normal label="Icon path" @value="val => this.form.icon_path = val" :default_value="this.form.icon_path"/>
      <v-input-normal label="Index" type="number" @value="val => this.form.index = val" :default_value="this.form.index"/>
      <v-input-normal label="Api key"  @value="val => this.form.api_key = val" :default_value="this.form.api_key"/>
      <v-input-normal label="Api secret"  @value="val => this.form.api_secret = val" :default_value="this.form.api_secret"/>
      <v-input-normal label="Password"  @value="val => this.form.password = val" :default_value="this.form.password"/>

      <v-checkboxes-standard :selected_item_ids="this.form.enabled ? [1] : null" @select="ids => this.form.enabled = ids.length > 0" :checkboxes="[{id: 1, title: 'Enabled'}]" />
    </template>
  </v-edit-form>

  <v-confirm-modal title="Delete Exchange" msg="Do you really want to delete the exchange?" @close="this.setModalName(false)" @confirm="this.delete(this.id)" v-if="modalName === 'deleteConfirm'"/>
</template>

<style scoped>
.page-heading{
  display: grid;
  gap: 10px;
  margin-bottom: 14px;
}
.page-heading__eyebrow{
  color: #ffb86b;
  text-transform: uppercase;
  letter-spacing: .14em;
  font-size: 12px;
  font-weight: 700;
}
.page-heading__copy{
  max-width: 760px;
  color: #93a3c1;
  line-height: 1.6;
}
</style>
