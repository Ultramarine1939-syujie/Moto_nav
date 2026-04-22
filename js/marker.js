/**
 * 标记点模块
 * 负责起点、终点的创建和管理
 */
const MarkerManager = {
    startMarker: null,
    endMarker: null,
    startCircle: null,
    endCircle: null,
    startLngLat: null,
    endLngLat: null,
    waypointMarkers: [],
    waypointCircles: [],
    waypointLngLats: [],
    nextWaypointIndex: 1,

    /**
     * 检查是否有起点
     */
    hasStart() {
        return this.startLngLat !== null;
    },

    /**
     * 检查是否有终点
     */
    hasEnd() {
        return this.endLngLat !== null;
    },

    /**
     * 设置起点
     */
    setStart(lngLat) {
        this.startLngLat = lngLat;

        // 清除旧的标记
        if (this.startMarker) MapManager.remove(this.startMarker);
        if (this.startCircle) MapManager.remove(this.startCircle);

        // 创建新标记
        this.startMarker = this._createMarker('start', lngLat);
        this.startCircle = this._createPulseCircle(lngLat, CONFIG.MARKER_COLORS.start.bg);
        
        MapManager.add([this.startMarker, this.startCircle]);

        // 逆地理编码
        Geocoder.reverse(lngLat, (address) => {
            UI.setStartAddress(address);
        });

        UI.updateStatus();
        UI.updateNavButton();
    },

    /**
     * 设置终点
     */
    setEnd(lngLat) {
        this.endLngLat = lngLat;

        // 清除旧的标记
        if (this.endMarker) MapManager.remove(this.endMarker);
        if (this.endCircle) MapManager.remove(this.endCircle);

        // 创建新标记
        this.endMarker = this._createMarker('end', lngLat);
        this.endCircle = this._createPulseCircle(lngLat, CONFIG.MARKER_COLORS.end.bg);
        
        MapManager.add([this.endMarker, this.endCircle]);

        // 逆地理编码
        Geocoder.reverse(lngLat, (address) => {
            UI.setEndAddress(address);
        });

        UI.updateStatus();
        UI.updateNavButton();
    },

    /**
     * 创建标记
     */
    _createMarker(type, lngLat) {
        const colors = type === 'start' ? CONFIG.MARKER_COLORS.start : CONFIG.MARKER_COLORS.end;
        const label = type === 'start' ? 'A' : 'B';

        return new AMap.Marker({
            position: lngLat,
            content: this._getMarkerContent(colors, label),
            offset: new AMap.Pixel(-16, -32),
            title: type === 'start' ? '起点' : '终点'
        });
    },

    /**
     * 获取标记内容HTML
     */
    _getMarkerContent(colors, label) {
        return `<div style="
            width: 32px;
            height: 32px;
            background: linear-gradient(135deg, ${colors.bg}, ${colors.border});
            border-radius: 50% 50% 50% 0;
            transform: rotate(-45deg);
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 3px 10px rgba(0,0,0,0.3);
            border: 2px solid white;
        ">
            <span style="
                transform: rotate(45deg);
                color: white;
                font-size: 14px;
                font-weight: bold;
            ">${label}</span>
        </div>`;
    },

    /**
     * 创建脉冲圆环
     */
    _createPulseCircle(lngLat, color) {
        return new AMap.Circle({
            center: lngLat,
            radius: 40,
            strokeColor: color,
            strokeWeight: 2,
            fillColor: color,
            fillOpacity: 0.3,
            map: MapManager.getInstance()
        });
    },

    /**
     * 清除起点
     */
    clearStart() {
        if (this.startMarker) MapManager.remove(this.startMarker);
        if (this.startCircle) MapManager.remove(this.startCircle);
        this.startMarker = null;
        this.startCircle = null;
        this.startLngLat = null;
        UI.setStartAddress('');
        UI.updateStatus();
        UI.updateNavButton();
    },

    /**
     * 清除终点
     */
    clearEnd() {
        if (this.endMarker) MapManager.remove(this.endMarker);
        if (this.endCircle) MapManager.remove(this.endCircle);
        this.endMarker = null;
        this.endCircle = null;
        this.endLngLat = null;
        UI.setEndAddress('');
        UI.updateStatus();
        UI.updateNavButton();
    },

    /**
     * 清除所有
     */
    clearAll() {
        this.clearStart();
        this.clearEnd();
        this.clearAllWaypoints();
    },

    /**
     * 清除所有途径点
     */
    clearAllWaypoints() {
        this.waypointMarkers.forEach(m => {
            if (m) MapManager.remove(m);
        });
        this.waypointCircles.forEach(c => {
            if (c) MapManager.remove(c);
        });
        this.waypointMarkers = [];
        this.waypointCircles = [];
        this.waypointLngLats = [];
        this.nextWaypointIndex = 1;
    },

    /**
     * 获取起点坐标
     */
    getStart() {
        return this.startLngLat;
    },

    /**
     * 获取终点坐标
     */
    getEnd() {
        return this.endLngLat;
    },

    /**
     * 设置途径点
     */
    setWaypoint(index, lngLat) {
        this.waypointLngLats[index] = lngLat;

        // 清除旧的标记
        if (this.waypointMarkers[index]) MapManager.remove(this.waypointMarkers[index]);
        if (this.waypointCircles[index]) MapManager.remove(this.waypointCircles[index]);

        // 创建新标记
        this.waypointMarkers[index] = this._createWaypointMarker(index + 1, lngLat);
        this.waypointCircles[index] = this._createPulseCircle(lngLat, CONFIG.MARKER_COLORS.waypoint.bg);

        MapManager.add([this.waypointMarkers[index], this.waypointCircles[index]]);

        // 逆地理编码
        Geocoder.reverse(lngLat, (address) => {
            UI.setWaypointAddress(index, address);
        });

        UI.updateNavButton();
    },

    /**
     * 创建途径点标记
     */
    _createWaypointMarker(number, lngLat) {
        const colors = CONFIG.MARKER_COLORS.waypoint;
        return new AMap.Marker({
            position: lngLat,
            content: this._getWaypointContent(colors, number),
            offset: new AMap.Pixel(-12, -24),
            title: `途径点${number}`
        });
    },

    /**
     * 获取途径点标记内容HTML
     */
    _getWaypointContent(colors, label) {
        return `<div style="
            width: 24px;
            height: 24px;
            background: linear-gradient(135deg, ${colors.bg}, ${colors.border});
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 2px 8px rgba(0,0,0,0.25);
            border: 2px solid white;
        ">
            <span style="
                color: white;
                font-size: 11px;
                font-weight: bold;
            ">${label}</span>
        </div>`;
    },

    /**
     * 清除单个途径点
     */
    clearWaypoint(index) {
        if (this.waypointMarkers[index]) MapManager.remove(this.waypointMarkers[index]);
        if (this.waypointCircles[index]) MapManager.remove(this.waypointCircles[index]);
        this.waypointMarkers[index] = null;
        this.waypointCircles[index] = null;
        this.waypointLngLats[index] = null;
        UI.clearWaypointAddress(index);
        UI.updateNavButton();
    },

    /**
     * 获取所有途径点坐标
     */
    getWaypoints() {
        return this.waypointLngLats.filter(l => l !== null && l !== undefined);
    },

    /**
     * 获取所有覆盖物
     */
    getOverlays() {
        const overlays = [this.startMarker, this.endMarker, this.startCircle, this.endCircle];
        return overlays.concat(this.waypointMarkers).concat(this.waypointCircles).filter(o => o !== null);
    }
};

