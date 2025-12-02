const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const UserCryptoWatchlist = sequelize.define('UserCryptoWatchlist', {
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
        added_price: {
            type: DataTypes.DECIMAL(20, 8),
            allowNull: true,
            comment: 'Price when coin was added to watchlist'
        },
        position: {
            type: DataTypes.INTEGER,
            defaultValue: 0,
            comment: 'Order position in user watchlist'
        },
        notes: {
            type: DataTypes.TEXT,
            allowNull: true,
            comment: 'User notes about this coin'
        },
        alerts_enabled: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
            comment: 'Whether to show alerts for this coin'
        },
        news_enabled: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
            comment: 'Whether to show news for this coin'
        },
        price_target: {
            type: DataTypes.DECIMAL(20, 8),
            allowNull: true,
            comment: 'Optional price target set by user'
        },
        buy_price: {
            type: DataTypes.DECIMAL(20, 8),
            allowNull: true,
            comment: 'Price at which user bought (for portfolio tracking)'
        },
        quantity: {
            type: DataTypes.DECIMAL(20, 8),
            allowNull: true,
            comment: 'Quantity owned (for portfolio tracking)'
        },
        tags: {
            type: DataTypes.JSON,
            allowNull: true,
            comment: 'User-defined tags for categorization'
        },
        last_viewed_at: {
            type: DataTypes.DATE,
            allowNull: true,
            comment: 'When user last viewed this coin details'
        },
        view_count: {
            type: DataTypes.INTEGER,
            defaultValue: 0,
            comment: 'Number of times user viewed this coin'
        }
    }, {
        tableName: 'user_crypto_watchlists',
        timestamps: true,
        indexes: [
            {
                fields: ['user_id']
            },
            {
                fields: ['coin_id']
            },
            {
                fields: ['user_id', 'coin_id'],
                unique: true
            },
            {
                fields: ['user_id', 'position']
            }
        ]
    });

    // Define associations
    UserCryptoWatchlist.associate = (models) => {
        UserCryptoWatchlist.belongsTo(models.User, {
            foreignKey: 'user_id',
            as: 'user'
        });
    };

    // Instance methods
    UserCryptoWatchlist.prototype.updateViewStats = async function() {
        this.viewCount += 1;
        this.lastViewedAt = new Date();
        await this.save();
        return this;
    };

    UserCryptoWatchlist.prototype.calculatePerformance = function(currentPrice) {
        if (!this.buyPrice || !this.quantity) {
            return null;
        }

        const initialValue = parseFloat(this.buyPrice) * parseFloat(this.quantity);
        const currentValue = parseFloat(currentPrice) * parseFloat(this.quantity);
        const pnl = currentValue - initialValue;
        const pnlPercentage = (pnl / initialValue) * 100;

        return {
            initialValue,
            currentValue,
            pnl,
            pnlPercentage,
            isProfit: pnl >= 0
        };
    };

    UserCryptoWatchlist.prototype.getFormattedEntry = function(currentPrice = null, priceChange24h = null) {
        const result = {
            coin: `${this.coinSymbol} (${this.coinName})`,
            addedAt: this.createdAt,
            position: this.position,
            notes: this.notes,
            tags: this.tags || []
        };

        if (currentPrice) {
            result.currentPrice = `$${parseFloat(currentPrice).toLocaleString()}`;
            
            if (this.addedPrice) {
                const priceChange = ((currentPrice - this.addedPrice) / this.addedPrice) * 100;
                result.priceChangeSinceAdded = `${priceChange >= 0 ? '+' : ''}${priceChange.toFixed(2)}%`;
            }

            if (priceChange24h !== null) {
                result.priceChange24h = `${priceChange24h >= 0 ? '+' : ''}${priceChange24h.toFixed(2)}%`;
            }

            if (this.priceTarget) {
                const targetDistance = ((this.priceTarget - currentPrice) / currentPrice) * 100;
                result.targetDistance = `${targetDistance >= 0 ? '+' : ''}${targetDistance.toFixed(2)}%`;
            }

            // Portfolio performance if user has position
            if (this.buyPrice && this.quantity) {
                const performance = this.calculatePerformance(currentPrice);
                if (performance) {
                    result.portfolio = {
                        quantity: parseFloat(this.quantity),
                        buyPrice: `$${parseFloat(this.buyPrice).toLocaleString()}`,
                        currentValue: `$${performance.currentValue.toLocaleString()}`,
                        pnl: `${performance.isProfit ? '+' : ''}$${Math.abs(performance.pnl).toLocaleString()}`,
                        pnlPercentage: `${performance.isProfit ? '+' : ''}${performance.pnlPercentage.toFixed(2)}%`
                    };
                }
            }
        }

        return result;
    };

    // Static methods
    UserCryptoWatchlist.getUserWatchlist = async function(userId, limit = null) {
        const options = {
            where: { user_id: userId },
            order: [['position', 'ASC'], ['created_at', 'ASC']],
            raw: true // This ensures we get plain objects instead of Sequelize instances
        };

        if (limit) {
            options.limit = limit;
        }

        return await this.findAll(options);
    };

    UserCryptoWatchlist.addToWatchlist = async function(userId, coinData) {
        const { coinId, coinSymbol, coinName, currentPrice, notes, priceTarget } = coinData;
        
        // Check if already in watchlist
        const existing = await this.findOne({
            where: { user_id: userId, coin_id: coinId }
        });

        if (existing) {
            throw new Error(`${coinSymbol} is already in your watchlist`);
        }

        // Get next position
        const maxPosition = await this.max('position', { where: { user_id: userId } }) || 0;

        return await this.create({
            user_id: userId,
            coin_id: coinId,
            coin_symbol: coinSymbol.toUpperCase(),
            coin_name: coinName,
            added_price: currentPrice,
            position: maxPosition + 1,
            notes,
            price_target: priceTarget
        });
    };

    UserCryptoWatchlist.removeFromWatchlist = async function(userId, coinId) {
        const entry = await this.findOne({
            where: { user_id: userId, coin_id: coinId }
        });

        if (!entry) {
            throw new Error('Coin not found in your watchlist');
        }

        await entry.destroy();
        
        // Reorder positions
        await this.reorderPositions(userId);
        
        return entry;
    };

    UserCryptoWatchlist.reorderPositions = async function(userId) {
        const watchlist = await this.findAll({
            where: { user_id: userId },
            order: [['position', 'ASC'], ['created_at', 'ASC']]
        });

        for (let i = 0; i < watchlist.length; i++) {
            watchlist[i].position = i + 1;
            await watchlist[i].save();
        }
    };

    UserCryptoWatchlist.movePosition = async function(userId, coinId, newPosition) {
        const entry = await this.findOne({
            where: { user_id: userId, coin_id: coinId }
        });

        if (!entry) {
            throw new Error('Coin not found in your watchlist');
        }

        const watchlistCount = await this.count({ where: { user_id: userId } });
        
        if (newPosition < 1 || newPosition > watchlistCount) {
            throw new Error(`Position must be between 1 and ${watchlistCount}`);
        }

        const oldPosition = entry.position;
        
        if (oldPosition === newPosition) {
            return entry;
        }

        // Update positions of other entries
        if (newPosition < oldPosition) {
            // Moving up - shift others down
            await this.update(
                { position: sequelize.literal('position + 1') },
                { 
                    where: { 
                        user_id: userId, 
                        position: { [require('sequelize').Op.gte]: newPosition, [require('sequelize').Op.lt]: oldPosition }
                    }
                }
            );
        } else {
            // Moving down - shift others up
            await this.update(
                { position: sequelize.literal('position - 1') },
                { 
                    where: { 
                        user_id: userId, 
                        position: { [require('sequelize').Op.gt]: oldPosition, [require('sequelize').Op.lte]: newPosition }
                    }
                }
            );
        }

        // Update the entry's position
        entry.position = newPosition;
        await entry.save();

        return entry;
    };

    return UserCryptoWatchlist;
};