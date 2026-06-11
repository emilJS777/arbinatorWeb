<script>
import BlockLoader from './v-block-loader.vue';
import SwitcherStandard from './v-switcher-standard.vue';
import CheckboxesStandard from './v-checkboxes-standard.vue';
import VCryptocoinIcon from "@/components/_general/v-cryptocoin-icon.vue";
// import { useToast } from 'vuestic-ui';
// const { init: notify } = useToast();

export default {
  components: {VCryptocoinIcon, CheckboxesStandard, BlockLoader, SwitcherStandard },
  props: [
    'gridTemplateColumns',
    'tableWidth',
    'tableMinWidth',
    'dataKeys',
    'dataLabels',
    'data',
    'changesFields',
    'loader',
    'editable',
    'buttons',
    'checkbox',
    'enableAlertMessage',
    'disableAlertMessage',
    'notSelectableIds',
    'notDeletableIds',
    'disableAlertTitle',
    'enableAlertTitle',
    'allowEnabled',
    'allowEnabledIgnoreIds',
    'fontSize',
  ],
  data() {
    return {
      selectedIds: [],
    };
  },
  // mounted() {
  //   console.log(this.disableAlertTitle, this.enableAlertTitle);
  // },
  computed: {
  },
  methods: {
    checked(ids, objId) {
      if (ids.length > 0) {
        this.selectedIds.push(objId);
      } else {
        const indexToRemove = this.selectedIds.indexOf(objId);
        this.selectedIds.splice(indexToRemove, 1);
      }
      this.$emit('selectedIds', this.selectedIds);
    },

    copyToClipboard(text) {
      navigator.clipboard
        .writeText(text)
        .then(() => {
          notify({ message: `Copied to clipboard: ${text}`, color: 'success' });
        })
        .catch((err) => {
          notify({ message: `Failed to copy: ${err}`, color: 'danger' });
        });
    },
  },
};
</script>

