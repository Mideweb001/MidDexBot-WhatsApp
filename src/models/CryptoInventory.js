const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const CryptoInventory = sequelize.define('CryptoInventory', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        user_id: {
            type: DataTypes.INTEGER,
            allowNull: false
            // Association-based FK; explicit reference removed to avoid case issues on Postgres
        },
        coin_id: {
            type: DataTypes.STRING,
            allowNull: false,
            comment: 'CoinGecko coin ID (e.g., bitcoin, ethereum)'
        },
        coin_symbol: {
            type: DataTypes.STRING,
            allowNull: false,
            comment: 'Coin symbol (e.g., BTC, ETH)'
        },
        coin_name: {
            type: DataTypes.STRING,
            allowNull: false,
            comment: 'Full coin name'
        },
        transaction_type: {
            type: DataTypes.ENUM('buy', 'sell'),
            allowNull: false,
            comment: 'Type of transaction'
        },
        quantity: {
            type: DataTypes.DECIMAL(20, 8),
            allowNull: false,
            comment: 'Amount of crypto bought/sold'
        },
        price_per_unit: {
            type: DataTypes.DECIMAL(20, 8),
            allowNull: false,
            comment: 'Price per unit at time of transaction'
        },
        total_value: {
            type: DataTypes.DECIMAL(20, 8),
            allowNull: false,
            comment: 'Total value of transaction (quantity * price_per_unit)'
        },
        fees: {
            type: DataTypes.DECIMAL(20, 8),
            defaultValue: 0,
            comment: 'Transaction fees paid'
        },
        exchange: {
            type: DataTypes.STRING,
            allowNull: true,
            comment: 'Exchange where transaction occurred'
        },
        transaction_date: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW,
            comment: 'When the transaction occurred'
        },
        notes: {
            type: DataTypes.TEXT,
            allowNull: true,
            comment: 'User notes about the transaction'
        },
        tags: {
            type: DataTypes.JSON,
            allowNull: true,
            comment: 'User-defined tags for categorization'
        },
        portfolio_percentage: {
            type: DataTypes.DECIMAL(5, 2),
            allowNull: true,
            comment: 'Percentage of total portfolio at time of purchase'
        },
        market_sentiment: {
            type: DataTypes.ENUM('bullish', 'bearish', 'neutral'),
            allowNull: true,
            comment: 'Market sentiment at time of transaction'
        },
        is_active: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
            comment: 'Whether this position is still active'
        }
    }, {
        tableName: 'crypto_inventory',
        timestamps: true,
        indexes: [
            {
                fields: ['user_id']
            },
            {
                fields: ['coin_id']
            },
            {
                fields: ['user_id', 'coin_id']
            },
            {
                fields: ['transaction_type']
            },
            {
                fields: ['transaction_date']
            },
            {
                fields: ['is_active']
            }
        ]
    });

    // Define associations
    CryptoInventory.associate = (models) => {
        CryptoInventory.belongsTo(models.User, {
            foreignKey: 'user_id',
            as: 'user'
        });
    };

    // Instance methods
    CryptoInventory.prototype.calculateCurrentValue = function(currentPrice) {
        if (this.transaction_type === 'sell') {
            return 0; // Sold positions have no current value
        }
        return parseFloat(this.quantity) * parseFloat(currentPrice);
    };

    CryptoInventory.prototype.calculateProfitLoss = function(currentPrice) {
        if (this.transaction_type === 'sell') {
            return {
                realized_pnl: parseFloat(this.total_value) - (parseFloat(this.quantity) * parseFloat(this.price_per_unit)),
                unrealized_pnl: 0,
                total_pnl: parseFloat(this.total_value) - (parseFloat(this.quantity) * parseFloat(this.price_per_unit))
            };
        }

        const currentValue = this.calculateCurrentValue(currentPrice);
        const costBasis = parseFloat(this.total_value) + parseFloat(this.fees || 0);
        const unrealized_pnl = currentValue - costBasis;

        return {
            realized_pnl: 0,
            unrealized_pnl,
            total_pnl: unrealized_pnl,
            percentage: ((unrealized_pnl / costBasis) * 100)
        };
    };

    CryptoInventory.prototype.getFormattedTransaction = function(currentPrice = null) {
        const result = {
            id: this.id,
            coin: `${this.coin_symbol} (${this.coin_name})`,
            type: this.transaction_type.toUpperCase(),
            quantity: parseFloat(this.quantity),
            pricePerUnit: `$${parseFloat(this.price_per_unit).toLocaleString()}`,
            totalValue: `$${parseFloat(this.total_value).toLocaleString()}`,
            fees: `$${parseFloat(this.fees || 0).toLocaleString()}`,
            date: this.transaction_date.toLocaleDateString(),
            exchange: this.exchange || 'Unknown',
            notes: this.notes,
            tags: this.tags || []
        };

        if (currentPrice && this.transaction_type === 'buy') {
            const pnl = this.calculateProfitLoss(currentPrice);
            result.currentValue = `$${this.calculateCurrentValue(currentPrice).toLocaleString()}`;
            result.pnl = `${pnl.percentage >= 0 ? '+' : ''}${pnl.percentage.toFixed(2)}%`;
            result.pnlAmount = `${pnl.total_pnl >= 0 ? '+' : ''}$${Math.abs(pnl.total_pnl).toLocaleString()}`;
            result.isProfit = pnl.total_pnl >= 0;
        }

        return result;
    };

    // Static methods
    CryptoInventory.getUserInventory = async function(userId, coinId = null, limit = null) {
        const whereClause = { user_id: userId, is_active: true };
        
        if (coinId) {
            whereClause.coin_id = coinId;
        }

        const options = {
            where: whereClause,
            order: [['transaction_date', 'DESC']],
            raw: true
        };

        if (limit) {
            options.limit = limit;
        }

        return await this.findAll(options);
    };

    CryptoInventory.getPortfolioSummary = async function(userId) {
        const inventory = await this.getUserInventory(userId);
        
        // Group by coin to calculate current holdings
        const holdings = {};
        let totalInvested = 0;
        let totalFees = 0;

        for (const transaction of inventory) {
            const coinId = transaction.coin_id;
            
            if (!holdings[coinId]) {
                holdings[coinId] = {
                    coin_id: coinId,
                    coin_symbol: transaction.coin_symbol,
                    coin_name: transaction.coin_name,
                    total_quantity: 0,
                    total_invested: 0,
                    total_fees: 0,
                    transactions: 0,
                    avg_cost_basis: 0
                };
            }

            const holding = holdings[coinId];
            
            if (transaction.transaction_type === 'buy') {
                holding.total_quantity += parseFloat(transaction.quantity);
                holding.total_invested += parseFloat(transaction.total_value);
            } else {
                holding.total_quantity -= parseFloat(transaction.quantity);
                // For sells, subtract from total invested proportionally
                const sellRatio = parseFloat(transaction.quantity) / holding.total_quantity;
                holding.total_invested -= holding.total_invested * sellRatio;
            }
            
            holding.total_fees += parseFloat(transaction.fees || 0);
            holding.transactions++;
            
            totalInvested += parseFloat(transaction.total_value);
            totalFees += parseFloat(transaction.fees || 0);
        }

        // Calculate average cost basis for each holding
        for (const coinId in holdings) {
            const holding = holdings[coinId];
            if (holding.total_quantity > 0) {
                holding.avg_cost_basis = holding.total_invested / holding.total_quantity;
            }
        }

        // Filter out holdings with zero quantity
        const activeHoldings = Object.values(holdings).filter(h => h.total_quantity > 0);

        return {
            total_coins: activeHoldings.length,
            total_invested: totalInvested,
            total_fees: totalFees,
            total_transactions: inventory.length,
            holdings: activeHoldings,
            last_transaction: inventory.length > 0 ? inventory[0].transaction_date : null
        };
    };

    CryptoInventory.addTransaction = async function(userId, transactionData) {
        const {
            coinId,
            coinSymbol,
            coinName,
            transactionType,
            quantity,
            pricePerUnit,
            fees = 0,
            exchange,
            transactionDate = new Date(),
            notes,
            tags,
            marketSentiment
        } = transactionData;

        const totalValue = parseFloat(quantity) * parseFloat(pricePerUnit);

        const transaction = await this.create({
            user_id: userId,
            coin_id: coinId,
            coin_symbol: coinSymbol.toUpperCase(),
            coin_name: coinName,
            transaction_type: transactionType,
            quantity: parseFloat(quantity),
            price_per_unit: parseFloat(pricePerUnit),
            total_value: totalValue,
            fees: parseFloat(fees),
            exchange,
            transaction_date: transactionDate,
            notes,
            tags,
            market_sentiment: marketSentiment
        });

        return transaction;
    };

    CryptoInventory.getMarketSentimentAnalysis = async function(userId) {
        const recentTransactions = await this.findAll({
            where: {
                user_id: userId,
                transaction_date: {
                    [require('sequelize').Op.gte]: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
                }
            },
            order: [['transaction_date', 'DESC']],
            raw: true
        });

        const buyTransactions = recentTransactions.filter(t => t.transaction_type === 'buy');
        const sellTransactions = recentTransactions.filter(t => t.transaction_type === 'sell');
        
        const totalBuyValue = buyTransactions.reduce((sum, t) => sum + parseFloat(t.total_value), 0);
        const totalSellValue = sellTransactions.reduce((sum, t) => sum + parseFloat(t.total_value), 0);

        let sentiment = 'neutral';
        let confidenceScore = 0;

        if (totalBuyValue > totalSellValue * 1.5) {
            sentiment = 'bullish';
            confidenceScore = Math.min(((totalBuyValue / (totalSellValue || 1)) - 1) * 20, 100);
        } else if (totalSellValue > totalBuyValue * 1.5) {
            sentiment = 'bearish';
            confidenceScore = Math.min(((totalSellValue / (totalBuyValue || 1)) - 1) * 20, 100);
        }

        return {
            sentiment,
            confidence_score: Math.round(confidenceScore),
            recent_activity: {
                buy_transactions: buyTransactions.length,
                sell_transactions: sellTransactions.length,
                total_buy_value: totalBuyValue,
                total_sell_value: totalSellValue,
                net_flow: totalBuyValue - totalSellValue
            },
            recommendation: sentiment === 'bullish' ? 'Consider taking profits' : 
                          sentiment === 'bearish' ? 'Consider buying the dip' : 
                          'Monitor market conditions'
        };
    };

    CryptoInventory.deleteTransaction = async function(userId, transactionId) {
        const transaction = await this.findOne({
            where: { id: transactionId, user_id: userId }
        });

        if (!transaction) {
            throw new Error('Transaction not found');
        }

        await transaction.destroy();
        return transaction;
    };

    return CryptoInventory;
};