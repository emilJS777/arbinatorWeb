import { normalizeArray, normalizeObjectValues } from "../../utils/safePayload.js";

const toNumber = (value) => {
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
};

const buildTradingPairIndex = (tradingPairs = []) => {
    const index = {};

    for (const tradingPair of normalizeArray(tradingPairs)) {
        const exchangeTitle = tradingPair?.exchange?.title;
        const pair = tradingPair?.pair;

        if (!exchangeTitle || !pair) {
            continue;
        }

        index[`${exchangeTitle}::${pair}`] = {
            freeBase: toNumber(tradingPair.free_base),
            freeQuote: toNumber(tradingPair.free_quote),
            maxPurchasePrice: toNumber(tradingPair.max_purchase_price),
            enabled: Boolean(tradingPair.enabled),
        };
    }

    return index;
};

export const findArbitrageOpportunities = (orderBooks, tradingPairs = []) => {
    const result = [];
    const pairs = {};
    const pairLimits = {};
    const tradingPairIndex = buildTradingPairIndex(tradingPairs);
    const orderBookEntries = Array.isArray(orderBooks)
        ? orderBooks.map((item, index) => [item?.exchange || index, item?.pairs || item])
        : Object.entries(orderBooks && typeof orderBooks === "object" ? orderBooks : {});

    for (const [exchange, pairsObj] of orderBookEntries) {
        const pairEntries = Array.isArray(pairsObj)
            ? normalizeObjectValues(pairsObj).map(item => [item?.pair, item])
            : Object.entries(pairsObj && typeof pairsObj === "object" ? pairsObj : {});
        for (const [pair, data] of pairEntries) {
            if (!pair || !data || typeof data !== "object") continue;
            const {
                purchaseHighPrice,
                saleLowPrice,
                exchange_icon_path,
                pair_max_purchase_price,
            } = data;

            if (!purchaseHighPrice || !saleLowPrice) {
                continue;
            }

            if (!pairs[pair]) {
                pairs[pair] = [];
                pairLimits[pair] = pair_max_purchase_price ?? null;
            }

            pairs[pair].push({
                exchange,
                icon: exchange_icon_path,
                buy: saleLowPrice,
                sell: purchaseHighPrice,
                buyTradingPair: tradingPairIndex[`${exchange}::${pair}`] || null,
            });
        }
    }

    for (const [pair, exchanges] of Object.entries(pairs)) {
        const maxLimit = pairLimits[pair];

        for (const buyExchange of exchanges) {
            for (const sellExchange of exchanges) {
                if (buyExchange.exchange === sellExchange.exchange) continue;

                const amount = Math.min(
                    buyExchange.buy.amount,
                    sellExchange.sell.amount,
                );

                if (!amount) {
                    continue;
                }

                const sellTradingPair = tradingPairIndex[`${sellExchange.exchange}::${pair}`] || null;
                const quoteBalance = buyExchange.buyTradingPair?.freeQuote;
                const baseBalance = sellTradingPair?.freeBase;
                const maxLimit = pairLimits[pair];
                const limitedByQuoteBalance = quoteBalance !== null ? quoteBalance / buyExchange.buy.price : null;
                const limitedByBaseBalance = baseBalance ?? null;

                let executableAmount = amount;

                if (limitedByQuoteBalance !== null) {
                    executableAmount = Math.min(executableAmount, limitedByQuoteBalance);
                }

                if (limitedByBaseBalance !== null) {
                    executableAmount = Math.min(executableAmount, limitedByBaseBalance);
                }

                if (maxLimit !== null) {
                    executableAmount = Math.min(executableAmount, maxLimit / buyExchange.buy.price);
                }

                executableAmount = Number(executableAmount.toFixed(8));

                if (executableAmount <= 0) {
                    continue;
                }

                const buyTotal = buyExchange.buy.price * executableAmount;
                const buyCommissionRate = amount ? (buyExchange.buy.commission ?? 0) / amount : 0;
                const buyCommission = buyCommissionRate * executableAmount;
                const totalBuyCost = buyTotal + buyCommission;

                const sellTotal = sellExchange.sell.price * executableAmount;
                const sellCommissionRate = amount ? (sellExchange.sell.commission ?? 0) / amount : 0;
                const sellCommission = sellCommissionRate * executableAmount;
                const totalSellRevenue = sellTotal - sellCommission;

                const profitTotal = totalSellRevenue - totalBuyCost;
                const profit = profitTotal / executableAmount;
                const roi = totalBuyCost ? (profitTotal / totalBuyCost) * 100 : 0;
                const spread = sellExchange.sell.price - buyExchange.buy.price;
                const balanceLimited = executableAmount < amount;
                const enabled = Boolean(buyExchange.buyTradingPair?.enabled) && Boolean(sellTradingPair?.enabled);

                if (maxLimit !== null && totalBuyCost > maxLimit) continue;
                if (profitTotal <= 0) continue;

                result.push({
                    pair,
                    buyFrom: buyExchange.exchange,
                    buyPrice: buyExchange.buy.price,
                    buyAmount: buyExchange.buy.amount,
                    buy_exchange_icon_path: buyExchange.icon,
                    sellTo: sellExchange.exchange,
                    sellPrice: sellExchange.sell.price,
                    sellAmount: sellExchange.sell.amount,
                    sell_exchange_icon_path: sellExchange.icon,
                    tradeAmount: executableAmount,
                    marketTradeAmount: amount,
                    profit,
                    profitTotal,
                    totalPrice: totalBuyCost,
                    roi,
                    spread,
                    quoteBalance,
                    baseBalance,
                    maxPurchasePrice: maxLimit,
                    balanceLimited,
                    enabled,
                    status: !enabled ? "inactive" : balanceLimited ? "balance_limited" : "executable",
                });
            }
        }
    }

    return result.sort((left, right) => {
        if (right.profitTotal !== left.profitTotal) {
            return right.profitTotal - left.profitTotal;
        }

        return right.roi - left.roi;
    });
};
