<script>
import InputStandard from './v-input-standard.vue';
import ButtonStandard from './v-button-standard.vue';
import Pagination from './v-pagination.vue';
import BlockLoader from './v-block-loader.vue';
import toggleMixin from '../../mixins/toggle-mixin.js';
import deviceMixin from '../../mixins/device-mixin.js';
import TableDefault from './v-table-default.vue';
import SelectStandard from './v-select-standard.vue';

export default {
  components: {
    SelectStandard,
    TableDefault,
    BlockLoader,
    Pagination,
    ButtonStandard,
    InputStandard,
  },
  props: [
    'tableWidth',
    'tableMinWidth',
    'data',
    'dataKeys',
    'dataLabels',
    'createLabel',
    'pageSize',
    'totalPages',
    'totalRecords',
    'currentPage',
    'changesFields',
    'loader',
    'editable',
    'buttons',
    'checkbox',
    'enableAlertMessage',
    'disableAlertMessage',
    'notSelectableIds',
    'notDeletableIds',
    'enableAlertTitle',
    'disableAlertTitle',
    'allowEnabled',
    'allowEnabledIgnoreIds',
    'gridTemplateColumns',
    'searchable',
     'fontSize'
  ],
  mixins: [toggleMixin, deviceMixin],
  data() {
    return {
      search: '',
      paginate: null,
      findedBySearch: [],
    };
  },
  mounted() {
    this.setModalName(true);
  },
  methods: {
    onPage(paginate) {
      this.paginate = paginate;
      this.paginate.search = this.search;
      this.$emit('onPage', this.paginate);
    },
    onSearch(search) {
      this.search = search;
      this.$emit('search', search);
    },
    filterArrayByText(array, searchText) {
      return array.filter((obj) =>
        Object.values(obj).some((value) => value.toString().toLowerCase().includes(searchText.toLowerCase())),
      );
    },
  },
};
</script>

<template>
  <div class="bg-mode-content-table c-mode-4 padding-1 b-radius-6 m-top-1">
    <div :class="`${this.mobileDevice ? 'd-grid g-gap-_5' : 'd-flex j-content-space-between a-items-flex-end'}`">
      <div class="d-flex a-items-flex-end g-gap-1">
        <div class="d-flex a-items-center g-gap-1">
<!--          <InputStandard class="" icon="fa fa-search" placeholder="Search" @value="onSearch" v-if="searchable !== false"/>-->
          <slot name="left"></slot>
        </div>
      </div>
      <div class="d-flex a-items-center g-gap-1">
        <slot name="right"></slot>
        <ButtonStandard
          v-if="createLabel"
          :label="this.createLabel"
          class="bg-content c-mode-5"
          @click="this.$emit('add')"
        />
      </div>
    </div>

    <TableDefault
      :fontSize="this.fontSize"
      :grid-template-columns="gridTemplateColumns"
      :table-min-width="this.tableMinWidth"
      @details="(detailsData) => this.$emit('details', detailsData)"
      @edit="(editData) => this.$emit('edit', editData)"
      @delete="(dataId) => this.$emit('delete', dataId)"
      @update="(updateData) => this.$emit('update', updateData)"
      @buttonEmit="(e) => this.$emit(e.emitName, e.emitData)"
      @selectedIds="(selectedIds) => this.$emit('selectedIds', selectedIds)"
      :allowEnabled="this.allowEnabled"
      :allowEnabledIgnoreIds="this.allowEnabledIgnoreIds"
      :disableAlertTitle="this.disableAlertTitle"
      :enableAlertTitle="this.enableAlertTitle"
      :disableAlertMessage="this.disableAlertMessage"
      :enableAlertMessage="this.enableAlertMessage"
      :not-deletable-ids="notDeletableIds"
      :not-selectable-ids="notSelectableIds"
      :checkbox="checkbox"
      :buttons="this.buttons"
      :data-keys="dataKeys"
      :data-labels="dataLabels"
      :data="data"
      :loader="loader"
      :changes-fields="changesFields"
      :table-width="tableWidth"
      :editable="this.editable === undefined ? true : this.editable"
    />

    <Pagination v-if="modalName" @onPage="this.onPage" :totalPages="totalPages" :totalRecords="totalRecords" />
  </div>
</template>

<!--        <div class="d-flex j-content-center p-relative b-bottom-table-line padding-08 w-max" style="flex-grow: 1;">-->
<!--          <span class="f-size-14 c-mode-2">No items</span>-->
<!--          <BlockLoader class="p-absolute absolute-center"/>-->
<!--        </div>-->

<style src="src/assets/main.css" scoped></style>
