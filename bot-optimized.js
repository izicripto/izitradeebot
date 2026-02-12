const ccxt = require('ccxt');
const technicalindicators = require('technicalindicators');
const TelegramBot = require('node-telegram-bot-api');
require('dotenv').config();

// Configurações OTIMIZADAS do Bot
const CONFIG = {
    exchange: 'okx',
    apiKey: process.env.OKX_API_KEY || '',
    apiSecret: process.env.OKX_API_SECRET || '',
    password: process.env.OKX_API_PASSWORD || '',

    // Telegram
    telegramToken: process.env.TELEGRAM_BOT_TOKEN || '',
    telegramChatId: process.env.TELEGRAM_CHAT_ID || '',

    // Multi-pair trading
    symbols: ['BTC/USDT', 'ETH/USDT', 'SOL/USDT'],

    // Timeframes - OTIMIZADO: Apenas 1m para mais sinais
    primaryTimeframe: '1m',
    confirmTimeframes: ['5m'], // Reduzido para 1 confirmação

    capital: 100,
    riskPerTrade: 0.02,
    maxPositions: 3,

    // Take profit e stop loss - OTIMIZADO
    takeProfitPercent: 0.008, // Aumentado de 0.5% para 0.8%
    stopLossPercent: 0.004,   // Aumentado de 0.3% para 0.4%
    trailingStopPercent: 0.003, // Aumentado de 0.2% para 0.3%
    useTrailingStop: true,

    // Indicadores - OTIMIZADO: Mais agressivo
    rsiPeriod: 14,
    rsiOverbought: 65,  // Reduzido de 70 para 65 (mais sinais)
    rsiOversold: 35,    // Aumentado de 30 para 35 (mais sinais)

    // Bollinger Bands
    bbPeriod: 20,
    bbStdDev: 2,

    // Volume - OTIMIZADO: Menos rigoroso
    volumePeriod: 20,
    minVolumeMultiplier: 1.2, // Reduzido de 1.5 para 1.2 (mais sinais)

    tradeAmount: 0.15 // Aumentado de 10% para 15% por trade
};

// Resto do código permanece igual ao bot.js original
// ... (copiar todo o resto do bot.js aqui)

module.exports = CONFIG;
