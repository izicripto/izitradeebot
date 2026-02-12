const ccxt = require('ccxt');
const technicalindicators = require('technicalindicators');
const TelegramBot = require('node-telegram-bot-api');
require('dotenv').config();

// Configurações do Bot
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

    // Timeframes
    primaryTimeframe: '1m',
    confirmTimeframes: ['5m'],

    capital: 100,
    riskPerTrade: 0.02,
    maxPositions: 3,

    // Take profit e stop loss - OTIMIZADO
    takeProfitPercent: 0.008,
    stopLossPercent: 0.004,
    trailingStopPercent: 0.003,
    useTrailingStop: true,

    // Indicadores - OTIMIZADO
    rsiPeriod: 14,
    rsiOverbought: 65,
    rsiOversold: 35,

    // Bollinger Bands
    bbPeriod: 20,
    bbStdDev: 2,

    // Volume
    volumePeriod: 20,
    minVolumeMultiplier: 1.2,

    tradeAmount: 0.15,

    // NOVO: Logs detalhados
    verboseLogs: true,  // Mostrar análise completa
    logToTelegram: false // Enviar logs para Telegram (pode ser muito)
};

class CryptoBot {
    constructor(config) {
        this.config = config;
        this.exchange = new ccxt[config.exchange]({
            apiKey: config.apiKey,
            secret: config.apiSecret,
            password: config.password,
            enableRateLimit: true,
            options: {
                defaultType: 'spot'
            }
        });
        this.balance = config.capital;
        this.positions = {};
        this.trades = [];
        this.isRunning = false;
        this.isPaused = false; // NOVO: Para controle via Telegram

        // Inicializar Telegram bot com polling para comandos
        if (config.telegramToken && config.telegramChatId) {
            this.telegram = new TelegramBot(config.telegramToken, { polling: true });
            this.telegramEnabled = true;
            this.setupTelegramCommands();
        } else {
            this.telegram = null;
            this.telegramEnabled = false;
        }
    }

    // NOVO: Configurar comandos do Telegram
    setupTelegramCommands() {
        console.log('📱 Configurando comandos do Telegram...');

        // Comando /start - Iniciar bot
        this.telegram.onText(/\/start/, async (msg) => {
            if (msg.chat.id.toString() !== this.config.telegramChatId) return;

            this.isPaused = false;
            await this.telegram.sendMessage(
                this.config.telegramChatId,
                `✅ *Bot Ativado!*\n\n` +
                `O bot está procurando oportunidades.\n` +
                `Use /stop para pausar.`,
                { parse_mode: 'Markdown' }
            );
            console.log('✅ Bot ativado via Telegram');
        });

        // Comando /stop - Parar bot
        this.telegram.onText(/\/stop/, async (msg) => {
            if (msg.chat.id.toString() !== this.config.telegramChatId) return;

            this.isPaused = true;
            await this.telegram.sendMessage(
                this.config.telegramChatId,
                `⏸️ *Bot Pausado!*\n\n` +
                `O bot parou de procurar novos trades.\n` +
                `Posições abertas continuam sendo monitoradas.\n` +
                `Use /start para reativar.`,
                { parse_mode: 'Markdown' }
            );
            console.log('⏸️ Bot pausado via Telegram');
        });

        // Comando /status - Ver status
        this.telegram.onText(/\/status/, async (msg) => {
            if (msg.chat.id.toString() !== this.config.telegramChatId) return;

            const status = this.isPaused ? '⏸️ PAUSADO' : '✅ ATIVO';
            const posCount = Object.keys(this.positions).length;

            await this.telegram.sendMessage(
                this.config.telegramChatId,
                `📊 *Status do Bot*\n\n` +
                `Estado: ${status}\n` +
                `💰 Saldo: $${this.balance.toFixed(2)}\n` +
                `📈 Posições abertas: ${posCount}\n` +
                `🎯 Total de trades: ${this.trades.length}\n` +
                `📊 Pares: ${this.config.symbols.join(', ')}`,
                { parse_mode: 'Markdown' }
            );
        });

        // Comando /stats - Estatísticas
        this.telegram.onText(/\/stats/, async (msg) => {
            if (msg.chat.id.toString() !== this.config.telegramChatId) return;

            if (this.trades.length === 0) {
                await this.telegram.sendMessage(
                    this.config.telegramChatId,
                    `📊 Nenhum trade executado ainda.`
                );
                return;
            }

            const winningTrades = this.trades.filter(t => t.pnl > 0);
            const winRate = (winningTrades.length / this.trades.length) * 100;
            const totalPnL = this.trades.reduce((sum, t) => sum + t.pnl, 0);
            const roi = ((this.balance - this.config.capital) / this.config.capital) * 100;

            await this.telegram.sendMessage(
                this.config.telegramChatId,
                `📊 *Estatísticas*\n\n` +
                `💰 Capital inicial: $${this.config.capital.toFixed(2)}\n` +
                `💵 Saldo atual: $${this.balance.toFixed(2)}\n` +
                `📈 P&L Total: $${totalPnL.toFixed(2)}\n` +
                `📊 ROI: ${roi.toFixed(2)}%\n` +
                `🎯 Trades: ${this.trades.length}\n` +
                `✅ Vencedores: ${winningTrades.length}\n` +
                `❌ Perdedores: ${this.trades.length - winningTrades.length}\n` +
                `🏆 Win Rate: ${winRate.toFixed(2)}%`,
                { parse_mode: 'Markdown' }
            );
        });

        // Comando /help - Ajuda
        this.telegram.onText(/\/help/, async (msg) => {
            if (msg.chat.id.toString() !== this.config.telegramChatId) return;

            await this.telegram.sendMessage(
                this.config.telegramChatId,
                `🤖 *Comandos Disponíveis*\n\n` +
                `/start - Ativar bot\n` +
                `/stop - Pausar bot\n` +
                `/status - Ver status atual\n` +
                `/stats - Ver estatísticas\n` +
                `/help - Mostrar esta ajuda`,
                { parse_mode: 'Markdown' }
            );
        });

        console.log('✅ Comandos do Telegram configurados!');
        console.log('   /start - Ativar bot');
        console.log('   /stop - Pausar bot');
        console.log('   /status - Ver status');
        console.log('   /stats - Estatísticas');
        console.log('   /help - Ajuda');
    }

