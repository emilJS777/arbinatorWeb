export function chartPalette(root = document.documentElement) {
  const styles = getComputedStyle(root);
  const read = name => styles.getPropertyValue(name).trim();
  return {line: read('--chart-line'), fill: read('--chart-fill'), grid: read('--chart-grid'), label: read('--chart-label'), surface: read('--surface-raised'), text: read('--text-primary'), border: read('--border-strong')};
}

export function applyChartPalette(chart, palette) {
  chart.data.datasets.forEach(dataset => {dataset.borderColor = palette.line; dataset.backgroundColor = palette.fill;});
  chart.options.color = palette.label;
  chart.options.scales = {x: {ticks: {color: palette.label}, grid: {color: palette.grid}}, y: {ticks: {color: palette.label}, grid: {color: palette.grid}}};
  chart.options.plugins.title.color = palette.text;
  chart.options.plugins.tooltip = {backgroundColor: palette.surface, titleColor: palette.text, bodyColor: palette.text, borderColor: palette.border, borderWidth: 1};
  chart.update('none');
}
