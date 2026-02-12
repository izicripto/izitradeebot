# 📱 Como Configurar Telegram no Bot

## 🎯 Passo a Passo Rápido

### 1. Criar o Bot no Telegram

1. Abra o Telegram e procure por **@BotFather**
2. Envie o comando: `/newbot`
3. Escolha um nome para seu bot (ex: "Meu Bot de Trading")
4. Escolha um username (ex: "meu_trading_bot")
5. **Copie o TOKEN** que o BotFather te enviar
   - Exemplo: `7123456789:AAHdqTcvCH1vGWJxfSeofSAs0K5PALDsaw`

### 2. Obter seu Chat ID

1. Inicie uma conversa com seu bot (clique no link que o BotFather enviou)
2. Envie qualquer mensagem para o bot (ex: "/start")
3. Abra este link no navegador (substitua `<SEU_TOKEN>` pelo token que você copiou):
   ```
   https://api.telegram.org/bot<SEU_TOKEN>/getUpdates
   ```
4. Procure por `"chat":{"id":` e copie o número
   - Exemplo: `"id":123456789`

### 3. Configurar o Bot

1. Crie um arquivo `.env` na pasta do bot:
   ```bash
   copy .env.example .env
   notepad .env
   ```

2. Edite o arquivo `.env` e adicione suas credenciais:
   ```
   TELEGRAM_BOT_TOKEN=7123456789:AAHdqTcvCH1vGWJxfSeofSAs0K5PALDsaw
   TELEGRAM_CHAT_ID=123456789
   ```

3. Salve o arquivo

### 4. Testar!

```bash
npm start
```

Você deve receber uma mensagem no Telegram:

```
🚀 Bot Iniciado!

📊 Pares: BTC/USDT, ETH/USDT, SOL/USDT
💰 Capital: $100.00
⚡ Modo: DEMO
```

---

## 📨 Notificações que Você Receberá

### 1. Inicialização do Bot
```
🚀 Bot Iniciado!

📊 Pares: BTC/USDT, ETH/USDT, SOL/USDT
💰 Capital: $100.00
⚡ Modo: DEMO
```

### 2. Execução de Trade
```
🎯 BUY Executado!

📈 Par: BTC/USDT
💵 Preço: $66,000.00
📊 Quantidade: 0.000151
🎯 Take Profit: $66,330.00
🛡️ Stop Loss: $65,802.00
🔥 Trailing Stop: ATIVO
```

### 3. Fechamento de Posição
```
💼 Posição Fechada - TAKE_PROFIT

📈 Par: BTC/USDT
📥 Entrada: $66,000.00
📤 Saída: $66,330.00
✅ P&L: $0.50 (0.50%)
💰 Saldo: $100.50
```

### 4. Estatísticas Diárias
```
📊 Estatísticas do Dia

💰 Capital inicial: $100.00
💵 Saldo atual: $112.50
📈 P&L Total: $12.50
📊 ROI: 12.50%
🎯 Trades: 25
✅ Vencedores: 17
❌ Perdedores: 8
🏆 Win Rate: 68.00%
```

---

## 🔧 Troubleshooting

### Erro: "ETELEGRAM: 401 Unauthorized"
- Verifique se o token está correto
- Certifique-se de não ter espaços antes/depois do token

### Erro: "ETELEGRAM: 400 Bad Request: chat not found"
- Verifique se o chat_id está correto
- Certifique-se de ter enviado pelo menos uma mensagem para o bot

### Não recebo mensagens
1. Verifique se o arquivo `.env` está na pasta correta
2. Verifique se as variáveis estão escritas corretamente:
   - `TELEGRAM_BOT_TOKEN` (não `TELEGRAM_TOKEN`)
   - `TELEGRAM_CHAT_ID` (não `TELEGRAM_ID`)
3. Reinicie o bot

---

## 💡 Dicas

### Silenciar Notificações à Noite
No Telegram, você pode:
1. Abrir a conversa com o bot
2. Clicar nos 3 pontinhos
3. Selecionar "Silenciar notificações"
4. Escolher o período

### Múltiplos Usuários
Para receber notificações em múltiplos dispositivos/usuários:
1. Crie um **grupo** no Telegram
2. Adicione o bot ao grupo
3. Use o chat_id do **grupo** no `.env`

Para obter o chat_id do grupo:
1. Envie uma mensagem no grupo
2. Acesse: `https://api.telegram.org/bot<TOKEN>/getUpdates`
3. Procure pelo chat_id do grupo (número negativo)

---

## 🎯 Exemplo Completo

**Arquivo `.env`:**
```bash
# OKX API
OKX_API_KEY=f0925686-044e-456b-950a-d79d31d955af
OKX_API_SECRET=1E5718B8BBC5836F321B756B06D6726E
OKX_API_PASSWORD=zKlp0d3@

# Telegram
TELEGRAM_BOT_TOKEN=7123456789:AAHdqTcvCH1vGWJxfSeofSAs0K5PALDsaw
TELEGRAM_CHAT_ID=123456789
```

**Executar:**
```bash
npm start
```

**Resultado:**
- ✅ Bot inicia
- ✅ Mensagem no Telegram confirmando
- ✅ Notificações de todos os trades
- ✅ Estatísticas em tempo real

---

## 🚀 Pronto!

Agora você receberá todas as notificações do bot diretamente no Telegram! 📱💰

Você pode monitorar seus trades de qualquer lugar, sem precisar ficar olhando o terminal.