    // NOVO: Logs detalhados de análise
    logAnalysis(symbol, analysis) {
        if (!this.config.verboseLogs) return;

        const { price, rsi, macd, bb, volume, trend, signal } = analysis;

        console.log(`\n📊 ========== ANÁLISE: ${symbol} ==========`);
        console.log(`💵 Preço: $${price.toFixed(2)}`);
        console.log(`📈 Tendência: ${trend}`);
        console.log(``);
        console.log(`📊 RSI: ${rsi.toFixed(2)}`);
        console.log(`   Overbought (${this.config.rsiOverbought}): ${rsi > this.config.rsiOverbought ? '✅ SIM' : '❌ NÃO'}`);
        console.log(`   Oversold (${this.config.rsiOversold}): ${rsi < this.config.rsiOversold ? '✅ SIM' : '❌ NÃO'}`);
        console.log(``);
        console.log(`📉 MACD:`);
        console.log(`   MACD: ${macd.MACD?.toFixed(4) || 'N/A'}`);
        console.log(`   Signal: ${macd.signal?.toFixed(4) || 'N/A'}`);
        console.log(`   Histogram: ${macd.histogram?.toFixed(4) || 'N/A'}`);
        console.log(`   Cruzamento: ${macd.MACD > macd.signal ? '🟢 BULLISH' : '🔴 BEARISH'}`);
        console.log(``);
        console.log(`📊 Bollinger Bands:`);
        console.log(`   Upper: $${bb.upper?.toFixed(2) || 'N/A'}`);
        console.log(`   Middle: $${bb.middle?.toFixed(2) || 'N/A'}`);
        console.log(`   Lower: $${bb.lower?.toFixed(2) || 'N/A'}`);
        console.log(`   Posição: ${price > bb.upper ? '⬆️ ACIMA' : price < bb.lower ? '⬇️ ABAIXO' : '↔️ DENTRO'}`);
        console.log(``);
        console.log(`📊 Volume:`);
        console.log(`   Atual: ${volume.current?.toFixed(2) || 'N/A'}`);
        console.log(`   Média: ${volume.average?.toFixed(2) || 'N/A'}`);
        console.log(`   Multiplier: ${volume.multiplier?.toFixed(2) || 'N/A'}x`);
        console.log(`   Confirmado: ${volume.confirmed ? '✅ SIM' : '❌ NÃO'}`);
        console.log(``);
        console.log(`🎯 SINAL: ${signal}`);
        console.log(`==========================================\n`);
    }

    // Resto dos métodos permanecem iguais...
    // (copiar todos os outros métodos do bot.js original)
}

// Iniciar bot
const bot = new CryptoBot(CONFIG);
bot.initialize().then(() => {
    bot.run();
});

// Capturar Ctrl+C
process.on('SIGINT', async () => {
    console.log('\n⚠️  Recebido sinal de parada...');
    bot.isRunning = false;

    if (bot.telegramEnabled) {
        await bot.telegram.sendMessage(
            bot.config.telegramChatId,
            `🛑 *Bot Parado*\n\nO bot foi encerrado.`,
            { parse_mode: 'Markdown' }
        );
        bot.telegram.stopPolling();
    }

    bot.printStats();
    process.exit(0);
});
