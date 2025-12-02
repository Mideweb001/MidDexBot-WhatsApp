const CryptoService = require('./CryptoService');

class CryptoInventoryService {
    constructor() {
        this.cryptoService = new CryptoService();
    }

    /**
     * Add a buy transaction to user's inventory
     * @param {number} userId - User ID
     * @param {Object} transactionData - Transaction details
     */
    async buyPosition(userId, transactionData) {
        try {
            const { CryptoInventory } = require('../models');
            
            // Validate coin exists and get current price
            const coinDetails = await this.cryptoService.getCoinDetails(transactionData.coinId);
            if (!coinDetails) {
                throw new Error('Cryptocurrency not found');
            }

            const enrichedData = {
                ...transactionData,
                coinSymbol: coinDetails.symbol || transactionData.coinSymbol,
                coinName: coinDetails.name || transactionData.coinName,
                transactionType: 'buy'
            };

            const transaction = await CryptoInventory.addTransaction(userId, enrichedData);
            
            return {
                success: true,
                transaction,
                message: `Successfully added ${transactionData.quantity} ${coinDetails.symbol.toUpperCase()} to your portfolio`
            };
        } catch (error) {
            console.error('Error adding buy position:', error);
            throw error;
        }
    }

    /**
     * Add a sell transaction to user's inventory
     * @param {number} userId - User ID
     * @param {Object} transactionData - Transaction details
     */
    async sellPosition(userId, transactionData) {
        try {
            const { CryptoInventory } = require('../models');
            
            // Check if user has enough quantity to sell
            const currentHolding = await this.getCoinHolding(userId, transactionData.coinId);
            
            if (!currentHolding || currentHolding.total_quantity < parseFloat(transactionData.quantity)) {
                throw new Error(`Insufficient ${transactionData.coinSymbol} balance. You have ${currentHolding?.total_quantity || 0} available.`);
            }

            // Validate coin exists
            const coinDetails = await this.cryptoService.getCoinDetails(transactionData.coinId);
            if (!coinDetails) {
                throw new Error('Cryptocurrency not found');
            }

            const enrichedData = {
                ...transactionData,
                coinSymbol: coinDetails.symbol || transactionData.coinSymbol,
                coinName: coinDetails.name || transactionData.coinName,
                transactionType: 'sell'
            };

            const transaction = await CryptoInventory.addTransaction(userId, enrichedData);
            
            return {
                success: true,
                transaction,
                message: `Successfully sold ${transactionData.quantity} ${coinDetails.symbol.toUpperCase()} from your portfolio`
            };
        } catch (error) {
            console.error('Error adding sell position:', error);
            throw error;
        }
    }

    /**
     * Get user's current holdings for a specific coin
     * @param {number} userId - User ID
     * @param {string} coinId - Coin ID
     */
    async getCoinHolding(userId, coinId) {
        try {
            const { CryptoInventory } = require('../models');
            const portfolioSummary = await CryptoInventory.getPortfolioSummary(userId);
            
            return portfolioSummary.holdings.find(h => h.coin_id === coinId) || null;
        } catch (error) {
            console.error('Error getting coin holding:', error);
            throw error;
        }
    }

