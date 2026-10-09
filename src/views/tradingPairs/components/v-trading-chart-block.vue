<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue';
import { Chart, CategoryScale, LinearScale, LineController, LineElement, PointElement, Title, Tooltip } from 'chart.js';
import {applyChartPalette, chartPalette} from '@/utils/chartTheme.js';

// Регистрация необходимых компонентов Chart.js
Chart.register(CategoryScale, LinearScale, LineController, LineElement, PointElement, Title, Tooltip);

const props = defineProps({
  trades: {
    type: Array,
    default: () => [],
  },
});

const chartRef = ref(null);
let chartInstance = null;

const createChart = () => {
  if (chartInstance) chartInstance.destroy(); // Удаляем предыдущий график, если он существует

  const ctx = chartRef.value.getContext('2d');
  const data = {
    labels: props.trades.map((trade) =>
        new Date(parseInt(trade.timestamp)).toLocaleTimeString()
    ),
    datasets: [
      {
        label: 'Price',
        data: props.trades.map((trade) => trade.price),
        borderColor: chartPalette().line,
        backgroundColor: chartPalette().fill,
        fill: true,
        tension: 0.4, // Для сглаживания линий
      },
    ],
  };

  chartInstance = new Chart(ctx, {
    type: 'line',
    data: data,
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        title: {
          display: true,
          text: 'Trading Price',
        },
      },
    },
  });
  refreshTheme();
};

const refreshTheme = () => {if (chartInstance) applyChartPalette(chartInstance, chartPalette());};

onMounted(() => {
  createChart();
  window.addEventListener('arbinator:theme-change', refreshTheme);
});
onBeforeUnmount(() => {window.removeEventListener('arbinator:theme-change', refreshTheme); chartInstance?.destroy();});
</script>

<template>
  <canvas ref="chartRef" style="width: 100%; height: 200px;"></canvas>
</template>
