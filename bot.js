const ccxt = require('ccxt');
const technicalindicators = require('technicalindicators');
const TelegramBot = require('node-telegram-bot-api');
require('dotenv').config();

// Configurações do Bot
const CONFIG = {
    exchange: 'okx',
    apiKey: process.env.OKX_API_KEY || '',
    apiSecret: process.env.OKX_API_SECRET || '',
    password: process.env.OKX_API_PASSWORD || '', // OKX requer senha adicional

    // Telegram
    telegramToken: process.env.TELEGRAM_BOT_TOKEN || '',
    telegramChatId: process.env.TELEGRAM_CHAT_ID || '',

    // Multi-pair trading
    symbols: ['BTC/USDT', 'ETH/USDT', 'SOL/USDT'], // Múltiplos pares

    // Timeframes
    primaryTimeframe: '1m',    // Timeframe principal
    confirmTimeframes: ['5m'], // Reduzido para 1 confirmação (mais sinais)

    capital: 100, // $100 inicial
    riskPerTrade: 0.02, // 2% de risco por trade
    maxPositions: 3, // Máximo de posições simultâneas

    // Take profit e stop loss - OTIMIZADO
    takeProfitPercent: 0.008, // 0.8% de lucro alvo (aumentado)
    stopLossPercent: 0.004, // 0.4% de stop loss inicial (aumentado)
    trailingStopPercent: 0.003, // 0.3% trailing stop (aumentado)
    useTrailingStop: true, // Ativar trailing stop

    // Indicadores
    rsiPeriod: 14,
    rsiOverbought: 65,  // Mais agressivo (mais sinais)
    rsiOversold: 35,    // Mais agressivo (mais sinais)

    // Bollinger Bands
    bbPeriod: 20,
    bbStdDev: 2,

    // Volume
    volumePeriod: 20, // Período para média de volume
    minVolumeMultiplier: 1.2, // Reduzido para 1.2x (mais sinais)

    tradeAmount: 0.15, // 15% do capital por trade

    // INTELIGÊNCIA DE MERCADO (NOVO)

    // 1. Gerenciamento de Risco Dinâmico (ATR)
    riskManagement: {
        useAtr: true,        // Usar ATR para stops dinâmicos
        atrPeriod: 14,       // Período do ATR
        atrMultiplierSL: 1.5, // Stop Loss = 1.5x Volatilidade
        atrMultiplierTP: 2.5  // Take Profit = 2.5x Volatilidade
    },

    // 2. Filtro de Tendência (EMA 200)
    trendFilter: {
        useEmaFilter: true,  // Só operar a favor da tendência
        emaPeriod: 200       // Período da tendência de longo prazo
    }
};

class CryptoBot {
    constructor(config) {
        this.config = config;
        this.exchange = new ccxt[config.exchange]({
            apiKey: config.apiKey,
            secret: config.apiSecret,
            password: config.password, // OKX requer senha
            enableRateLimit: true,
            options: {
                defaultType: 'spot' // Usar spot trading (mais seguro para começar)
            }
        });
        this.balance = config.capital;
        this.positions = {}; // Múltiplas posições por símbolo
        this.trades = [];
        this.isRunning = false;
        this.isPaused = false; // Controle via Telegram

        // Inicializar Telegram bot com polling para comandos
        if (config.telegramToken && config.telegramChatId) {
            this.telegram = new TelegramBot(config.telegramToken, { polling: true });
            this.telegramEnabled = true;
            this.setupTelegramCommands(); // Configurar comandos
        } else {
            this.telegram = null;
            this.telegramEnabled = false;
        }
    }