    /**
     * Get complete portfolio summary with current values
     * @param {number} userId - User ID
     */
    async getPortfolioSummary(userId) {
        try {
            const { CryptoInventory } = require('../models');
            const summary = await CryptoInventory.getPortfolioSummary(userId);
            
            if (summary.holdings.length === 0) {
                return {
                    ...summary,
                    total_current_value: 0,
                    total_pnl: 0,
                    total_pnl_percentage: 0,
                    holdings_with_prices: []
                };
            }

            // Get current prices for all holdings
            const coinIds = summary.holdings.map(h => h.coin_id);
            const currentPrices = await this.cryptoService.getCryptoPrices(coinIds);
            
            let totalCurrentValue = 0;
            let totalCostBasis = 0;
            
            const holdingsWithPrices = summary.holdings.map(holding => {
                const currentPrice = currentPrices[holding.coin_id]?.usd || 0;
                const currentValue = holding.total_quantity * currentPrice;
                const costBasis = holding.total_invested + holding.total_fees;
                const pnl = currentValue - costBasis;
                const pnlPercentage = costBasis > 0 ? (pnl / costBasis) * 100 : 0;
                
                totalCurrentValue += currentValue;
                totalCostBasis += costBasis;
                
                return {
                    ...holding,
                    current_price: currentPrice,
                    current_value: currentValue,
                    cost_basis: costBasis,
                    pnl,
                    pnl_percentage: pnlPercentage,
                    allocation_percentage: 0, // Will be calculated after totalCurrentValue is known
                    price_change_24h: currentPrices[holding.coin_id]?.usd_24h_change || 0
                };
            });

            // Calculate allocation percentages
            holdingsWithPrices.forEach(holding => {
                holding.allocation_percentage = totalCurrentValue > 0 ? (holding.current_value / totalCurrentValue) * 100 : 0;
            });

            const totalPnL = totalCurrentValue - totalCostBasis;
            const totalPnLPercentage = totalCostBasis > 0 ? (totalPnL / totalCostBasis) * 100 : 0;

            return {
                ...summary,
                total_current_value: totalCurrentValue,
                total_cost_basis: totalCostBasis,
                total_pnl: totalPnL,
                total_pnl_percentage: totalPnLPercentage,
                holdings_with_prices: holdingsWithPrices.sort((a, b) => b.current_value - a.current_value)
            };
        } catch (error) {
            console.error('Error getting portfolio summary:', error);
            throw error;
        }
    }

    /**
     * Get transaction history for user
     * @param {number} userId - User ID
     * @param {string} coinId - Optional coin filter
     * @param {number} limit - Optional limit
     */
    async getTransactionHistory(userId, coinId = null, limit = 20) {
        try {
            const { CryptoInventory } = require('../models');
            const transactions = await CryptoInventory.getUserInventory(userId, coinId, limit);
            
            if (transactions.length === 0) {
                return [];
            }

            // Get current prices for P&L calculation
            const coinIds = [...new Set(transactions.map(t => t.coin_id))];
            const currentPrices = await this.cryptoService.getCryptoPrices(coinIds);
            
            return transactions.map(transaction => {
                const currentPrice = currentPrices[transaction.coin_id]?.usd;
                const transactionInstance = {
                    ...transaction,
                    calculateCurrentValue: function(price) {
                        return this.transaction_type === 'sell' ? 0 : parseFloat(this.quantity) * parseFloat(price);
                    },
                    calculateProfitLoss: function(price) {
                        if (this.transaction_type === 'sell') {
                            return {
                                realized_pnl: parseFloat(this.total_value) - (parseFloat(this.quantity) * parseFloat(this.price_per_unit)),
                                unrealized_pnl: 0,
                                total_pnl: parseFloat(this.total_value) - (parseFloat(this.quantity) * parseFloat(this.price_per_unit))
                            };
                        }
                        const currentValue = this.calculateCurrentValue(price);
                        const costBasis = parseFloat(this.total_value) + parseFloat(this.fees || 0);
                        const unrealized_pnl = currentValue - costBasis;
                        return {
                            realized_pnl: 0,
                            unrealized_pnl,
                            total_pnl: unrealized_pnl,
                            percentage: costBasis > 0 ? ((unrealized_pnl / costBasis) * 100) : 0
                        };
                    },
                    getFormattedTransaction: function(price = null) {
                        const result = {
                            id: this.id,
                            coin: `${this.coin_symbol} (${this.coin_name})`,
                            type: this.transaction_type.toUpperCase(),
                            quantity: parseFloat(this.quantity),
                            pricePerUnit: `$${parseFloat(this.price_per_unit).toLocaleString()}`,
                            totalValue: `$${parseFloat(this.total_value).toLocaleString()}`,
                            fees: `$${parseFloat(this.fees || 0).toLocaleString()}`,
                            date: new Date(this.transaction_date).toLocaleDateString(),
                            exchange: this.exchange || 'Unknown',
                            notes: this.notes,
                            tags: this.tags || []
                        };
                        
                        if (price && this.transaction_type === 'buy') {
                            const pnl = this.calculateProfitLoss(price);
                            result.currentValue = `$${this.calculateCurrentValue(price).toLocaleString()}`;
                            result.pnl = `${pnl.percentage >= 0 ? '+' : ''}${pnl.percentage.toFixed(2)}%`;
                            result.pnlAmount = `${pnl.total_pnl >= 0 ? '+' : ''}$${Math.abs(pnl.total_pnl).toLocaleString()}`;
                            result.isProfit = pnl.total_pnl >= 0;
                        }
                        
                        return result;
                    }
                };
                
                return transactionInstance.getFormattedTransaction(currentPrice);
            });
        } catch (error) {
            console.error('Error getting transaction history:', error);
            throw error;
        }
    }

