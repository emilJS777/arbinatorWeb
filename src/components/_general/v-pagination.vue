<script>
import {VaButton, VaPagination, VaSelect} from "vuestic-ui";

export default {
  components: {VaPagination, VaButton, VaSelect},
  props: ['totalPages', 'totalRecords'],
  data() {
    return {
      perPage: 1,
      optionsPage: 10,
    };
  },
  mounted() {
    this.onPage(this.perPage);
  },
  methods: {
    onPage(page) {
      this.perPage = page;
      this.onPageSize(this.optionsPage);
    },
    onPageSize(pageSize) {
      this.optionsPage = pageSize;
      this.$emit('onPage', { currentPage: this.perPage, pageSize: this.optionsPage });
    },
  },
};
</script>

<template>
  <div class="flex flex-col-reverse md:flex-row gap-2 justify-between items-center py-2">
<!--    <div class="c-mode-1">-->
<!--&lt;!&ndash;      <b>{{ totalRecords }} results.</b>&ndash;&gt;-->
<!--&lt;!&ndash;      Results per page&ndash;&gt;-->
<!--      <VaSelect @update:modelValue="onPageSize" v-model="optionsPage" class="!w-20" :options="[10, 50, 100]" />-->
<!--    </div>-->

<!--    <div v-if="totalPages > 1" class="flex">-->
<!--      <VaButton-->
<!--        preset="secondary"-->
<!--        @click="this.onPage(this.perPage - 1)"-->
<!--        icon="va-arrow-left"-->
<!--        aria-label="Previous page"-->
<!--        :disabled="this.perPage === 1"-->
<!--      />-->
<!--      <VaButton-->
<!--        class="mr-2"-->
<!--        @click="this.onPage(this.perPage + 1)"-->
<!--        preset="secondary"-->
<!--        icon="va-arrow-right"-->
<!--        aria-label="Next page"-->
<!--        :disabled="this.perPage === totalPages"-->
<!--      />-->
<!--      <VaPagination-->
<!--        @update:modelValue="onPage"-->
<!--        v-model="perPage"-->
<!--        buttons-preset="secondary"-->
<!--        :pages="totalPages"-->
<!--        :visible-pages="optionsPage"-->
<!--        :boundary-links="false"-->
<!--        :direction-links="false"-->
<!--      />-->
<!--    </div>-->
  </div>
</template>

<style scoped src="src/assets/main.css"></style>
