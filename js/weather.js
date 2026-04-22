/**
 * 天气模块
 * 使用高德地图天气 API 获取沿途天气信息
 */
const WeatherManager = {

    // 天气图标映射
    WEATHER_ICONS: {
        '晴': '☀️', '多云': '⛅', '阴': '☁️', '少云': '🌤️',
        '晴间多云': '🌤️', '小雨': '🌧️', '中雨': '🌧️', '大雨': '⛈️',
        '雷阵雨': '⛈️', '小雪': '🌨️', '中雪': '❄️', '大雪': '❄️',
        '雾': '🌫️', '霾': '🌫️', '沙尘': '🌪️', '扬沙': '🌪️',
        '雾霾': '🌫️', 'default': '🌡️'
    },

    /**
     * 获取位置的 adcode（用于天气查询）
     * @param {AMap.LngLat} lngLat
     * @returns {Promise<string>} adcode
     */
    _getAdcode(lngLat) {
        return new Promise((resolve) => {
            const url = `${CONFIG.API.REGEO}?key=${CONFIG.API_KEY.WS}&location=${lngLat.lng},${lngLat.lat}&extensions=base`;
            fetch(url)
                .then(r => r.json())
                .then(data => {
                    if (data.status === '1' && data.regeocode?.addressComponent?.adcode) {
                        resolve(data.regeocode.addressComponent.adcode);
                    } else {
                        // fallback: 使用经纬度前4位作为城市代码近似
                        resolve('');
                    }
                })
                .catch(() => resolve(''));
        });
    },

    /**
     * 获取单个地点的天气
     * @param {string} adcode - 高德城市编码
     * @returns {Promise<Object|null>}
     */
    _fetchWeather(adcode) {
        if (!adcode) return Promise.resolve(null);

        const url = `https://restapi.amap.com/v3/weather/weatherInfo?key=${CONFIG.API_KEY.WS}&city=${adcode}&extensions=base`;
        return fetch(url)
            .then(r => r.json())
            .then(data => {
                if (data.status === '1' && data.lives && data.lives.length > 0) {
                    return data.lives[0];
                }
                return null;
            })
            .catch(() => null);
    },

    /**
     * 获取沿途所有关键点的天气（起点 + 终点 + 途径点）
     * @returns {Promise<Array>} 天气数据数组 [{point, weather}]
     */
    async fetchRouteWeather() {
        const start = MarkerManager.getStart();
        const end = MarkerManager.getEnd();
        const waypoints = MarkerManager.getWaypoints();

        if (!start || !end) return [];

        // 需要查询的关键点（去重）
        const points = [
            { label: '起点', lngLat: start },
            ...waypoints.map((wp, i) => ({ label: `途径点${i + 1}`, lngLat: wp })),
            { label: '终点', lngLat: end }
        ];

        // 批量获取 adcode
        const adcodePromises = points.map(p => this._getAdcode(p.lngLat));
        const adcodes = await Promise.all(adcodePromises);

        // 批量获取天气
        const weatherPromises = adcodes.map(adcode => this._fetchWeather(adcode));
        const weathers = await Promise.all(weatherPromises);

        // 合并结果
        return points.map((p, i) => ({
            label: p.label,
            lngLat: p.lngLat,
            adcode: adcodes[i],
            weather: weathers[i]
        }));
    },

    /**
     * 获取天气图标
     */
    getWeatherIcon(weather) {
        if (!weather || !weather.weather) return this.WEATHER_ICONS['default'];
        return this.WEATHER_ICONS[weather.weather] || this.WEATHER_ICONS['default'];
    },

    /**
     * 获取风向图标
     */
    getWindIcon(direction) {
        const iconMap = {
            '北风': '⬆️', '东北风': '↗️', '东风': '➡️', '东南风': '↘️',
            '南风': '⬇️', '西南风': '↙️', '西风': '⬅️', '西北风': '↖️',
            '微风': '💨', '旋转风': '🌀'
        };
        return iconMap[direction] || '';
    },

    /**
     * 渲染天气卡片 HTML
     * @param {Array} weatherData - fetchRouteWeather 返回的数据
     */
    renderWeatherCard(weatherData) {
        if (!weatherData || weatherData.length === 0) return '';

        const validData = weatherData.filter(d => d.weather);

        if (validData.length === 0) {
            return `
                <div class="weather-card weather-card-empty">
                    <div class="weather-icon">🌡️</div>
                    <div class="weather-text">暂无法获取天气数据</div>
                </div>
            `;
        }

        // 如果只有一个有效数据（通常起点和终点在同一个城市）
        if (validData.length === 1) {
            const item = validData[0];
            const w = item.weather;
            const icon = this.getWeatherIcon(w);
            return `
                <div class="weather-card weather-card-single">
                    <div class="weather-main">
                        <div class="weather-icon-lg">${icon}</div>
                        <div class="weather-info">
                            <div class="weather-city">${w.province || ''} ${w.city || ''}</div>
                            <div class="weather-temp">${w.temperature || '--'}°C</div>
                            <div class="weather-desc">${w.weather || '未知'}</div>
                        </div>
                        <div class="weather-detail">
                            <div class="weather-detail-item">💨 ${w.winddirection || ''} ${w.windpower || ''}级</div>
                            <div class="weather-detail-item">💧 湿度 ${w.humidity || '--'}%</div>
                        </div>
                    </div>
                </div>
            `;
        }

        // 多个有效数据：水平滚动卡片
        const cardsHtml = validData.map((item, idx) => {
            const w = item.weather;
            const icon = this.getWeatherIcon(w);
            const temp = parseInt(w.temperature);
            const isHigh = temp >= 30;
            const isLow = temp <= 5;

            return `
                <div class="weather-point-card ${idx === 0 ? 'is-start' : idx === validData.length - 1 ? 'is-end' : ''}">
                    <div class="weather-point-label">${item.label}</div>
                    <div class="weather-point-icon">${icon}</div>
                    <div class="weather-point-temp ${isHigh ? 'temp-hot' : isLow ? 'temp-cold' : ''}">${w.temperature || '--'}°</div>
                    <div class="weather-point-city">${w.city || ''}</div>
                    <div class="weather-point-weather">${w.weather || ''}</div>
                </div>
            `;
        }).join('');

        return `
            <div class="weather-card weather-card-multi">
                <div class="weather-scroll">${cardsHtml}</div>
            </div>
        `;
    },

    /**
     * 渲染天气卡片（供外部调用渲染到独立面板）
     * @param {Array} weatherData - 天气数据
     * @returns {string} HTML 字符串
     */
    render(weatherData) {
        return this.renderWeatherCard(weatherData);
    }
};
