// Script de Backtesting
const Backtester = require('./backtester');

// Configuração OTIMIZADA para backtest
const CONFIG = {
    exchange: 'okx',
    primaryTimeframe: '1m',
    capital: 100,
    riskPerTrade: 0.02,
    takeProfitPercent: 0.008,  // Aumentado para 0.8%
    stopLossPercent: 0.004,    // Aumentado para 0.4%
    rsiPeriod: 14,
    rsiOverbought: 65,         // Mais agressivo
    rsiOversold: 35,           // Mais agressivo
    tradeAmount: 0.15,         // 15% por trade

    // INTELIGÊNCIA DE MERCADO
    riskManagement: {
        useAtr: true,
        atrPeriod: 14,
        atrMultiplierSL: 1.5,
        atrMultiplierTP: 2.5
    },
    trendFilter: {
        useEmaFilter: true,
        emaPeriod: 200
    }
};

async function main() {
    const backtester = new Backtester(CONFIG);

    // Testar BTC/USDT nos últimos 7 dias
    console.log('🔬 Testando estratégia com dados históricos...\n');

    const symbols = ['BTC/USDT', 'ETH/USDT', 'SOL/USDT'];
    const days = 7;

    for (const symbol of symbols) {
        await backtester.run(symbol, days);
        console.log('\n' + '='.repeat(50) + '\n');
    }
}

main().catch(console.error);