/**
 * 地理编码/逆地理编码/搜索
 */
const Geocoder = {
    /**
     * 逆地理编码
     */
    reverse(lngLat, callback) {
        const url = `${CONFIG.API.REGEO}?key=${CONFIG.API_KEY.WS}&location=${lngLat.lng},${lngLat.lat}&extensions=base`;

        fetch(url)
            .then(res => res.json())
            .then(data => {
                if (data.status === '1' && data.regeocode) {
                    callback(data.regeocode.formatted_address || '未知位置');
                } else {
                    callback('未知位置');
                }
            })
            .catch(() => callback('未知位置'));
    },

    /**
     * 搜索地点
     * @param {string} keyword - 搜索关键词
     * @param {Function} callback - 回调函数，接收搜索结果数组
     */
    search(keyword, callback) {
        if (!keyword || keyword.trim().length < 2) {
            callback([]);
            return;
        }

        // 去掉城市限制，搜索全国范围，增加结果数量到25个
        const url = `${CONFIG.API.SEARCH}?key=${CONFIG.API_KEY.WS}&keywords=${encodeURIComponent(keyword)}&types=&city=&offset=25&page=1&extensions=all`;

        fetch(url)
            .then(res => res.json())
            .then(data => {
                if (data.status === '1' && data.pois && data.pois.length > 0) {
                    const results = data.pois.map(poi => ({
                        name: poi.name,
                        address: poi.address || (poi.pname && poi.cityname ? poi.pname + poi.cityname + (poi.adname || '') : ''),
                        location: poi.location,
                        type: poi.type || '',
                        typecode: poi.typecode || '',
                        cityname: poi.cityname || '',
                        adname: poi.adname || ''
                    }));
                    callback(results);
                } else {
                    callback([]);
                }
            })
            .catch(err => {
                console.error('搜索失败:', err);
                callback([]);
            });
    },

    /**
     * 地理编码（地址转坐标）
     * @param {string} address - 地址
     * @param {Function} callback - 回调函数，接收坐标或null
     */
    geocode(address, callback) {
        const url = `${CONFIG.API.SEARCH}?key=${CONFIG.API_KEY.WS}&keywords=${encodeURIComponent(address)}&city=&citylimit=true&offset=1&page=1&extensions=all`;

        fetch(url)
            .then(res => res.json())
            .then(data => {
                if (data.status === '1' && data.pois && data.pois.length > 0) {
                    const location = data.pois[0].location;
                    if (location) {
                        const [lng, lat] = location.split(',');
                        callback(new AMap.LngLat(parseFloat(lng), parseFloat(lat)));
                    } else {
                        callback(null);
                    }
                } else {
                    callback(null);
                }
            })
            .catch(() => callback(null));
    }
};