    // Configurar comandos do Telegram
    setupTelegramCommands() {
        console.log('📱 Configurando comandos do Telegram...');

        // /start - Ativar bot
        this.telegram.onText(/\/start/, async (msg) => {
            if (msg.chat.id.toString() !== this.config.telegramChatId) return;
            this.isPaused = false;
            await this.sendTelegramMessage(`✅ *Bot Ativado!*\n\nProcurando oportunidades.\nUse /stop para pausar.`);
            console.log('✅ Bot ativado via Telegram');
        });

        // /stop - Pausar bot
        this.telegram.onText(/\/stop/, async (msg) => {
            if (msg.chat.id.toString() !== this.config.telegramChatId) return;
            this.isPaused = true;
            await this.sendTelegramMessage(`⏸️ *Bot Pausado!*\n\nNovos trades pausados.\nPosições abertas continuam monitoradas.\nUse /start para reativar.`);
            console.log('⏸️ Bot pausado via Telegram');
        });

        // /status - Ver status
        this.telegram.onText(/\/status/, async (msg) => {
            if (msg.chat.id.toString() !== this.config.telegramChatId) return;
            const status = this.isPaused ? '⏸️ PAUSADO' : '✅ ATIVO';
            const posCount = Object.keys(this.positions).length;
            await this.sendTelegramMessage(
                `📊 *Status do Bot*\n\n` +
                `Estado: ${status}\n` +
                `💰 Saldo: $${this.balance.toFixed(2)}\n` +
                `📈 Posições: ${posCount}\n` +
                `🎯 Trades: ${this.trades.length}`
            );
        });

        // /stats - Estatísticas
        this.telegram.onText(/\/stats/, async (msg) => {
            if (msg.chat.id.toString() !== this.config.telegramChatId) return;
            await this.notifyDailyStats();
        });

        // /help - Ajuda
        this.telegram.onText(/\/help/, async (msg) => {
            if (msg.chat.id.toString() !== this.config.telegramChatId) return;
            await this.sendTelegramMessage(
                `🤖 *Comandos*\n\n` +
                `/start - Ativar\n` +
                `/stop - Pausar\n` +
                `/status - Status\n` +
                `/stats - Estatísticas\n` +
                `/help - Ajuda`
            );
        });

        console.log('✅ Comandos configurados: /start /stop /status /stats /help');
    }

    async initialize() {
        try {
            console.log('🚀 Inicializando Crypto Trading Bot AVANÇADO...');
            console.log(`📊 Monitorando ${this.config.symbols.length} pares: ${this.config.symbols.join(', ')}`);
            console.log(`⚡ Melhorias: Trailing Stop, Volume, Multi-Timeframe, Bollinger Bands`);
            await this.exchange.loadMarkets();

            // Verificar saldo se API keys estiverem configuradas
            if (this.config.apiKey && this.config.apiSecret && this.config.password) {
                const balance = await this.exchange.fetchBalance();
                console.log('💰 Saldo disponível:', balance.USDT?.free || 'N/A', 'USDT');
            } else {
                console.log('⚠️  Modo DEMO - Configure API keys da OKX para trading real');
                console.log('💰 Capital inicial (DEMO):', this.balance, 'USDT');
            }

            console.log('✅ Bot inicializado com sucesso!');

            // Enviar mensagem de inicialização no Telegram
            if (this.telegramEnabled) {
                await this.sendTelegramMessage(
                    `🚀 *Bot Iniciado!*\n\n` +
                    `📊 Pares: ${this.config.symbols.join(', ')}\n` +
                    `💰 Capital: $${this.balance.toFixed(2)}\n` +
                    `⚡ Modo: ${this.config.apiKey ? 'REAL' : 'DEMO'}`
                );
                console.log('📱 Telegram conectado!');
            }

            return true;
        } catch (error) {
            console.error('❌ Erro ao inicializar:', error.message);
            return false;
        }
    }

    async sendTelegramMessage(message) {
        if (!this.telegramEnabled) return;

        try {
            await this.telegram.sendMessage(this.config.telegramChatId, message, {
                parse_mode: 'Markdown'
            });
        } catch (error) {
            console.error('❌ Erro ao enviar mensagem Telegram:', error.message);
        }
    }

    async notifyTradeExecution(signal, price, symbol, position) {
        const message =
            `🎯 *${signal} Executado!*\n\n` +
            `📈 Par: ${symbol}\n` +
            `💵 Preço: $${price.toFixed(2)}\n` +
            `📊 Quantidade: ${position.quantity.toFixed(6)}\n` +
            `🎯 Take Profit: $${position.takeProfit.toFixed(2)}\n` +
            `🛡️ Stop Loss: $${position.stopLoss.toFixed(2)}\n` +
            `🔥 Trailing Stop: ATIVO`;

        await this.sendTelegramMessage(message);
    }

