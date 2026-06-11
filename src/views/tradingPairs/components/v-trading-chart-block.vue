<script setup>
import { ref, onMounted } from 'vue';
import { Chart, CategoryScale, LinearScale, LineController, LineElement, PointElement, Title } from 'chart.js';

// Регистрация необходимых компонентов Chart.js
Chart.register(CategoryScale, LinearScale, LineController, LineElement, PointElement, Title);

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
        borderColor: 'rgba(66, 185, 131, 1)',
        backgroundColor: 'rgba(66, 185, 131, 0.3)',
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
};

onMounted(() => {
  createChart();
});
</script>

<template>
  <canvas ref="chartRef" style="width: 100%; height: 200px;"></canvas>
</template>
