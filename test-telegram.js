// Teste de Conexão com Telegram
const TelegramBot = require('node-telegram-bot-api');
require('dotenv').config();

async function testTelegram() {
    console.log('🔍 Testando conexão com Telegram...\n');

    // Verificar se as variáveis de ambiente estão configuradas
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    if (!token || !chatId) {
        console.log('❌ ERRO: Variáveis de ambiente não configuradas!');
        console.log('\nVerifique se o arquivo .env contém:');
        console.log('TELEGRAM_BOT_TOKEN=seu_token_aqui');
        console.log('TELEGRAM_CHAT_ID=seu_chat_id_aqui');
        console.log('\n📚 Veja TELEGRAM_SETUP.md para instruções completas');
        return;
    }

    console.log('✅ Token encontrado:', token.substring(0, 10) + '...');
    console.log('✅ Chat ID encontrado:', chatId);
    console.log('');

    try {
        // Criar bot
        const bot = new TelegramBot(token, { polling: false });

        // Enviar mensagem de teste
        console.log('📤 Enviando mensagem de teste...');

        const message =
            `🧪 *Teste de Conexão*\n\n` +
            `✅ Bot conectado com sucesso!\n` +
            `📱 Chat ID: ${chatId}\n` +
            `⏰ Horário: ${new Date().toLocaleString('pt-BR')}\n\n` +
            `O bot está pronto para enviar notificações! 🚀`;

        await bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });

        console.log('✅ Mensagem enviada com sucesso!');
        console.log('📱 Verifique seu Telegram!');
        console.log('\n🎉 Conexão funcionando perfeitamente!');

    } catch (error) {
        console.log('❌ ERRO ao enviar mensagem:');
        console.log('');

        if (error.message.includes('401')) {
            console.log('🔴 Token inválido!');
            console.log('Verifique se copiou o token corretamente do @BotFather');
        } else if (error.message.includes('400')) {
            console.log('🔴 Chat ID inválido!');
            console.log('Verifique se:');
            console.log('1. Você enviou uma mensagem para o bot');
            console.log('2. O chat_id está correto');
            console.log('3. Acesse: https://api.telegram.org/bot' + token + '/getUpdates');
        } else {
            console.log('🔴 Erro desconhecido:');
            console.log(error.message);
        }

        console.log('\n📚 Veja TELEGRAM_SETUP.md para ajuda');
    }
}

testTelegram();
