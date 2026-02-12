const ccxt = require('ccxt');
const technicalindicators = require('technicalindicators');

// Backtesting Module
class Backtester {
    constructor(config) {
        this.config = config;
        this.exchange = new ccxt[config.exchange]({
            enableRateLimit: true
        });
    }

    async fetchHistoricalData(symbol, timeframe, days = 30) {
        try {
            console.log(`📊 Buscando dados históricos de ${symbol}...`);

            const since = Date.now() - (days * 24 * 60 * 60 * 1000);
            const ohlcv = await this.exchange.fetchOHLCV(symbol, timeframe, since);

            console.log(`✅ ${ohlcv.length} candles carregados`);

            return ohlcv.map(candle => ({
                timestamp: candle[0],
                open: candle[1],
                high: candle[2],
                low: candle[3],
                close: candle[4],
                volume: candle[5]
            }));
        } catch (error) {
            console.error('Erro ao buscar dados históricos:', error.message);
            return null;
        }
    }

    calculateRSI(closes, period = 14) {
        return technicalindicators.RSI.calculate({
            values: closes,
            period: period
        });
    }

    calculateMACD(closes) {
        return technicalindicators.MACD.calculate({
            values: closes,
            fastPeriod: 12,
            slowPeriod: 26,
            signalPeriod: 9,
            SimpleMAOscillator: false,
            SimpleMASignal: false
        });
    }

    analyzeCandle(candles, index) {
        const closes = candles.slice(0, index + 1).map(c => c.close);

        if (closes.length < 30) return null;

        const rsi = this.calculateRSI(closes);
        const macd = this.calculateMACD(closes);

        const currentRSI = rsi[rsi.length - 1];
        const currentMACD = macd[macd.length - 1];
        const currentPrice = closes[closes.length - 1];
        const previousPrice = closes[closes.length - 2];
        const priceChange = ((currentPrice - previousPrice) / previousPrice) * 100;

        return {
            price: currentPrice,
            rsi: currentRSI,
            macd: currentMACD,
            trend: priceChange > 0 ? 'UP' : 'DOWN'
        };
    }

    generateSignal(analysis) {
        if (!analysis || !analysis.rsi || !analysis.macd) return 'HOLD';

        const { rsi, macd, trend } = analysis;

        // Sinal de COMPRA
        if (rsi < this.config.rsiOversold &&
            macd.MACD > macd.signal &&
            trend === 'UP') {
            return 'BUY';
        }

        // Sinal de VENDA
        if (rsi > this.config.rsiOverbought &&
            macd.MACD < macd.signal &&
            trend === 'DOWN') {
            return 'SELL';
        }

        return 'HOLD';
    }

    async run(symbol, days = 30) {
        console.log('\n🔬 INICIANDO BACKTEST');
        console.log(`📈 Símbolo: ${symbol}`);
        console.log(`📅 Período: ${days} dias`);
        console.log(`💰 Capital inicial: $${this.config.capital}\n`);

        const candles = await this.fetchHistoricalData(symbol, this.config.primaryTimeframe, days);
        if (!candles) return null;

        let balance = this.config.capital;
        let position = null;
        const trades = [];

        for (let i = 30; i < candles.length; i++) {
            const analysis = this.analyzeCandle(candles, i);
            if (!analysis) continue;

            const currentPrice = analysis.price;

            // Verificar saída
            if (position) {
                const { side, entryPrice, quantity, takeProfit, stopLoss } = position;

                let exitReason = null;

                if (side === 'BUY') {
                    if (currentPrice >= takeProfit) exitReason = 'TAKE_PROFIT';
                    if (currentPrice <= stopLoss) exitReason = 'STOP_LOSS';
                } else if (side === 'SELL') {
                    if (currentPrice <= takeProfit) exitReason = 'TAKE_PROFIT';
                    if (currentPrice >= stopLoss) exitReason = 'STOP_LOSS';
                }

                if (exitReason) {
                    const pnl = side === 'BUY' ?
                        (currentPrice - entryPrice) * quantity :
                        (entryPrice - currentPrice) * quantity;

                    balance += pnl;

                    trades.push({
                        ...position,
                        exitPrice: currentPrice,
                        pnl: pnl,
                        pnlPercent: (pnl / (entryPrice * quantity)) * 100,
                        reason: exitReason
                    });

                    position = null;
                }
            } else {
                // Gerar sinal de entrada
                const signal = this.generateSignal(analysis);

                if (signal !== 'HOLD') {
                    const tradeAmount = balance * this.config.tradeAmount;
                    const quantity = tradeAmount / currentPrice;

                    position = {
                        side: signal,
                        entryPrice: currentPrice,
                        quantity: quantity,
                        timestamp: candles[i].timestamp,
                        takeProfit: signal === 'BUY' ?
                            currentPrice * (1 + this.config.takeProfitPercent) :
                            currentPrice * (1 - this.config.takeProfitPercent),
                        stopLoss: signal === 'BUY' ?
                            currentPrice * (1 - this.config.stopLossPercent) :
                            currentPrice * (1 + this.config.stopLossPercent)
                    };
                }
            }
        }

        // Gerar relatório
        return this.generateReport(trades, balance);
    }