    async notifyPositionClosed(symbol, trade) {
        const emoji = trade.pnl >= 0 ? '✅' : '❌';
        const message =
            `💼 *Posição Fechada - ${trade.reason}*\n\n` +
            `📈 Par: ${symbol}\n` +
            `📥 Entrada: $${trade.entryPrice.toFixed(2)}\n` +
            `📤 Saída: $${trade.exitPrice.toFixed(2)}\n` +
            `${emoji} P&L: $${trade.pnl.toFixed(2)} (${trade.pnlPercent.toFixed(2)}%)\n` +
            `💰 Saldo: $${this.balance.toFixed(2)}`;

        await this.sendTelegramMessage(message);
    }

    async notifyDailyStats() {
        const totalTrades = this.trades.length;
        if (totalTrades === 0) return;

        const winningTrades = this.trades.filter(t => t.pnl > 0).length;
        const winRate = (winningTrades / totalTrades) * 100;
        const totalPnL = this.trades.reduce((sum, t) => sum + t.pnl, 0);
        const roi = ((this.balance - this.config.capital) / this.config.capital) * 100;

        const message =
            `📊 *Estatísticas do Dia*\n\n` +
            `💰 Capital inicial: $${this.config.capital.toFixed(2)}\n` +
            `💵 Saldo atual: $${this.balance.toFixed(2)}\n` +
            `📈 P&L Total: $${totalPnL.toFixed(2)}\n` +
            `📊 ROI: ${roi.toFixed(2)}%\n` +
            `🎯 Trades: ${totalTrades}\n` +
            `✅ Vencedores: ${winningTrades}\n` +
            `❌ Perdedores: ${totalTrades - winningTrades}\n` +
            `🏆 Win Rate: ${winRate.toFixed(2)}%`;

        await this.sendTelegramMessage(message);
    }

