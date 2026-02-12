// Parameter Optimizer Module
class ParameterOptimizer {
    constructor(config) {
        this.config = config;
        this.originalConfig = { ...config };
        this.lastOptimization = 0;
    }

    shouldOptimize(totalTrades) {
        if (!this.config.autoOptimize.enabled) return false;

        const tradesSinceLastOptimization = totalTrades - this.lastOptimization;
        return tradesSinceLastOptimization >= this.config.autoOptimize.checkEvery;
    }

    analyzePerformance(trades) {
        if (trades.length < 10) return null; // Precisa de pelo menos 10 trades

        const recentTrades = trades.slice(-20); // Últimos 20 trades
        const winningTrades = recentTrades.filter(t => t.pnl > 0);
        const losingTrades = recentTrades.filter(t => t.pnl < 0);

        const winRate = winningTrades.length / recentTrades.length;
        const avgWin = winningTrades.reduce((sum, t) => sum + t.pnlPercent, 0) / (winningTrades.length || 1);
        const avgLoss = Math.abs(losingTrades.reduce((sum, t) => sum + t.pnlPercent, 0) / (losingTrades.length || 1));

        // Calcular volatilidade média
        const priceChanges = recentTrades.map(t =>
            Math.abs((t.exitPrice - t.entryPrice) / t.entryPrice)
        );
        const avgVolatility = priceChanges.reduce((sum, v) => sum + v, 0) / priceChanges.length;

        return {
            winRate,
            avgWin,
            avgLoss,
            avgVolatility,
            totalTrades: recentTrades.length
        };
    }

    optimize(trades) {
        const stats = this.analyzePerformance(trades);
        if (!stats) return null;

        const adjustments = [];

        // 1. Ajustar RSI baseado em win rate
        if (this.config.autoOptimize.adaptRSI) {
            if (stats.winRate < 0.5) {
                // Win rate baixo = ser mais conservador
                this.config.rsiOversold = Math.max(20, this.config.rsiOversold - 5);
                this.config.rsiOverbought = Math.min(80, this.config.rsiOverbought + 5);
                adjustments.push(`RSI: ${this.config.rsiOversold}/${this.config.rsiOverbought} (mais conservador)`);
            } else if (stats.winRate > 0.7) {
                // Win rate alto = ser mais agressivo
                this.config.rsiOversold = Math.min(35, this.config.rsiOversold + 5);
                this.config.rsiOverbought = Math.max(65, this.config.rsiOverbought - 5);
                adjustments.push(`RSI: ${this.config.rsiOversold}/${this.config.rsiOverbought} (mais agressivo)`);
            }
        }

        // 2. Ajustar TP/SL baseado em volatilidade
        if (this.config.autoOptimize.adaptTPSL) {
            const newTP = Math.max(0.003, Math.min(0.01, stats.avgVolatility * 1.5));
            const newSL = Math.max(0.002, Math.min(0.008, stats.avgVolatility * 1.0));

            if (Math.abs(newTP - this.config.takeProfitPercent) > 0.001) {
                this.config.takeProfitPercent = newTP;
                adjustments.push(`Take Profit: ${(newTP * 100).toFixed(2)}%`);
            }

            if (Math.abs(newSL - this.config.stopLossPercent) > 0.001) {
                this.config.stopLossPercent = newSL;
                adjustments.push(`Stop Loss: ${(newSL * 100).toFixed(2)}%`);
            }
        }

        // 3. Ajustar volume multiplier
        if (this.config.autoOptimize.adaptVolume) {
            if (stats.winRate < 0.5) {
                // Muitos sinais falsos = aumentar threshold
                this.config.minVolumeMultiplier = Math.min(2.5, this.config.minVolumeMultiplier + 0.1);
                adjustments.push(`Volume: ${this.config.minVolumeMultiplier.toFixed(1)}x (mais rigoroso)`);
            } else if (stats.winRate > 0.7 && this.config.minVolumeMultiplier > 1.2) {
                // Poucas oportunidades mas bom win rate = diminuir threshold
                this.config.minVolumeMultiplier = Math.max(1.2, this.config.minVolumeMultiplier - 0.1);
                adjustments.push(`Volume: ${this.config.minVolumeMultiplier.toFixed(1)}x (mais flexível)`);
            }
        }

        this.lastOptimization = trades.length;

        if (adjustments.length > 0) {
            console.log('\n🧠 AUTO-OTIMIZAÇÃO APLICADA:');
            console.log(`   Win Rate: ${(stats.winRate * 100).toFixed(1)}%`);
            console.log(`   Volatilidade: ${(stats.avgVolatility * 100).toFixed(2)}%`);
            adjustments.forEach(adj => console.log(`   ✓ ${adj}`));

            return {
                stats,
                adjustments
            };
        }

        return null;
    }

    reset() {
        this.config = { ...this.originalConfig };
        this.lastOptimization = 0;
    }
}

module.exports = ParameterOptimizer;
