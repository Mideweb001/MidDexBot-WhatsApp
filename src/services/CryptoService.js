const axios = require('axios');

class CryptoService {
    constructor() {
        this.baseURL = 'https://api.coingecko.com/api/v3';
        this.newsURL = 'https://api.coingecko.com/api/v3/news';
        this.cache = new Map();
        this.cacheTimeout = 5 * 60 * 1000; // 5 minutes cache
    }

    /**
     * Get cryptocurrency prices for specified coins
     * @param {string[]} coinIds - Array of coin IDs (e.g., ['bitcoin', 'ethereum'])
     * @param {string} vsCurrency - Currency to get prices in (default: 'usd')
     */
    async getCryptoPrices(coinIds, vsCurrency = 'usd') {
        try {
            const cacheKey = `prices_${coinIds.join(',')}_${vsCurrency}`;
            
            // Check cache first
            if (this.cache.has(cacheKey)) {
                const cached = this.cache.get(cacheKey);
                if (Date.now() - cached.timestamp < this.cacheTimeout) {
                    return cached.data;
                }
            }

            const response = await axios.get(`${this.baseURL}/simple/price`, {
                params: {
                    ids: coinIds.join(','),
                    vs_currencies: vsCurrency,
                    include_24hr_change: true,
                    include_market_cap: true,
                    include_24hr_vol: true
                }
            });

            // Cache the result
            this.cache.set(cacheKey, {
                data: response.data,
                timestamp: Date.now()
            });

            return response.data;
        } catch (error) {
            console.error('Error fetching crypto prices:', error.message);
            throw new Error('Failed to fetch cryptocurrency prices');
        }
    }

    /**
     * Get detailed information about a specific cryptocurrency
     * @param {string} coinId - Coin ID (e.g., 'bitcoin')
     */
    async getCoinDetails(coinId) {
        try {
            const cacheKey = `details_${coinId}`;
            
            // Check cache first
            if (this.cache.has(cacheKey)) {
                const cached = this.cache.get(cacheKey);
                if (Date.now() - cached.timestamp < this.cacheTimeout) {
                    return cached.data;
                }
            }

            const response = await axios.get(`${this.baseURL}/coins/${coinId}`, {
                params: {
                    localization: false,
                    tickers: false,
                    market_data: true,
                    community_data: true,
                    developer_data: false,
                    sparkline: false
                }
            });

            const coinData = {
                id: response.data.id,
                symbol: response.data.symbol.toUpperCase(),
                name: response.data.name,
                image: response.data.image.large,
                current_price: response.data.market_data.current_price.usd,
                market_cap: response.data.market_data.market_cap.usd,
                market_cap_rank: response.data.market_cap_rank,
                total_volume: response.data.market_data.total_volume.usd,
                price_change_24h: response.data.market_data.price_change_24h,
                price_change_percentage_24h: response.data.market_data.price_change_percentage_24h,
                price_change_percentage_7d: response.data.market_data.price_change_percentage_7d,
                price_change_percentage_30d: response.data.market_data.price_change_percentage_30d,
                circulating_supply: response.data.market_data.circulating_supply,
                total_supply: response.data.market_data.total_supply,
                max_supply: response.data.market_data.max_supply,
                ath: response.data.market_data.ath.usd,
                ath_date: response.data.market_data.ath_date.usd,
                atl: response.data.market_data.atl.usd,
                atl_date: response.data.market_data.atl_date.usd,
                description: response.data.description.en
            };

            // Cache the result
            this.cache.set(cacheKey, {
                data: coinData,
                timestamp: Date.now()
            });

            return coinData;
        } catch (error) {
            console.error('Error fetching coin details:', error.message);
            throw new Error(`Failed to fetch details for ${coinId}`);
        }
    }

    /**
     * Search for cryptocurrencies by name or symbol
     * @param {string} query - Search query
     */
    async searchCoins(query) {
        try {
            const response = await axios.get(`${this.baseURL}/search`, {
                params: { query }
            });

            return response.data.coins.slice(0, 10).map(coin => ({
                id: coin.id,
                name: coin.name,
                symbol: coin.symbol.toUpperCase(),
                market_cap_rank: coin.market_cap_rank,
                thumb: coin.thumb
            }));
        } catch (error) {
            console.error('Error searching coins:', error.message);
            throw new Error('Failed to search cryptocurrencies');
        }
    }