<template>
  <div
    :class="`m-top-03 table c-mode-1 d-grid padding-03 overflow-auto ${
      tableWidth === 'max-content ' ? 'w-max-content' : 'w-max'
    } ${this.tableMinWidth ? 'mb-1' : ''}}`"
  >
    <div
      class="thead d-grid gap-4 f-weight-500 p-3 b-bottom-table-line-2 padding-02"
      :style="
        this.gridTemplateColumns
          ? `grid-template-columns: ${this.gridTemplateColumns}; min-width: ${this.tableMinWidth}px; ${this.fontSize ? `font-size: ${this.fontSize-2+'px'};` : ''}`
          : `grid-template-columns: repeat(${this.dataLabels.length}, 1fr); min-width: ${this.tableMinWidth}px; ${this.fontSize ? `font-size: ${this.fontSize-2+'px'};` : ''}`
      "
    >
      <span v-if="this.checkbox"></span>
      <span v-for="label in dataLabels" :class="`no-wrap `">
        <span class="c-mode-2" v-if="label !== 'EDIT'">{{ label }}</span>
      </span>
    </div>
    <div :class="`tbody d-grid  w-max p-relative overflow-auto  ${this.tableMinWidth ? 'pb-5' : ''}`"  :style="`${this.fontSize ? `font-size: ${this.fontSize+'px'};` : ''} max-height: 400px;`">
      <div class="d-flex j-content-center a-items-center padding-1" v-if="loader"><BlockLoader /></div>
      <div
        class="d-grid gap-4 p-3 b-bottom-table-line a-items-center border-dark-2 padding-02 padding-top-05 padding-bottom-05"
        :style="
          this.gridTemplateColumns
            ? `grid-template-columns: ${this.gridTemplateColumns}; min-width: ${this.tableMinWidth}px`
            : `grid-template-columns: repeat(${this.dataLabels.length}, 1fr); min-width: ${this.tableMinWidth}px`
        "
        v-for="data in this.data"
      >
        <span v-if="this.checkbox" class="d-flex a-items-center j-content-center">
          <CheckboxesStandard
            :key="data.id"
            @select="(ids) => this.checked(ids, data.id)"
            :checkboxes="[data]"
            style="margin-bottom: 8px"
          />
        </span>

        <span
          v-for="key in this.dataKeys"
          :class="`${data[key] === false ? 'err-msg' : ''} ${key === 'enabled' ? '' : ''} cut-text o-hidden`"
          :title="data[key]"
        >

          <span
            v-if="this.changesFields && this.changesFields.filter((changeField) => changeField.key === key).length > 0"
          >
            <span v-for="changeField in this.changesFields">
              <span v-if="changeField.key === key">
                <span v-for="change in changeField.changes">
                  <span
                    v-if="data[key] === change.condition"
                    :title="change.value"
                    :class="`${change.colorClass ? change.colorClass : ''}`"
                    >{{ change.value }}</span
                  >
                </span>
              </span>
            </span>
          </span>
          <span v-else-if="key === 'enabled'" class="d-flex">
            <SwitcherStandard
                :disableAlertTitle="this.disableAlertTitle"
                :enableAlertTitle="this.enableAlertTitle"
                :disableAlertMessage="this.disableAlertMessage"
                :enableAlertMessage="this.enableAlertMessage"
              :disabled="
                !allowEnabled ||
                (this.allowEnabledIgnoreIds && this.allowEnabledIgnoreIds.includes(data.id))
              "
              :key="data.id"
              :first_await="true"
              @switch="
                (bool) => {
                  data[key] = bool;
                  this.$emit('update', data);
                }
              "
              :default_switch="data[key]"
            />
          </span>
          <span v-else-if="key === 'identityId'">
            <span class="inline-flex items-center gap-1">
              <span class="w-[calc(128px_-_32.1px)] overflow-hidden text-ellipsis">{{ data[key] }}</span>
              <span
                class="c-pointer c-content padding-03 d-flex a-items-center j-content-center bg-edit"
                style="padding: 5px"
                @click="copyToClipboard(data[key])"
              >
                <i class="fa-regular fa-copy"></i>
              </span>
            </span>
          </span>
          <span v-else-if="Object.keys(key)[0] === 'iconSymbol'">
            <span v-if="typeof Object.values(key)[0] === 'string'"><v-cryptocoin-icon :symbol="data[Object.values(key)[0]]" size="16"/></span>
            <span v-else-if="typeof Object.values(key)[0] === 'object'"><v-cryptocoin-icon size="16" :symbol="data[Object.keys(Object.values(key)[0])[0]][Object.values(Object.values(key)[0])[0]]"/></span>
          </span>
          <span v-else-if="Object.keys(key)[0] === 'icon_path' || key === 'icon_path'">
<!--            {{data[key]}}-->
            <span v-if="typeof data[key] === 'string'"><v-cryptocoin-icon :path="data[key]" size="18"/></span>
<!--            <span v-else-if="typeof data[key] === 'object'"><v-cryptocoin-icon size="16" :path="data[Object.keys(Object.values(key)[0])[0]][Object.values(Object.values(key)[0])[0]]"/></span>-->
            <span v-else-if="typeof Object.values(key)[0] === 'object'"><v-cryptocoin-icon size="17" :path="data[Object.keys(Object.values(key)[0])[0]][Object.values(Object.values(key)[0])[0]]"/></span>
          </span>
          <span v-else>

            <span
              :title="data[Object.keys(key)[0]][Object.values(key)[0]]"
              v-if="
                typeof key === 'object' &&
                data[Object.keys(key)[0]] &&
                typeof data[Object.keys(key)[0]] === 'object' &&
                !Array.isArray(data[Object.keys(key)[0]])
              "
              >{{ data[Object.keys(key)[0]][Object.values(key)[0]] }}</span
            >


            <span
              v-else-if="typeof key === 'object' && Array.isArray(data[Object.keys(key)[0]]) && key.inTable"
              class="d-grid"
            >
              <span v-if="data[Object.keys(key)[0]]?.length" v-for="obj in data[Object.keys(key)[0]]">{{
                obj.name
              }}</span>
              <span v-else>-</span>
            </span>
            <span
              v-else-if="typeof key === 'object' && Array.isArray(data[Object.keys(key)[0]])"
              class="c-pointer t-decoration-underline"
              @click="this.$emit('details', data[Object.keys(key)[0]])"
              >Details</span
            >
            <span v-else-if="key === 'blockNumber'" :class="`${data[key] === -1 ? 'err-msg' : 'c-success-50'}  `">{{
              data[key] === -1 ? 'Stopped' : data[key] || '-'
            }}</span>
            <span v-else>{{ data[key] || typeof data[key] === 'number' ? data[key] : '-' }}</span>
          </span>
        </span>

        <span class="g-gap-_5 d-flex j-content-flex-end f-size-11" v-if="buttons">
          <span v-for="button in buttons.filter(b => !b.ignoreIds?.includes(data.id))">
            <span
              v-if="!button.ignoreIds || !button.ignoreIds.find((id) => data.id === id)"
              :class="`c-pointer padding-03 d-flex a-items-center j-content-center ${button.className}`"
              style="padding: 5px"
              @click="this.$emit('buttonEmit', { emitName: button.emitName, emitData: data })"
              :title="button.title"
            >
              <i :class="button.iconName"></i>
            </span>
            <span v-else style="padding: 10px"></span>
          </span>
        </span>

        <span class="g-gap-_5 d-flex j-content-flex-end f-size-11" v-if="editable">
          <span
            class="c-pointer c-content padding-03 d-flex a-items-center j-content-center bg-edit"
            style="padding: 5px"
            @click="this.$emit('edit', data)"
          >
            <i class="fa-solid fa-pen"></i>
          </span>
          <span
            class="c-pointer bg-err-msg padding-03 err-msg d-flex a-items-center j-content-center bg-trash"
            style="padding: 5px"
            @click="this.$emit('delete', data.id)"
          >
            <i class="fa-regular fa-trash-can"></i>
          </span>
        </span>
      </div>
    </div>
  </div>
</template>

<style src="src/assets/main.css" scoped>

</style>
