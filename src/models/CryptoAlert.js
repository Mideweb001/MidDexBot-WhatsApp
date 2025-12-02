const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const CryptoAlert = sequelize.define('CryptoAlert', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        user_id: {
            type: DataTypes.INTEGER,
            allowNull: false
            // Association-based FK; removed explicit reference (users)
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
        alert_type: {
            type: DataTypes.ENUM('price_above', 'price_below', 'percentage_change_up', 'percentage_change_down'),
            allowNull: false,
            comment: 'Type of alert condition'
        },
        threshold: {
            type: DataTypes.DECIMAL(20, 8),
            allowNull: false,
            comment: 'Alert threshold value (price in USD or percentage)'
        },
        current_price: {
            type: DataTypes.DECIMAL(20, 8),
            allowNull: true,
            comment: 'Last known price when alert was created/updated'
        },
        is_active: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
            comment: 'Whether the alert is active'
        },
        is_triggered: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
            comment: 'Whether the alert has been triggered'
        },
        triggered_at: {
            type: DataTypes.DATE,
            allowNull: true,
            comment: 'When the alert was triggered'
        },
        trigger_price: {
            type: DataTypes.DECIMAL(20, 8),
            allowNull: true,
            comment: 'Price at which alert was triggered'
        },
        notifications_sent: {
            type: DataTypes.INTEGER,
            defaultValue: 0,
            comment: 'Number of notifications sent for this alert'
        },
        last_notification_at: {
            type: DataTypes.DATE,
            allowNull: true,
            comment: 'When last notification was sent'
        },
        repeat_alert: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
            comment: 'Whether to repeat alert after being triggered'
        },
        cooldown_minutes: {
            type: DataTypes.INTEGER,
            defaultValue: 60,
            comment: 'Cooldown period between repeated alerts in minutes'
        },
        notes: {
            type: DataTypes.TEXT,
            allowNull: true,
            comment: 'User notes about this alert'
        }
    }, {
        tableName: 'crypto_alerts',
        timestamps: true,
        indexes: [
            {
                fields: ['user_id']
            },
            {
                fields: ['coin_id']
            },
            {
                fields: ['is_active']
            },
            {
                fields: ['is_triggered']
            },
            {
                fields: ['user_id', 'coin_id']
            }
        ]
    });

    // Define associations
    CryptoAlert.associate = (models) => {
        CryptoAlert.belongsTo(models.User, {
            foreignKey: 'userId',
            as: 'user'
        });
    };

    // Instance methods
    CryptoAlert.prototype.checkTriggerCondition = function(currentPrice, currentChange24h = null) {
        if (!this.isActive || this.isTriggered) {
            return false;
        }

        const threshold = parseFloat(this.threshold);
        const price = parseFloat(currentPrice);

        switch (this.alertType) {
            case 'price_above':
                return price >= threshold;
            case 'price_below':
                return price <= threshold;
            case 'percentage_change_up':
                return currentChange24h !== null && currentChange24h >= threshold;
            case 'percentage_change_down':
                return currentChange24h !== null && currentChange24h <= -threshold;
            default:
                return false;
        }
    };

    CryptoAlert.prototype.trigger = async function(currentPrice, currentChange24h = null) {
        this.isTriggered = true;
        this.triggeredAt = new Date();
        this.triggerPrice = currentPrice;
        this.currentPrice = currentPrice;
        this.notificationsSent += 1;
        this.lastNotificationAt = new Date();

        // If repeat alert is enabled, reactivate after trigger
        if (this.repeatAlert) {
            this.isTriggered = false;
        }

        await this.save();
        return this;
    };

    CryptoAlert.prototype.canSendNotification = function() {
        if (!this.repeatAlert) {
            return !this.isTriggered;
        }

        if (!this.lastNotificationAt) {
            return true;
        }

        const cooldownMs = this.cooldownMinutes * 60 * 1000;
        const timeSinceLastNotification = Date.now() - this.lastNotificationAt.getTime();
        
        return timeSinceLastNotification >= cooldownMs;
    };

    CryptoAlert.prototype.getFormattedAlert = function() {
        const threshold = parseFloat(this.threshold);
        let condition = '';

        switch (this.alertType) {
            case 'price_above':
                condition = `price goes above $${threshold.toLocaleString()}`;
                break;
            case 'price_below':
                condition = `price drops below $${threshold.toLocaleString()}`;
                break;
            case 'percentage_change_up':
                condition = `price increases by ${threshold}% in 24h`;
                break;
            case 'percentage_change_down':
                condition = `price decreases by ${threshold}% in 24h`;
                break;
        }

        return {
            coin: `${this.coinSymbol} (${this.coinName})`,
            condition,
            status: this.isActive ? (this.isTriggered ? 'Triggered' : 'Active') : 'Inactive',
            created: this.createdAt,
            triggered: this.triggeredAt,
            triggerPrice: this.triggerPrice ? `$${parseFloat(this.triggerPrice).toLocaleString()}` : null
        };
    };

    return CryptoAlert;
};