    /**
     * Delete a transaction
     * @param {number} userId - User ID
     * @param {number} transactionId - Transaction ID
     */
    async deleteTransaction(userId, transactionId) {
        try {
            const { CryptoInventory } = require('../models');
            return await CryptoInventory.deleteTransaction(userId, transactionId);
        } catch (error) {
            console.error('Error deleting transaction:', error);
            throw error;
        }
    }

    /**
     * Get market sentiment analysis based on user's trading patterns
     * @param {number} userId - User ID
     */
    async getMarketSentimentAnalysis(userId) {
        try {
            const { CryptoInventory } = require('../models');
            const sentiment = await CryptoInventory.getMarketSentimentAnalysis(userId);
            
            // Enhance with current market data
            const trendingCoins = await this.cryptoService.getTrendingCoins();
            const userPortfolio = await this.getPortfolioSummary(userId);
            
            // Find overlaps between trending coins and user's portfolio
            const portfolioCoins = userPortfolio.holdings_with_prices.map(h => h.coin_id);
            const trendingInPortfolio = trendingCoins.filter(coin => 
                portfolioCoins.includes(coin.id)
            );

            return {
                ...sentiment,
                market_insights: {
                    trending_in_portfolio: trendingInPortfolio.length,
                    portfolio_diversification: userPortfolio.total_coins,
                    top_performer: userPortfolio.holdings_with_prices.length > 0 ? 
                        userPortfolio.holdings_with_prices[0] : null,
                    recommendations: this.generateRecommendations(sentiment, userPortfolio, trendingCoins)
                }
            };
        } catch (error) {
            console.error('Error getting market sentiment:', error);
            throw error;
        }
    }

    /**
     * Generate investment recommendations based on portfolio and market data
     * @param {Object} sentiment - Market sentiment analysis
     * @param {Object} portfolio - User's portfolio summary
     * @param {Array} trendingCoins - Trending coins data
     */
    generateRecommendations(sentiment, portfolio, trendingCoins) {
        const recommendations = [];

        // Diversification recommendations
        if (portfolio.total_coins < 3) {
            recommendations.push({
                type: 'diversification',
                priority: 'high',
                message: 'Consider diversifying your portfolio with 3-5 different cryptocurrencies to reduce risk.',
                action: 'Add more coins to your portfolio'
            });
        }

        // Profit-taking recommendations
        const profitableHoldings = portfolio.holdings_with_prices.filter(h => h.pnl_percentage > 20);
        if (profitableHoldings.length > 0) {
            recommendations.push({
                type: 'profit_taking',
                priority: 'medium',
                message: `You have ${profitableHoldings.length} coin(s) with >20% gains. Consider taking some profits.`,
                action: 'Consider partial profit-taking'
            });
        }

        // Trending coins recommendations
        const portfolioCoins = portfolio.holdings_with_prices.map(h => h.coin_id);
        const newTrendingCoins = trendingCoins.filter(coin => !portfolioCoins.includes(coin.id)).slice(0, 3);
        
        if (newTrendingCoins.length > 0) {
            recommendations.push({
                type: 'trending',
                priority: 'low',
                message: `Consider researching these trending coins: ${newTrendingCoins.map(c => c.symbol.toUpperCase()).join(', ')}`,
                action: 'Research trending opportunities'
            });
        }

        // DCA recommendations based on sentiment
        if (sentiment.sentiment === 'bearish' && portfolio.holdings_with_prices.length > 0) {
            recommendations.push({
                type: 'dca',
                priority: 'medium',
                message: 'Market sentiment is bearish - consider dollar-cost averaging into your existing positions.',
                action: 'DCA into existing holdings'
            });
        }

        return recommendations;
    }

