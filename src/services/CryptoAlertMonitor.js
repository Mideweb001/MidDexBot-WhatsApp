const cron = require('node-cron');
const { CryptoAlert, UserCryptoWatchlist } = require('../models');
const CryptoService = require('./CryptoService');
const TelegramBot = require('node-telegram-bot-api');

class CryptoAlertMonitor {
    constructor(bot) {
        this.bot = bot;
        this.cryptoService = new CryptoService();
        this.isRunning = false;
        this.checkInterval = null;
        this.lastCheckTime = null;
        this.alertsChecked = 0;
        this.alertsTriggered = 0;
        
        // Price cache for comparison
        this.priceCache = new Map();
        
        console.log('🚀 CryptoAlertMonitor initialized');
    }

    /**
     * Start the crypto alert monitoring system
     */
    start() {
        if (this.isRunning) {
            console.log('⚠️ CryptoAlertMonitor is already running');
            return;
        }

        // Check alerts every 2 minutes
        this.checkInterval = cron.schedule('*/2 * * * *', async () => {
            await this.checkAllAlerts();
        }, {
            scheduled: false
        });

        this.checkInterval.start();
        this.isRunning = true;
        
        console.log('✅ CryptoAlertMonitor started - checking alerts every 2 minutes');
        
        // Run initial check
        setTimeout(() => this.checkAllAlerts(), 5000); // Wait 5 seconds before first check
    }

    /**
     * Stop the crypto alert monitoring system
     */
    stop() {
        if (!this.isRunning) {
            console.log('⚠️ CryptoAlertMonitor is not running');
            return;
        }

        if (this.checkInterval) {
            this.checkInterval.destroy();
            this.checkInterval = null;
        }

        this.isRunning = false;
        console.log('🛑 CryptoAlertMonitor stopped');
    }

    /**
     * Check all active alerts
     */
    async checkAllAlerts() {
        try {
            this.lastCheckTime = new Date();
            console.log(`🔍 Checking crypto alerts at ${this.lastCheckTime.toISOString()}`);

        // Get all active alerts
        const alerts = await CryptoAlert.findAll({
            where: {
                is_active: true,
                is_triggered: false
            },
            include: ['user']
        });            if (alerts.length === 0) {
                console.log('📭 No active alerts to check');
                return;
            }

            // Group alerts by coin to minimize API calls
            const alertsByCoin = this.groupAlertsByCoin(alerts);
            const coinIds = Object.keys(alertsByCoin);

            console.log(`📊 Checking ${alerts.length} alerts for ${coinIds.length} coins`);

            // Fetch current prices for all coins
            const prices = await this.cryptoService.getCryptoPrices(coinIds);
            
            this.alertsChecked = alerts.length;
            let triggeredCount = 0;

            // Check each coin's alerts
            for (const coinId of coinIds) {
                const coinPrice = prices[coinId];
                if (!coinPrice) {
                    console.warn(`⚠️ No price data for ${coinId}`);
                    continue;
                }

                const currentPrice = coinPrice.usd;
                const priceChange24h = coinPrice.usd_24h_change;
                
                // Update price cache
                this.priceCache.set(coinId, {
                    price: currentPrice,
                    change24h: priceChange24h,
                    timestamp: Date.now()
                });

                // Check alerts for this coin
                const coinAlerts = alertsByCoin[coinId];
                for (const alert of coinAlerts) {
                    try {
                        const shouldTrigger = alert.checkTriggerCondition(currentPrice, priceChange24h);
                        
                        if (shouldTrigger && alert.canSendNotification()) {
                            await this.triggerAlert(alert, currentPrice, priceChange24h);
                            triggeredCount++;
                        }
                    } catch (error) {
                        console.error(`❌ Error checking alert ${alert.id}:`, error.message);
                    }
                }
            }

            this.alertsTriggered = triggeredCount;
            
            if (triggeredCount > 0) {
                console.log(`🚨 Triggered ${triggeredCount} alerts`);
            } else {
                console.log('✅ Alert check completed - no alerts triggered');
            }

        } catch (error) {
            console.error('❌ Error checking crypto alerts:', error.message);
        }
    }

    /**
     * Group alerts by coin ID to minimize API calls
     */
    groupAlertsByCoin(alerts) {
        const grouped = {};
        
        for (const alert of alerts) {
            if (!grouped[alert.coinId]) {
                grouped[alert.coinId] = [];
            }
            grouped[alert.coinId].push(alert);
        }
        
        return grouped;
    }

    /**
     * Trigger an alert and send notification
     */
    async triggerAlert(alert, currentPrice, priceChange24h) {
        try {
            console.log(`🚨 Triggering alert ${alert.id} for ${alert.coinSymbol}`);

            // Update alert status
            await alert.trigger(currentPrice, priceChange24h);

            // Send notification to user
            await this.sendAlertNotification(alert, currentPrice, priceChange24h);

            console.log(`✅ Alert ${alert.id} triggered and notification sent`);
        } catch (error) {
            console.error(`❌ Error triggering alert ${alert.id}:`, error.message);
        }
    }

