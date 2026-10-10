// Informational base-size estimate, never an execution or sizing instruction.
export function executionPreview(config = {}) {
  const keys = ['base_margin_usdt', 'leverage', 'take_profit_percent_of_margin', 'stop_loss_percent_of_margin'];
  const feeKey = config.execution_mode === 'live' ? 'live_fee_filter_taker_fee_percent' : 'paper_taker_fee_percent';
  if ([...keys, feeKey].some(key => config[key] == null || config[key] === '' || !Number.isFinite(Number(config[key])) || Number(config[key]) < 0)) return null;
  const margin = Number(config.base_margin_usdt);
  const notional = margin * Number(config.leverage);
  const tp = margin * Number(config.take_profit_percent_of_margin) / 100;
  const sl = margin * Number(config.stop_loss_percent_of_margin) / 100;
  const fees = 2 * notional * Number(config[feeKey]) / 100;
  const netTp = tp - fees;
  const netSl = -sl - fees;
  const breakEvenWinRate = netTp > 0 ? 100 * (-netSl) / (netTp - netSl) : null;
  const lossLimitsExceedEquity = ['max_daily_loss_usdt', 'max_total_loss_usdt'].some(key => Number(config[key]) > Number(config.paper_equity_usdt));
  return {notional, tp, sl, fees, netTp, netSl, breakEvenWinRate, lossLimitsExceedEquity, belowCosts: tp < fees};
}