    /**
     * Format portfolio summary for Telegram display
     * @param {Object} portfolio - Portfolio summary
     */
    formatPortfolioForTelegram(portfolio) {
        if (portfolio.total_coins === 0) {
            return '📊 *Your Crypto Portfolio*\n\n📭 Your portfolio is empty. Start by adding your first position!';
        }

        const totalValue = portfolio.total_current_value.toLocaleString();
        const totalInvested = portfolio.total_cost_basis.toLocaleString();
        const pnlSymbol = portfolio.total_pnl >= 0 ? '📈' : '📉';
        const pnlSign = portfolio.total_pnl >= 0 ? '+' : '';
        const pnlAmount = Math.abs(portfolio.total_pnl).toLocaleString();
        const pnlPercentage = portfolio.total_pnl_percentage.toFixed(2);

        let message = `📊 *Your Crypto Portfolio*\n\n`;
        message += `💰 Total Value: $${totalValue}\n`;
        message += `💸 Total Invested: $${totalInvested}\n`;
        message += `${pnlSymbol} P&L: ${pnlSign}$${pnlAmount} (${pnlSign}${pnlPercentage}%)\n`;
        message += `📈 Total Coins: ${portfolio.total_coins}\n\n`;
        
        message += `*Top Holdings:*\n`;
        portfolio.holdings_with_prices.slice(0, 5).forEach((holding, index) => {
            const value = holding.current_value.toLocaleString();
            const allocation = holding.allocation_percentage.toFixed(1);
            const pnl = holding.pnl_percentage >= 0 ? '+' : '';
            const pnlPercent = holding.pnl_percentage.toFixed(1);
            
            message += `${index + 1}\\. *${holding.coin_symbol}* \\- $${value} \\(${allocation}%\\) ${pnl}${pnlPercent}%\n`;
        });

        return message;
    }

    /**
     * Format transaction for Telegram display
     * @param {Object} transaction - Transaction data
     */
    formatTransactionForTelegram(transaction) {
        const typeEmoji = transaction.type === 'BUY' ? '🟢' : '🔴';
        const date = transaction.date;
        
        let message = `${typeEmoji} *${transaction.type}* ${transaction.coin}\n`;
        message += `📊 Quantity: ${transaction.quantity}\n`;
        message += `💰 Price: ${transaction.pricePerUnit}\n`;
        message += `💸 Total: ${transaction.totalValue}\n`;
        
        if (transaction.fees && parseFloat(transaction.fees.replace(/[$,]/g, '')) > 0) {
            message += `🏦 Fees: ${transaction.fees}\n`;
        }
        
        if (transaction.currentValue && transaction.type === 'BUY') {
            const pnlEmoji = transaction.isProfit ? '📈' : '📉';
            message += `📊 Current Value: ${transaction.currentValue}\n`;
            message += `${pnlEmoji} P&L: ${transaction.pnlAmount} (${transaction.pnl})\n`;
        }
        
        message += `📅 Date: ${date}\n`;
        
        if (transaction.exchange && transaction.exchange !== 'Unknown') {
            message += `🏢 Exchange: ${transaction.exchange}\n`;
        }
        
        if (transaction.notes) {
            message += `📝 Notes: ${transaction.notes}\n`;
        }

        return message;
    }
}

module.exports = CryptoInventoryService;