    /**
     * Send alert notification to user
     */
    async sendAlertNotification(alert, currentPrice, priceChange24h) {
        try {
            const user = alert.user;
            const priceFormatted = this.cryptoService.formatPrice(currentPrice);
            const change24hFormatted = priceChange24h ? this.cryptoService.formatPercentage(priceChange24h) : '';
            
            let message = `🚨 *Crypto Alert Triggered!*\n\n`;
            message += `💰 *${alert.coinSymbol}* (${alert.coinName})\n`;
            message += `💵 Current Price: ${priceFormatted}\n`;
            
            if (change24hFormatted) {
                message += `📈 24h Change: ${change24hFormatted}\n`;
            }
            
            message += `\n🎯 *Alert Condition:*\n`;
            
            const threshold = parseFloat(alert.threshold);
            switch (alert.alertType) {
                case 'price_above':
                    message += `Price reached above $${threshold.toLocaleString()}`;
                    break;
                case 'price_below':
                    message += `Price dropped below $${threshold.toLocaleString()}`;
                    break;
                case 'percentage_change_up':
                    message += `Price increased by ${threshold}% in 24h`;
                    break;
                case 'percentage_change_down':
                    message += `Price decreased by ${threshold}% in 24h`;
                    break;
            }
            
            if (alert.notes) {
                message += `\n\n📝 Notes: ${alert.notes}`;
            }
            
            message += `\n\n⏰ Triggered at: ${alert.triggeredAt.toLocaleString()}`;
            
            if (alert.repeatAlert) {
                message += `\n🔄 This alert will repeat if conditions are met again.`;
            } else {
                message += `\n🛑 This was a one-time alert and has been deactivated.`;
            }

            // Add inline keyboard for quick actions
            const keyboard = {
                inline_keyboard: [
                    [
                        {
                            text: `📊 View ${alert.coinSymbol} Details`,
                            callback_data: `crypto_details_${alert.coinId}`
                        }
                    ],
                    [
                        {
                            text: '📰 Latest News',
                            callback_data: `crypto_news_${alert.coinId}`
                        },
                        {
                            text: '⚙️ Manage Alerts',
                            callback_data: 'crypto_alerts_manage'
                        }
                    ]
                ]
            };

            await this.bot.sendMessage(user.id, message, {
                parse_mode: 'Markdown',
                reply_markup: keyboard
            });

        } catch (error) {
            console.error(`❌ Error sending alert notification to user ${alert.user_id}:`, error.message);
            
            // If message sending fails, still mark the alert as notified to prevent spam
            alert.lastNotificationAt = new Date();
            await alert.save();
        }
    }

    /**
     * Get monitoring status
     */
    getStatus() {
        return {
            isRunning: this.isRunning,
            lastCheckTime: this.lastCheckTime,
            alertsChecked: this.alertsChecked,
            alertsTriggered: this.alertsTriggered,
            cachedPrices: this.priceCache.size
        };
    }

    /**
     * Get cached price for a coin
     */
    getCachedPrice(coinId) {
        return this.priceCache.get(coinId);
    }

    /**
     * Force check alerts (for testing or manual trigger)
     */
    async forceCheck() {
        console.log('🔧 Force checking crypto alerts...');
        await this.checkAllAlerts();
    }

    /**
     * Get alerts summary for a user
     */
    async getUserAlertsStatus(userId) {
        try {
            const activeAlerts = await CryptoAlert.count({
                where: { user_id: userId, is_active: true, is_triggered: false }
            });

            const triggeredAlerts = await CryptoAlert.count({
                where: { user_id: userId, is_triggered: true }
            });

            const totalAlerts = await CryptoAlert.count({
                where: { user_id: userId }
            });

            return {
                active: activeAlerts,
                triggered: triggeredAlerts,
                total: totalAlerts,
                monitoringActive: this.isRunning
            };
        } catch (error) {
            console.error('Error getting user alerts status:', error.message);
            return null;
        }
    }

    /**
     * Clean up old triggered alerts (run periodically)
     */
    async cleanupOldAlerts() {
        try {
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

            const deletedCount = await CryptoAlert.destroy({
                where: {
                    is_triggered: true,
                    triggered_at: {
                        [require('sequelize').Op.lt]: thirtyDaysAgo
                    },
                    repeat_alert: false
                }
            });

            if (deletedCount > 0) {
                console.log(`🧹 Cleaned up ${deletedCount} old triggered alerts`);
            }

            return deletedCount;
        } catch (error) {
            console.error('Error cleaning up old alerts:', error.message);
            return 0;
        }
    }
}

module.exports = CryptoAlertMonitor;