    async fetchOHLCV(symbol, timeframe, limit = 100) {
        try {
            const ohlcv = await this.exchange.fetchOHLCV(symbol, timeframe, undefined, limit);
            return ohlcv.map(candle => ({
                timestamp: candle[0],
                open: candle[1],
                high: candle[2],
                low: candle[3],
                close: candle[4],
                volume: candle[5]
            }));
        } catch (error) {
            console.error(`Erro ao buscar dados de ${symbol}:`, error.message);
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

    calculateBollingerBands(closes, period = 20, stdDev = 2) {
        return technicalindicators.BollingerBands.calculate({
            period: period,
            values: closes,
            stdDev: stdDev
        });
    }

    calculateVolumeAverage(volumes, period = 20) {
        if (volumes.length < period) return null;
        const recentVolumes = volumes.slice(-period);
        return recentVolumes.reduce((sum, v) => sum + v, 0) / period;
    }

    checkVolumeConfirmation(candles) {
        const volumes = candles.map(c => c.volume);
        const currentVolume = volumes[volumes.length - 1];
        const avgVolume = this.calculateVolumeAverage(volumes, this.config.volumePeriod);

        if (!avgVolume) return false;

        return currentVolume >= (avgVolume * this.config.minVolumeMultiplier);
    }

    async getMultiTimeframeTrend(symbol) {
        try {
            const trends = [];

            for (const tf of this.config.confirmTimeframes) {
                const candles = await this.fetchOHLCV(symbol, tf, 50);
                if (!candles || candles.length < 2) continue;

                const closes = candles.map(c => c.close);
                const currentPrice = closes[closes.length - 1];
                const previousPrice = closes[closes.length - 2];

                trends.push(currentPrice > previousPrice ? 'UP' : 'DOWN');
            }

            // Retorna tendência se todos os timeframes concordarem
            if (trends.length === 0) return null;
            const allUp = trends.every(t => t === 'UP');
            const allDown = trends.every(t => t === 'DOWN');

            if (allUp) return 'UP';
            if (allDown) return 'DOWN';
            return 'MIXED';
        } catch (error) {
            return null;
        }
    }

    async analyzeMarket(symbol, candles) {
        const closes = candles.map(c => c.close);

        // RSI
        const rsi = this.calculateRSI(closes, this.config.rsiPeriod);
        const currentRSI = rsi[rsi.length - 1];
        // Preço atual
        const currentPrice = closes[closes.length - 1];
        const previousPrice = closes[closes.length - 2];
        const priceChange = ((currentPrice - previousPrice) / previousPrice) * 100;

        // RSI
        const rsiValues = this.calculateRSI(closes, this.config.rsiPeriod);
        const currentRsi = rsiValues[rsiValues.length - 1];

        // MACD
        const macdValues = this.calculateMACD(closes);
        const currentMacd = macdValues[macdValues.length - 1];

        // Calcular BB
        const bb = technicalindicators.BollingerBands.calculate({
            period: this.config.bbPeriod,
            stdDev: this.config.bbStdDev,
            values: closes
        });

        // Calcular Volume Médio
        const volumes = candles.map(c => c.volume);
        const avgVolume = this.calculateVolumeAverage(volumes, this.config.volumePeriod);
        const currentVolume = volumes[volumes.length - 1];
        const volumeMultiplier = currentVolume / avgVolume;

        // INTELIGÊNCIA DE MERCADO (NOVO)

        // 1. Calcular ATR (Volatilidade)
        const atrInput = {
            high: candles.map(c => c.high),
            low: candles.map(c => c.low),
            close: closes,
            period: this.config.riskManagement.atrPeriod
        };
        const atr = technicalindicators.ATR.calculate(atrInput);
        const currentATR = atr[atr.length - 1];

        // 2. Calcular EMA 200 (Tendência Master)
        const ema200 = technicalindicators.EMA.calculate({
            period: this.config.trendFilter.emaPeriod,
            values: closes
        });
        const currentEMA200 = ema200[ema200.length - 1];

        // Análise Multi-Timeframe (simulada por enquanto)
        // Em produção, buscaríamos dados reais de outros timeframes
        const mtfTrend = await this.getMultiTimeframeTrend(symbol);

        const analysis = {
            price: currentPrice,
            rsi: currentRsi,
            macd: {
                MACD: currentMacd.MACD,
                signal: currentMacd.signal,
                histogram: currentMacd.histogram
            },
            bb: {
                upper: bb[bb.length - 1].upper,
                middle: bb[bb.length - 1].middle,
                lower: bb[bb.length - 1].lower,
                position: currentPrice > bb[bb.length - 1].upper ? 'ABOVE' :
                    currentPrice < bb[bb.length - 1].lower ? 'BELOW' : 'INSIDE'
            },
            volume: {
                current: currentVolume,
                average: avgVolume,
                multiplier: volumeMultiplier,
                confirmed: volumeMultiplier >= this.config.minVolumeMultiplier
            },
            atr: currentATR,        // Novo
            ema200: currentEMA200,  // Novo
            mtfTrend,
            priceChange: priceChange,
            trend: priceChange > 0 ? 'UP' : 'DOWN',
        };
        analysis.volumeMultiplier = volumeMultiplier; // Atalho
        analysis.volumeConfirmed = analysis.volume.confirmed; // Atalho

        return analysis;
    }

    async checkEntrySignal(symbol, analysis) {
        let signal = 'HOLD';
        const { rsi, macd, trend, bb, volumeConfirmed, mtfTrend, price } = analysis;

        // 1. Filtro de Tendência (EMA 200)
        // Se ativado, só compra se preço > EMA 200
        if (this.config.trendFilter && this.config.trendFilter.useEmaFilter && analysis.ema200) {
            if (price < analysis.ema200) {
                // Tendência de baixa (Bearish) - Evitar compras
                return 'HOLD';
            }
        }

        // 2. Lógica Original (RSI + Confirmações)
        // Sinal de COMPRA
        const buyConditions = [
            rsi < this.config.rsiOversold, // RSI oversold
            macd && macd.MACD > macd.signal, // MACD bullish
            trend === 'UP', // Tendência de alta
            (!mtfTrend || mtfTrend === 'UP'), // MTF confirma
            volumeConfirmed // Volume confirma
        ];

        if (buyConditions.filter(c => c).length >= 4) { // Pelo menos 4 de 5 condições
            return 'BUY';
        }

        // Sinal de VENDA
        const sellConditions = [
            rsi > this.config.rsiOverbought, // RSI overbought
            macd && macd.MACD < macd.signal, // MACD bearish
            trend === 'DOWN', // Tendência de baixa
            (!mtfTrend || mtfTrend === 'DOWN'), // MTF confirma
            volumeConfirmed // Volume confirma
        ];

        if (sellConditions.filter(c => c).length >= 4) { // Pelo menos 4 de 5 condições
            return 'SELL';
        }

        return signal;
    }

    async executeTrade(signal, price, symbol, analysis) {
        if (signal === 'HOLD') return;

        // Verificar se já tem posição neste símbolo
        if (this.positions[symbol]) return;

        // Verificar limite de posições simultâneas
        const openPositions = Object.keys(this.positions).length;
        if (openPositions >= this.config.maxPositions) return;

        const tradeAmount = this.balance * this.config.tradeAmount;
        const quantity = tradeAmount / price;

        try {
            let order;

            if (this.config.apiKey && this.config.apiSecret && this.config.password) {
                // Trading real na OKX
                if (signal === 'BUY') {
                    order = await this.exchange.createMarketBuyOrder(symbol, quantity);
                } else if (signal === 'SELL') {
                    order = await this.exchange.createMarketSellOrder(symbol, quantity);
                }
            } else {
                // Modo DEMO
                order = {
                    id: Date.now(),
                    symbol: symbol,
                    type: 'market',
                    side: signal.toLowerCase(),
                    price: price,
                    amount: quantity,
                    cost: tradeAmount,
                    timestamp: Date.now()
                };
            }

            // Calcular TP e SL
            let takeProfitPrice, stopLossPrice;

            // INTELIGÊNCIA DE MERCADO: ATR Dinâmico
            if (this.config.riskManagement && this.config.riskManagement.useAtr && analysis && analysis.atr) {
                const atr = analysis.atr;
                if (signal === 'BUY') {
                    stopLossPrice = price - (atr * this.config.riskManagement.atrMultiplierSL);
                    takeProfitPrice = price + (atr * this.config.riskManagement.atrMultiplierTP);
                } else if (signal === 'SELL') {
                    stopLossPrice = price + (atr * this.config.riskManagement.atrMultiplierSL);
                    takeProfitPrice = price - (atr * this.config.riskManagement.atrMultiplierTP);
                }
                console.log(`🧠 ATR Dinâmico aplicado: SL ${this.config.riskManagement.atrMultiplierSL}x | TP ${this.config.riskManagement.atrMultiplierTP}x`);
            } else {
                // Fallback para porcentagem fixa
                if (signal === 'BUY') {
                    takeProfitPrice = price * (1 + this.config.takeProfitPercent);
                    stopLossPrice = price * (1 - this.config.stopLossPercent);
                } else if (signal === 'SELL') {
                    takeProfitPrice = price * (1 - this.config.takeProfitPercent);
                    stopLossPrice = price * (1 + this.config.stopLossPercent);
                }
            }

            this.positions[symbol] = {
                side: signal,
                entryPrice: price,
                quantity: quantity,
                takeProfit: takeProfitPrice,
                stopLoss: stopLossPrice,
                startTime: Date.now(),
                trailingStop: this.config.useTrailingStop ? stopLossPrice : null,
                highestPrice: price, // Para trailing stop
                lowestPrice: price   // Para trailing stop
            };

            await this.notifyTradeExecution(signal, price, symbol, this.positions[symbol]);

            return order;
        } catch (error) {
            console.error('❌ Erro ao executar trade:', error.message);
            return null;
        }
    }

    updateTrailingStop(symbol, currentPrice) {
        const position = this.positions[symbol];
        if (!position || !this.config.useTrailingStop) return;

        if (position.side === 'BUY') {
            // Atualizar highest price
            if (currentPrice > position.highestPrice) {
                position.highestPrice = currentPrice;
                // Ajustar trailing stop
                const newStopLoss = currentPrice * (1 - this.config.trailingStopPercent);
                if (newStopLoss > position.stopLoss) {
                    position.stopLoss = newStopLoss;
                    console.log(`   📈 Trailing Stop ajustado para $${newStopLoss.toFixed(2)} em ${symbol}`);
                }
            }
        } else if (position.side === 'SELL') {
            // Atualizar lowest price
            if (currentPrice < position.lowestPrice) {
                position.lowestPrice = currentPrice;
                // Ajustar trailing stop
                const newStopLoss = currentPrice * (1 + this.config.trailingStopPercent);
                if (newStopLoss < position.stopLoss) {
                    position.stopLoss = newStopLoss;
                    console.log(`   📉 Trailing Stop ajustado para $${newStopLoss.toFixed(2)} em ${symbol}`);
                }
            }
        }
    }

    checkExitConditions(symbol, currentPrice) {
        const position = this.positions[symbol];
        if (!position) return null;

        const { side, takeProfit, stopLoss } = position;

        if (side === 'BUY') {
            if (currentPrice >= takeProfit) return 'TAKE_PROFIT';
            if (currentPrice <= stopLoss) return 'STOP_LOSS';
        } else if (side === 'SELL') {
            if (currentPrice <= takeProfit) return 'TAKE_PROFIT';
            if (currentPrice >= stopLoss) return 'STOP_LOSS';
        }

        return null;
    }

    async closePosition(symbol, currentPrice, reason) {
        const position = this.positions[symbol];
        if (!position) return;

        const { side, entryPrice, quantity } = position;
        const pnl = side === 'BUY' ?
            (currentPrice - entryPrice) * quantity :
            (entryPrice - currentPrice) * quantity;
        const pnlPercent = (pnl / (entryPrice * quantity)) * 100;

        this.balance += pnl;

        const trade = {
            ...position,
            symbol: symbol,
            exitPrice: currentPrice,
            exitTime: Date.now(),
            pnl: pnl,
            pnlPercent: pnlPercent,
            reason: reason
        };

        this.trades.push(trade);

        console.log(`\n💼 Posição fechada em ${symbol} - ${reason}`);
        console.log(`   Entrada: $${entryPrice.toFixed(2)}`);
        console.log(`   Saída: $${currentPrice.toFixed(2)}`);
        console.log(`   P&L: ${pnl >= 0 ? '✅' : '❌'} $${pnl.toFixed(2)} (${pnlPercent.toFixed(2)}%)`);
        console.log(`   Saldo atual: $${this.balance.toFixed(2)}`);

        // Notificar no Telegram
        await this.notifyPositionClosed(symbol, trade);

        delete this.positions[symbol];
    }

    printStats() {
        const totalTrades = this.trades.length;
        const winningTrades = this.trades.filter(t => t.pnl > 0).length;
        const losingTrades = this.trades.filter(t => t.pnl < 0).length;
        const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;
        const totalPnL = this.trades.reduce((sum, t) => sum + t.pnl, 0);
        const roi = ((this.balance - this.config.capital) / this.config.capital) * 100;

        // Estatísticas por par
        const pairStats = {};
        this.config.symbols.forEach(symbol => {
            const pairTrades = this.trades.filter(t => t.symbol === symbol);
            if (pairTrades.length > 0) {
                const pairPnL = pairTrades.reduce((sum, t) => sum + t.pnl, 0);
                const pairWins = pairTrades.filter(t => t.pnl > 0).length;
                pairStats[symbol] = {
                    trades: pairTrades.length,
                    pnl: pairPnL,
                    winRate: (pairWins / pairTrades.length) * 100
                };
            }
        });

        console.log('\n📊 ========== ESTATÍSTICAS ==========');
        console.log(`   Capital inicial: $${this.config.capital.toFixed(2)}`);
        console.log(`   Saldo atual: $${this.balance.toFixed(2)}`);
        console.log(`   P&L Total: ${totalPnL >= 0 ? '✅' : '❌'} $${totalPnL.toFixed(2)}`);
        console.log(`   ROI: ${roi.toFixed(2)}%`);
        console.log(`   Total de trades: ${totalTrades}`);
        console.log(`   Trades vencedores: ${winningTrades}`);
        console.log(`   Trades perdedores: ${losingTrades}`);
        console.log(`   Win Rate: ${winRate.toFixed(2)}%`);

        if (Object.keys(pairStats).length > 0) {
            console.log('\n   📈 Por Par:');
            Object.entries(pairStats).forEach(([symbol, stats]) => {
                console.log(`   ${symbol}: ${stats.trades} trades | P&L: $${stats.pnl.toFixed(2)} | Win: ${stats.winRate.toFixed(0)}%`);
            });
        }

        console.log('=====================================\n');
    }

    async run() {
        this.isRunning = true;
        console.log('\n🤖 Bot AVANÇADO iniciado! Procurando oportunidades em múltiplos pares...\n');

        while (this.isRunning) {
            try {
                // Processar cada símbolo
                for (const symbol of this.config.symbols) {
                    // Buscar dados do mercado
                    const candles = await this.fetchOHLCV(
                        symbol,
                        this.config.primaryTimeframe,
                        100
                    );

                    if (!candles || candles.length === 0) continue;

                    // Analisar mercado
                    const analysis = await this.analyzeMarket(symbol, candles);
                    const currentPrice = analysis.price;

                    // Log detalhado de análise
                    const volumeIcon = analysis.volumeConfirmed ? '📊' : '📉';
                    const mtfIcon = analysis.mtfTrend === 'UP' ? '⬆️' : analysis.mtfTrend === 'DOWN' ? '⬇️' : '↔️';
                    const pauseIcon = this.isPaused ? '⏸️' : '';

                    console.log(`\n[${new Date().toLocaleTimeString()}] ${pauseIcon} ${symbol}: $${currentPrice.toFixed(2)}`);
                    console.log(`  📊 RSI: ${analysis.rsi?.toFixed(1) || 'N/A'} | MACD: ${analysis.macd?.MACD?.toFixed(2) || 'N/A'} | BB: ${analysis.bb?.position || 'N/A'}`);
                    console.log(`  ${volumeIcon} Volume: ${analysis.volumeMultiplier ? analysis.volumeMultiplier.toFixed(2) : 'N/A'}x | ${mtfIcon} Trend: ${analysis.mtfTrend || 'N/A'}`);

                    // Log de Inteligência (Novo)
                    if (analysis.atr && analysis.ema200) {
                        const emaDist = ((currentPrice - analysis.ema200) / analysis.ema200) * 100;
                        const emaStatus = currentPrice > analysis.ema200 ? '🟢 BULLISH' : '🔴 BEARISH';
                        console.log(`  🧠 ATR: ${analysis.atr.toFixed(2)} | EMA200: ${analysis.ema200.toFixed(2)} (${emaStatus} ${emaDist.toFixed(2)}%)`);
                    }

                    // Verificar condições de saída se houver posição aberta
                    if (this.positions[symbol]) {
                        // Atualizar trailing stop
                        this.updateTrailingStop(symbol, currentPrice);

                        const exitReason = this.checkExitConditions(symbol, currentPrice);
                        if (exitReason) {
                            await this.closePosition(symbol, currentPrice, exitReason);
                            this.printStats();
                        }
                    } else {
                        // Verificar se bot está pausado
                        if (this.isPaused) {
                            // Bot pausado - não executar novos trades
                            continue;
                        }

                        // Gerar sinal de entrada
                        const signal = await this.checkEntrySignal(symbol, analysis);
                        if (signal && signal !== 'HOLD') {
                            await this.executeTrade(signal, currentPrice, symbol, analysis);
                        }
                    }
                }

                // Aguardar próximo ciclo (30 segundos)
                await this.sleep(30000);

            } catch (error) {
                console.error('❌ Erro no loop principal:', error.message);
                await this.sleep(5000);
            }
        }
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    stop() {
        this.isRunning = false;
        console.log('\n🛑 Bot parado!');
        this.printStats();
    }
}

// Executar o bot
async function main() {
    const bot = new CryptoBot(CONFIG);

    const initialized = await bot.initialize();
    if (!initialized) {
        console.error('Falha ao inicializar o bot');
        process.exit(1);
    }

    // Capturar Ctrl+C para parar o bot graciosamente
    process.on('SIGINT', async () => {
        console.log('\n⚠️  Recebido sinal de parada...');
        bot.isRunning = false;

        // Parar polling do Telegram
        if (bot.telegramEnabled && bot.telegram) {
            try {
                await bot.sendTelegramMessage('🛑 *Bot Parado*\n\nO bot foi encerrado.');
                bot.telegram.stopPolling();
            } catch (error) {
                console.log('Erro ao parar Telegram:', error.message);
            }
        }

        bot.printStats();
        process.exit(0);
    });

    // Iniciar o bot
    await bot.run();
}

// Executar se for o arquivo principal
if (require.main === module) {
    main().catch(console.error);
}

module.exports = CryptoBot;