    generateReport(trades, finalBalance) {
        const totalTrades = trades.length;
        const winningTrades = trades.filter(t => t.pnl > 0);
        const losingTrades = trades.filter(t => t.pnl < 0);
        const winRate = totalTrades > 0 ? (winningTrades.length / totalTrades) * 100 : 0;
        const totalPnL = trades.reduce((sum, t) => sum + t.pnl, 0);
        const roi = ((finalBalance - this.config.capital) / this.config.capital) * 100;

        const avgWin = winningTrades.length > 0 ?
            winningTrades.reduce((sum, t) => sum + t.pnl, 0) / winningTrades.length : 0;
        const avgLoss = losingTrades.length > 0 ?
            losingTrades.reduce((sum, t) => sum + t.pnl, 0) / losingTrades.length : 0;

        const report = {
            summary: {
                initialCapital: this.config.capital,
                finalBalance: finalBalance,
                totalPnL: totalPnL,
                roi: roi,
                totalTrades: totalTrades,
                winningTrades: winningTrades.length,
                losingTrades: losingTrades.length,
                winRate: winRate,
                avgWin: avgWin,
                avgLoss: avgLoss,
                profitFactor: avgLoss !== 0 ? Math.abs(avgWin / avgLoss) : 0
            },
            trades: trades
        };

        this.printReport(report);

        return report;
    }

    printReport(report) {
        const s = report.summary;

        console.log('\n📊 ========== RELATÓRIO DE BACKTEST ==========');
        console.log(`💰 Capital inicial: $${s.initialCapital.toFixed(2)}`);
        console.log(`💵 Saldo final: $${s.finalBalance.toFixed(2)}`);
        console.log(`📈 P&L Total: ${s.totalPnL >= 0 ? '✅' : '❌'} $${s.totalPnL.toFixed(2)}`);
        console.log(`📊 ROI: ${s.roi.toFixed(2)}%`);
        console.log(`🎯 Total de trades: ${s.totalTrades}`);
        console.log(`✅ Trades vencedores: ${s.winningTrades}`);
        console.log(`❌ Trades perdedores: ${s.losingTrades}`);
        console.log(`🏆 Win Rate: ${s.winRate.toFixed(2)}%`);
        console.log(`💚 Lucro médio: $${s.avgWin.toFixed(2)}`);
        console.log(`💔 Perda média: $${s.avgLoss.toFixed(2)}`);
        console.log(`⚖️  Profit Factor: ${s.profitFactor.toFixed(2)}`);
        console.log('=============================================\n');

        if (s.roi > 0) {
            console.log('✅ Estratégia LUCRATIVA no período testado!');
        } else {
            console.log('❌ Estratégia NÃO lucrativa no período testado.');
            console.log('💡 Considere ajustar os parâmetros.');
        }
    }
}

module.exports = Backtester;
