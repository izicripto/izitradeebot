# 🎮 Controles do Bot via Telegram

## 📱 Comandos Disponíveis

### `/start` - Ativar Bot
Inicia o bot para procurar oportunidades de trading.

**Resposta:**
```
✅ Bot Ativado!

O bot está procurando oportunidades.
Use /stop para pausar.
```

---

### `/stop` - Pausar Bot
Pausa o bot. Posições abertas continuam sendo monitoradas.

**Resposta:**
```
⏸️ Bot Pausado!

O bot parou de procurar novos trades.
Posições abertas continuam sendo monitoradas.
Use /start para reativar.
```

---

### `/status` - Ver Status
Mostra o status atual do bot.

**Resposta:**
```
📊 Status do Bot

Estado: ✅ ATIVO
💰 Saldo: $100.00
📈 Posições abertas: 0
🎯 Total de trades: 0
📊 Pares: BTC/USDT, ETH/USDT, SOL/USDT
```

---

### `/stats` - Estatísticas
Mostra estatísticas detalhadas de performance.

**Resposta:**
```
📊 Estatísticas

💰 Capital inicial: $100.00
💵 Saldo atual: $105.50
📈 P&L Total: $5.50
📊 ROI: 5.50%
🎯 Trades: 12
✅ Vencedores: 8
❌ Perdedores: 4
🏆 Win Rate: 66.67%
```

---

### `/help` - Ajuda
Mostra lista de comandos disponíveis.

---

## 📊 Logs Detalhados

O bot agora mostra análise completa no terminal:

```
📊 ========== ANÁLISE: BTC/USDT ==========
💵 Preço: $66,327.10
📈 Tendência: UP

📊 RSI: 58.42
   Overbought (65): ❌ NÃO
   Oversold (35): ❌ NÃO

📉 MACD:
   MACD: 12.3456
   Signal: 10.2345
   Histogram: 2.1111
   Cruzamento: 🟢 BULLISH

📊 Bollinger Bands:
   Upper: $66,500.00
   Middle: $66,300.00
   Lower: $66,100.00
   Posição: ↔️ DENTRO

📊 Volume:
   Atual: 1234.56
   Média: 1000.00
   Multiplier: 1.23x
   Confirmado: ✅ SIM

🎯 SINAL: HOLD
==========================================
```

---

## 🚀 Como Usar

### 1. Ativar Controles
O bot já está configurado com controles via Telegram!

### 2. Enviar Comandos
Abra o Telegram e envie comandos para seu bot:
- `/start` para ativar
- `/stop` para pausar
- `/status` para ver status
- `/stats` para estatísticas

### 3. Monitorar
- **Terminal**: Veja logs detalhados de cada análise
- **Telegram**: Receba notificações e controle o bot

---

## ⚙️ Configurações

### Ativar/Desativar Logs Detalhados
No `bot.js`, linha 48:
```javascript
verboseLogs: true,  // true = logs detalhados, false = logs simples
```

### Enviar Logs para Telegram
```javascript
logToTelegram: false  // true = envia logs para Telegram (muito spam!)
```

---

## 💡 Dicas

1. **Use /status** regularmente para monitorar
2. **Use /stop** quando não quiser novos trades
3. **Logs detalhados** ajudam a entender decisões do bot
4. **Terminal** mostra análise completa em tempo real

---

## 🎯 Exemplo de Uso

```
Você: /start
Bot: ✅ Bot Ativado!

[Bot procura oportunidades...]

Você: /status
Bot: 📊 Status do Bot
     Estado: ✅ ATIVO
     💰 Saldo: $100.00
     ...

[Bot executa trade]

Bot: 🎯 BUY Executado!
     📈 Par: BTC/USDT
     ...

Você: /stats
Bot: 📊 Estatísticas
     🎯 Trades: 1
     ...

Você: /stop
Bot: ⏸️ Bot Pausado!
```

---

**Controle total do bot pelo Telegram! 🚀**