    /**
     * Get trending cryptocurrencies
     */
    async getTrendingCoins() {
        try {
            const cacheKey = 'trending_coins';
            
            // Check cache first
            if (this.cache.has(cacheKey)) {
                const cached = this.cache.get(cacheKey);
                if (Date.now() - cached.timestamp < this.cacheTimeout) {
                    return cached.data;
                }
            }

            const response = await axios.get(`${this.baseURL}/search/trending`);
            
            const trendingData = response.data.coins.map(item => ({
                id: item.item.id,
                name: item.item.name,
                symbol: item.item.symbol,
                market_cap_rank: item.item.market_cap_rank,
                thumb: item.item.thumb,
                price_btc: item.item.price_btc
            }));

            // Cache the result
            this.cache.set(cacheKey, {
                data: trendingData,
                timestamp: Date.now()
            });

            return trendingData;
        } catch (error) {
            console.error('Error fetching trending coins:', error.message);
            throw new Error('Failed to fetch trending cryptocurrencies');
        }
    }

    /**
     * Get top cryptocurrencies by market cap
     * @param {number} limit - Number of coins to return (default: 10)
     */
    async getTopCoins(limit = 10) {
        try {
            const cacheKey = `top_coins_${limit}`;
            
            // Check cache first
            if (this.cache.has(cacheKey)) {
                const cached = this.cache.get(cacheKey);
                if (Date.now() - cached.timestamp < this.cacheTimeout) {
                    return cached.data;
                }
            }

            const response = await axios.get(`${this.baseURL}/coins/markets`, {
                params: {
                    vs_currency: 'usd',
                    order: 'market_cap_desc',
                    per_page: limit,
                    page: 1,
                    sparkline: false,
                    price_change_percentage: '24h,7d'
                }
            });

            // Cache the result
            this.cache.set(cacheKey, {
                data: response.data,
                timestamp: Date.now()
            });

            return response.data;
        } catch (error) {
            console.error('Error fetching top coins:', error.message);
            throw new Error('Failed to fetch top cryptocurrencies');
        }
    }

    /**
     * Format price with appropriate decimal places and currency symbol
     * @param {number} price - Price to format
     * @param {string} currency - Currency symbol (default: '$')
     */
    formatPrice(price, currency = '$') {
        if (price >= 1) {
            return `${currency}${price.toLocaleString('en-US', { 
                minimumFractionDigits: 2, 
                maximumFractionDigits: 2 
            })}`;
        } else if (price >= 0.01) {
            return `${currency}${price.toFixed(4)}`;
        } else {
            return `${currency}${price.toFixed(8)}`;
        }
    }

    /**
     * Format percentage change with color indicators
     * @param {number} percentage - Percentage to format
     */
    formatPercentage(percentage) {
        const formatted = Math.abs(percentage).toFixed(2);
        const emoji = percentage >= 0 ? '🟢' : '🔴';
        const sign = percentage >= 0 ? '+' : '-';
        return `${emoji} ${sign}${formatted}%`;
    }

    /**
     * Format market cap or volume
     * @param {number} value - Value to format
     */
    formatLargeNumber(value) {
        if (value >= 1e12) {
            return `$${(value / 1e12).toFixed(2)}T`;
        } else if (value >= 1e9) {
            return `$${(value / 1e9).toFixed(2)}B`;
        } else if (value >= 1e6) {
            return `$${(value / 1e6).toFixed(2)}M`;
        } else if (value >= 1e3) {
            return `$${(value / 1e3).toFixed(2)}K`;
        } else {
            return `$${value.toFixed(2)}`;
        }
    }

    /**
     * Clear cache (useful for testing or forced refresh)
     */
    clearCache() {
        this.cache.clear();
    }
}

module.exports = CryptoService;