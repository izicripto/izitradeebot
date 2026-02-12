// Grid Trading Strategy Module
class GridStrategy {
    constructor(config) {
        this.config = config;
        this.gridOrders = {};
        this.gridPositions = {};
    }

    calculateGridLevels(currentPrice, symbol) {
        const levels = [];
        const spacing = this.config.gridSpacing;
        const numLevels = this.config.gridLevels;

        // Calcular níveis de compra (abaixo do preço atual)
        for (let i = 1; i <= numLevels / 2; i++) {
            const buyPrice = currentPrice * (1 - spacing * i);
            levels.push({
                type: 'BUY',
                price: buyPrice,
                symbol: symbol
            });
        }

        // Calcular níveis de venda (acima do preço atual)
        for (let i = 1; i <= numLevels / 2; i++) {
            const sellPrice = currentPrice * (1 + spacing * i);
            levels.push({
                type: 'SELL',
                price: sellPrice,
                symbol: symbol
            });
        }

        return levels;
    }

    async placeGridOrders(exchange, symbol, currentPrice, balance) {
        const levels = this.calculateGridLevels(currentPrice, symbol);
        const orderSize = balance * this.config.orderSize;

        console.log(`\n📊 Criando Grid para ${symbol} - ${levels.length} níveis`);

        for (const level of levels) {
            try {
                const quantity = orderSize / level.price;

                // Em modo DEMO, apenas simular
                const order = {
                    id: `grid_${Date.now()}_${Math.random()}`,
                    symbol: symbol,
                    type: 'limit',
                    side: level.type.toLowerCase(),
                    price: level.price,
                    amount: quantity,
                    status: 'open'
                };

                if (!this.gridOrders[symbol]) {
                    this.gridOrders[symbol] = [];
                }

                this.gridOrders[symbol].push(order);

                console.log(`   ${level.type} @ $${level.price.toFixed(2)}`);
            } catch (error) {
                console.error(`Erro ao criar ordem grid: ${error.message}`);
            }
        }

        return this.gridOrders[symbol];
    }

    checkGridExecution(symbol, currentPrice) {
        if (!this.gridOrders[symbol]) return null;

        const executed = [];

        for (const order of this.gridOrders[symbol]) {
            if (order.status === 'open') {
                // Verificar se ordem foi executada
                if (order.side === 'buy' && currentPrice <= order.price) {
                    order.status = 'filled';
                    executed.push(order);
                    console.log(`\n✅ Grid BUY executado @ $${order.price.toFixed(2)}`);
                } else if (order.side === 'sell' && currentPrice >= order.price) {
                    order.status = 'filled';
                    executed.push(order);
                    console.log(`\n✅ Grid SELL executado @ $${order.price.toFixed(2)}`);
                }
            }
        }

        return executed.length > 0 ? executed : null;
    }

    getGridStats(symbol) {
        if (!this.gridOrders[symbol]) return null;

        const total = this.gridOrders[symbol].length;
        const filled = this.gridOrders[symbol].filter(o => o.status === 'filled').length;
        const open = total - filled;

        return { total, filled, open };
    }
}

module.exports = GridStrategy;
