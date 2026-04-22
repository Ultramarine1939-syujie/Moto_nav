/**
 * 路径规划模块
 */
const RouteManager = {
    polylines: [],
    currentMode: CONFIG.MODE.BICYCLING,
    segments: [],

    // 模式相关URL映射
    _apiUrls: {
        [CONFIG.MODE.BICYCLING]: CONFIG.API.BICYCLING,
        [CONFIG.MODE.DRIVING]: CONFIG.API.DRIVING,
        [CONFIG.MODE.WALKING]: CONFIG.API.WALKING
    },

    setMode(mode) {
        this.currentMode = mode;
    },

    _getColors() {
        const modeMap = {
            [CONFIG.MODE.BICYCLING]: 'bicycling',
            [CONFIG.MODE.DRIVING]: 'driving',
            [CONFIG.MODE.WALKING]: 'walking'
        };
        return CONFIG.ROUTE_COLORS[modeMap[this.currentMode]];
    },

    _getApiUrl(origin, destination) {
        let url = `${this._apiUrls[this.currentMode]}?key=${CONFIG.API_KEY.WS}&origin=${origin}&destination=${destination}`;
        if (this.currentMode === CONFIG.MODE.DRIVING) {
            url += '&strategy=0';
        }
        return url;
    },

    _buildPolylineOptions(path, colors) {
        return {
            path,
            strokeColor: colors.main,
            strokeWeight: 6,
            strokeOpacity: 0.9,
            strokeStyle: 'solid',
            lineCap: 'round',
            lineJoin: 'round',
            showDir: true
        };
    },

    /**
     * 分段规划路线
     */
    planMultiSegment(onSuccess, onError) {
        UI.showLoading(true);
        UI.hideError();

        const start = MarkerManager.getStart();
        const end = MarkerManager.getEnd();
        const waypoints = MarkerManager.getWaypoints();
        const allPoints = [start, ...waypoints, end];

        const segmentPromises = allPoints.slice(0, -1).map((origin, i) =>
            this._planSegment(origin, allPoints[i + 1], i)
        );

        Promise.all(segmentPromises)
            .then(results => {
                UI.showLoading(false);
                this.segments = results.filter(r => r !== null);

                if (this.segments.length !== allPoints.length - 1) {
                    onError('部分路段规划失败');
                    return;
                }
                onSuccess(this.segments);
            })
            .catch(err => {
                UI.showLoading(false);
                onError(`网络请求失败: ${err.message}`);
            });
    },

    /**
     * 规划单段路线
     */
    _planSegment(origin, destination, segmentIndex) {
        return fetch(this._getApiUrl(`${origin.lng},${origin.lat}`, `${destination.lng},${destination.lat}`))
            .then(res => res.json())
            .then(data => {
                let routeData = null;

                if (this.currentMode === CONFIG.MODE.BICYCLING) {
                    // 骑行 API v4
                    if ((data.errcode === 0 || data.status === '1') && data.data) {
                        if (data.data.routes?.[0]?.paths) {
                            routeData = data.data.routes[0];
                        } else if (data.data.paths?.[0]) {
                            routeData = data.data;
                        }
                    }
                } else {
                    // 驾车/步行 API v3
                    if (data.status === '1' && data.route) {
                        routeData = data.route;
                    }
                }

                if (routeData?.paths?.[0]) {
                    return { path: routeData.paths[0], segmentIndex };
                }
                return null;
            });
    },

    /**
     * 绘制路线（统一方法）
     */
    draw(segments) {
        this.clear();
        const colors = this._getColors();

        // 支持单段（数组）或多段
        const segmentList = Array.isArray(segments[0]) ? [{ path: { steps: segments } }] : segments;

        segmentList.forEach(segment => {
            if (!segment?.path?.steps) return;
            const path = this._buildPath(segment.path.steps);
            if (path.length > 0) {
                const polyline = new AMap.Polyline(this._buildPolylineOptions(path, colors));
                MapManager.add(polyline);
                this.polylines.push(polyline);
            }
        });

        setTimeout(() => MapManager.fitView([...MarkerManager.getOverlays(), ...this.polylines]), 100);
    },

    _buildPath(steps) {
        return steps.flatMap(step =>
            step.polyline.split(';').map(point => {
                const [lng, lat] = point.split(',');
                return [parseFloat(lng), parseFloat(lat)];
            })
        );
    },

    clear() {
        this.polylines.forEach(p => MapManager.remove(p));
        this.polylines = [];
        this.segments = [];
    },

    // 格式化方法委托给 Utils
    formatDistance: Utils.formatDistance,
    formatDuration: Utils.formatDuration
};
