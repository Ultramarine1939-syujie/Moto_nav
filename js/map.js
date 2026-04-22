/**
 * 地图模块
 * 负责地图初始化和基础操作
 */
const MapManager = {
    instance: null,
    currentStyle: CONFIG.MAP.STYLE,
    isGreyStyle: true,
    trafficLayer: null,      // 拥堵图层
    isTrafficVisible: false, // 拥堵图层显示状态

    // 底图样式定义
    STYLES: {
        GREY: 'amap://styles/whitesmoke',
        NORMAL: 'amap://styles/normal'
    },

    /**
     * 初始化地图
     */
    init() {
        this.instance = new AMap.Map('map', {
            zoom: CONFIG.MAP.ZOOM,
            center: CONFIG.MAP.CENTER,
            viewMode: '2D',
            mapStyle: this.currentStyle
        });

        // 添加控件
        this._addControls();

        // 绑定点击事件
        this._bindEvents();

        return this.instance;
    },

    /**
     * 添加地图控件
     */
    _addControls() {
        // 定位控件
        this.instance.plugin('AMap.Geolocation', () => {
            const geolocation = new AMap.Geolocation({
                enableHighAccuracy: true,
                timeout: 10000
            });
            this.instance.addControl(geolocation);
        });

        // 比例尺
        this.instance.plugin('AMap.Scale', () => {
            this.instance.addControl(new AMap.Scale());
        });
    },

    /**
     * 绑定地图事件
     */
    _bindEvents() {
        this.instance.on('click', (e) => {
            MapEvents.handleClick(e.lnglat);
        });
    },

    /**
     * 添加覆盖物
     */
    add(overlay) {
        if (Array.isArray(overlay)) {
            this.instance.add(overlay);
        } else {
            this.instance.add(overlay);
        }
    },

    /**
     * 移除覆盖物
     */
    remove(overlay) {
        if (Array.isArray(overlay)) {
            this.instance.remove(overlay);
        } else {
            this.instance.remove(overlay);
        }
    },

    /**
     * 适应视野
     */
    fitView(overlays, padding) {
        const defaultPadding = [50, 50, 50, 50];
        const p = padding || defaultPadding;
        this.instance.setFitView(overlays, false, p);
    },

    /**
     * 获取地图实例
     */
    getInstance() {
        return this.instance;
    },

    /**
     * 切换底图样式（灰度 <-> 彩色）
     */
    toggleMapStyle() {
        if (this.isGreyStyle) {
            this.currentStyle = this.STYLES.NORMAL;
        } else {
            this.currentStyle = this.STYLES.GREY;
        }
        this.instance.setMapStyle(this.currentStyle);
        this.isGreyStyle = !this.isGreyStyle;
        return !this.isGreyStyle; // 返回true表示现在是彩色
    },

    /**
     * 获取当前是否为灰度模式
     */
    isGrey() {
        return this.isGreyStyle;
    },

    /**
     * 初始化拥堵图层
     */
    initTrafficLayer() {
        if (!this.trafficLayer) {
            this.trafficLayer = new AMap.TileLayer.Traffic({
                zIndex: 10,
                autoRefresh: true,      // 自动刷新
                interval: 180000       // 刷新间隔 3 分钟
            });
        }
        return this.trafficLayer;
    },

    /**
     * 切换拥堵图层显示
     */
    toggleTraffic() {
        if (!this.trafficLayer) {
            this.initTrafficLayer();
        }

        if (this.isTrafficVisible) {
            this.instance.remove(this.trafficLayer);
            this.isTrafficVisible = false;
        } else {
            this.instance.add(this.trafficLayer);
            this.isTrafficVisible = true;
        }
        return this.isTrafficVisible;
    },

    /**
     * 获取拥堵图层显示状态
     */
    isTrafficOn() {
        return this.isTrafficVisible;
    }
};

/**
 * 地图事件处理
 */
const MapEvents = {
    pendingWaypointIndex: null,

    handleClick(lngLat) {
        if (this.pendingWaypointIndex !== null) {
            // 正在添加途径点模式
            MarkerManager.setWaypoint(this.pendingWaypointIndex, lngLat);
            this.pendingWaypointIndex = null;
            UI.setWaypointAddingMode(false);
            return;
        }

        if (!MarkerManager.hasStart()) {
            MarkerManager.setStart(lngLat);
        } else if (!MarkerManager.hasEnd()) {
            MarkerManager.setEnd(lngLat);
        } else {
            // 重新开始
            MarkerManager.clearAll();
            RouteManager.clear();
            MarkerManager.setStart(lngLat);
        }
    },

    /**
     * 进入添加途径点模式
     */
    startAddWaypoint(index) {
        this.pendingWaypointIndex = index;
    },

    /**
     * 取消添加途径点模式
     */
    cancelAddWaypoint() {
        this.pendingWaypointIndex = null;
    }
};