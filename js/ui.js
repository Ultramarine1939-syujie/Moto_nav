/**
 * UI交互模块
 * 负责界面交互和状态管理
 */
const UI = {
    elements: {},
    waypointCount: 0,
    maxWaypoints: 10,

    /**
     * 初始化UI
     */
    init() {
        this.cacheElements();
        this.bindEvents();
        // 检查URL是否有分享路线参数
        const shareData = ShareManager.parseShareData();
        if (shareData) {
            setTimeout(() => {
                ShareManager.importFromShareData(shareData);
            }, 800);
        }
    },

    /**
     * 缓存DOM元素
     */
    cacheElements() {
        this.elements = {
            status: document.getElementById('status'),
            startInput: document.getElementById('startInput'),
            endInput: document.getElementById('endInput'),
            clearStartBtn: document.getElementById('clearStartBtn'),
            clearEndBtn: document.getElementById('clearEndBtn'),
            modeSwitch: document.getElementById('modeSwitch'),
            resetBtn: document.getElementById('resetBtn'),
            navBtn: document.getElementById('navBtn'),
            routeInfo: document.getElementById('routeInfo'),
            loading: document.getElementById('loading'),
            errorMsg: document.getElementById('errorMsg'),
            waypointsContainer: document.getElementById('waypointsContainer'),
            addWaypointBtn: document.getElementById('addWaypointBtn'),
            mapStyleBtn: document.getElementById('mapStyleBtn'),
            trafficBtn: document.getElementById('trafficBtn'),
            searchInput: document.getElementById('searchInput'),
            searchBtn: document.getElementById('searchBtn'),
            searchResults: document.getElementById('searchResults'),
            weatherBtn: document.getElementById('weatherBtn'),
            shareBtn: document.getElementById('shareBtn'),
            shareModal: document.getElementById('shareModal')
        };
    },

    /**
     * 绑定事件
     */
    bindEvents() {
        // 清除起点
        this.elements.clearStartBtn.addEventListener('click', () => {
            MarkerManager.clearStart();
            RouteManager.clear();
            this.resetRouteInfo();
        });

        // 清除终点
        this.elements.clearEndBtn.addEventListener('click', () => {
            MarkerManager.clearEnd();
            RouteManager.clear();
            this.resetRouteInfo();
        });

        // 重置
        this.elements.resetBtn.addEventListener('click', () => {
            MarkerManager.clearAll();
            RouteManager.clear();
            this.resetRouteInfo();
            this.updateStatus();
        });

        // 开始导航
        this.elements.navBtn.addEventListener('click', () => {
            this.startNavigation();
        });

        // 添加途径点按钮
        this.elements.addWaypointBtn.addEventListener('click', () => {
            this.addWaypointInput();
        });

        // 模式切换
        this.elements.modeSwitch.addEventListener('click', (e) => {
            const btn = e.target.closest('.mode-btn');
            if (btn) {
                const mode = parseInt(btn.dataset.mode);
                this.setActiveMode(mode);
                RouteManager.setMode(mode);
                
                // 如果已有路线，重新规划
                if (MarkerManager.hasStart() && MarkerManager.hasEnd()) {
                    this.startNavigation();
                }
            }
        });

        // 底图样式切换 - 单一按钮切换灰度/彩色
        this.elements.mapStyleBtn.addEventListener('click', () => {
            MapManager.toggleMapStyle();
            this.updateMapStyleButton();
        });

        // 拥堵图层切换
        this.elements.trafficBtn.addEventListener('click', () => {
            const isOn = MapManager.toggleTraffic();
            this.updateTrafficButton(isOn);
        });

        // 初始化拥堵按钮状态
        this.updateTrafficButton(MapManager.isTrafficOn());

        // 途经点操作事件委托（重建 DOM 后仍可用）
        this.elements.waypointsContainer.addEventListener('click', (e) => {
            const target = e.target;
            if (target.classList.contains('wp-move-up')) {
                this.moveWaypoint(parseInt(target.dataset.index, 10), -1);
            } else if (target.classList.contains('wp-move-down')) {
                this.moveWaypoint(parseInt(target.dataset.index, 10), 1);
            } else if (target.classList.contains('clear-btn')) {
                this.removeWaypointInput(parseInt(target.dataset.index, 10));
            }
        });

        // 途经点容器拖拽排序
        this.initWaypointDragSort();

        // 搜索按钮点击
        this.elements.searchBtn.addEventListener('click', () => {
            this.performSearch();
        });

        // 搜索输入框回车
        this.elements.searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.performSearch();
            }
        });

        // 点击其他地方关闭搜索结果
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.search-box') && !e.target.closest('.search-results')) {
                this.hideSearchResults();
            }
        });

        // 天气按钮
        this.elements.weatherBtn.addEventListener('click', () => {
            this.fetchAndShowWeather();
        });

        // 分享按钮
        this.elements.shareBtn.addEventListener('click', () => {
            ShareManager.showShareModal();
        });

        // 点击遮罩关闭分享弹窗（但点击弹窗内容时不关闭）
        if (this.elements.shareModal) {
            this.elements.shareModal.addEventListener('click', (e) => {
                if (e.target === this.elements.shareModal) {
                    ShareManager.hideShareModal();
                }
            });
        }

        // 分享弹窗内导入文件处理
        const importFileModal = document.getElementById('importFileModal');
        if (importFileModal) {
            importFileModal.addEventListener('change', (e) => {
                this.importRoute(e.target.files[0]);
                e.target.value = ''; // 重置以便重复选择同一文件
                // 导入成功后关闭弹窗
                setTimeout(() => {
                    ShareManager.hideShareModal();
                }, 500);
            });
        }
    },

    /**
     * 设置起点地址（带填充动画）
     */
    setStartAddress(address) {
        this.elements.startInput.value = address;
        this._flashInput(this.elements.startInput);
    },

    /**
     * 设置终点地址（带填充动画）
     */
    setEndAddress(address) {
        this.elements.endInput.value = address;
        this._flashInput(this.elements.endInput);
    },

    /**
     * 输入框填充闪烁动画
     */
    _flashInput(el) {
        el.classList.remove('just-filled');
        void el.offsetWidth;
        el.classList.add('just-filled');
        setTimeout(() => el.classList.remove('just-filled'), 700);
    },

    /**
     * 添加途径点输入框
     * @param {number|null} presetIndex - 预设索引（用于导入路线时指定索引）
     */
    addWaypointInput(presetIndex = null) {
        if (this.waypointCount >= this.maxWaypoints) {
            this.showError(`最多只能添加${this.maxWaypoints}个途径点`);
            return;
        }

        const index = presetIndex !== null ? presetIndex : this.waypointCount;
        this.waypointCount = Math.max(this.waypointCount, index + 1);

        const waypointHtml = `
            <div class="waypoint-input" data-index="${index}" draggable="true" title="可拖拽调整顺序">
                <div class="marker">${index + 1}</div>
                <input type="text" id="waypointInput${index}" placeholder="点击地图选择途径点" readonly>
                <div class="waypoint-actions">
                    <button class="wp-move-up" data-index="${index}" title="上移">▲</button>
                    <button class="wp-move-down" data-index="${index}" title="下移">▼</button>
                    <button class="clear-btn" data-index="${index}" title="清除途径点">×</button>
                </div>
            </div>
        `;

        this.elements.waypointsContainer.insertAdjacentHTML('beforeend', waypointHtml);

        // 自动进入地图选择模式（仅在手动添加时，导入时不触发）
        if (presetIndex === null) {
            this.setWaypointAddingMode(true);
            MapEvents.startAddWaypoint(index);
        }

        // 更新按钮状态
        this.updateAddWaypointButton();

        return index;
    },

    /**
     * 移除途径点输入框
     */
    removeWaypointInput(index) {
        const snapshot = this._captureWaypointSnapshot();
        if (!snapshot[index]) {
            return;
        }

        snapshot.splice(index, 1);
        this._rebuildWaypoints(snapshot, { replanRoute: true });
    },

    /**
     * 按当前界面顺序抓取途径点快照
     */
    _captureWaypointSnapshot() {
        const items = this.elements.waypointsContainer.querySelectorAll('.waypoint-input');
        return Array.from(items).map((el) => {
            const sourceIndex = parseInt(el.dataset.index, 10);
            const input = el.querySelector('input');
            const lngLat = MarkerManager.waypointLngLats[sourceIndex];
            return {
                lngLat: lngLat ? { lng: lngLat.lng, lat: lngLat.lat } : null,
                address: input ? input.value : ''
            };
        });
    },

    /**
     * 根据快照重建途径点 UI 和地图标记
     */
    _rebuildWaypoints(snapshot, options = {}) {
        const { replanRoute = false, animateDrop = false } = options;
        const container = this.elements.waypointsContainer;

        MapEvents.cancelAddWaypoint();
        this.setWaypointAddingMode(false);

        MarkerManager.clearAllWaypoints();
        container.innerHTML = '';
        this.waypointCount = 0;

        snapshot.forEach((data, index) => {
            this.addWaypointInput(index);

            const input = document.getElementById(`waypointInput${index}`);
            if (input && data.address) {
                input.value = data.address;
            }

            if (data.lngLat) {
                const lngLat = new AMap.LngLat(data.lngLat.lng, data.lngLat.lat);
                MarkerManager.setWaypoint(index, lngLat);
            }
        });

        this.waypointCount = snapshot.length;
        this.updateAddWaypointButton();
        this.updateNavButton();

        if (animateDrop) {
            setTimeout(() => {
                container.querySelectorAll('.waypoint-input').forEach((el) => {
                    el.classList.add('just-dropped');
                    setTimeout(() => el.classList.remove('just-dropped'), 300);
                });
            }, 40);
        }

        RouteManager.clear();
        if (replanRoute && MarkerManager.hasStart() && MarkerManager.hasEnd()) {
            this.startNavigation();
        }
    },

    /**
     * 设置途径点地址（带填充动画）
     */
    setWaypointAddress(index, address) {
        const input = document.getElementById(`waypointInput${index}`);
        if (input) {
            input.value = address;
            this._flashInput(input);
        }
    },

    /**
     * 清除途径点地址
     */
    clearWaypointAddress(index) {
        const input = document.getElementById(`waypointInput${index}`);
        if (input) {
            input.value = '';
        }
    },

    /**
     * 设置途径点添加模式状态
     */
    setWaypointAddingMode(adding) {
        if (adding) {
            this.elements.status.textContent = '点击地图选择途径点位置';
            this.elements.addWaypointBtn.classList.add('adding');
        } else {
            this.updateStatus();
            this.elements.addWaypointBtn.classList.remove('adding');
        }
    },

    /**
     * 更新添加途径点按钮状态
     */
    updateAddWaypointButton() {
        this.elements.addWaypointBtn.disabled = this.waypointCount >= this.maxWaypoints;
        if (this.waypointCount >= this.maxWaypoints) {
            this.elements.addWaypointBtn.style.opacity = '0.5';
            this.elements.addWaypointBtn.style.cursor = 'not-allowed';
        } else {
            this.elements.addWaypointBtn.style.opacity = '1';
            this.elements.addWaypointBtn.style.cursor = 'pointer';
        }
    },

    /**
     * 更新状态栏（带脉冲动画）
     */
    updateStatus() {
        let text = '';
        if (!MarkerManager.hasStart()) {
            text = '点击地图选择起点';
        } else if (!MarkerManager.hasEnd()) {
            text = '点击地图选择终点';
        } else {
            text = '✓ 路线已规划';
        }
        if (this.elements.status.textContent !== text) {
            this.elements.status.textContent = text;
            this.elements.status.classList.remove('updated');
            void this.elements.status.offsetWidth; // reflow
            this.elements.status.classList.add('updated');
        }
    },

    /**
     * 更新导航按钮状态
     */
    updateNavButton() {
        const hasPoints = MarkerManager.hasStart() && MarkerManager.hasEnd();
        this.elements.navBtn.disabled = !hasPoints;
        this.elements.weatherBtn.disabled = !hasPoints;
        this.elements.shareBtn.disabled = !hasPoints;
    },

    /**
     * 设置激活的模式按钮
     */
    setActiveMode(mode) {
        const buttons = this.elements.modeSwitch.querySelectorAll('.mode-btn');
        buttons.forEach(btn => {
            btn.classList.toggle('active', parseInt(btn.dataset.mode) === mode);
        });
    },

    /**
     * 开始导航（分段规划）
     */
    startNavigation() {
        RouteManager.planMultiSegment(
            (segments) => this.displayRoute(segments),
            (error) => this.showError(error)
        );
    },

    /**
     * 显示路线（支持多段）
     */
    displayRoute(segments) {
        // 绘制多段路线
        RouteManager.draw(segments);

        // 计算总距离和时间
        let totalDistance = 0;
        let totalDuration = 0;

        segments.forEach(segment => {
            if (segment && segment.path) {
                totalDistance += parseInt(segment.path.distance);
                totalDuration += parseInt(segment.path.duration);
            }
        });

        // 构建分段路线信息
        const waypoints = MarkerManager.getWaypoints();
        const pointLabels = ['起点', ...waypoints.map((_, i) => `途径点${i + 1}`), '终点'];

        let segmentsHtml = '';
        let stepCounter = 1;

        segments.forEach((segment, segIndex) => {
            if (!segment || !segment.path) return;

            const path = segment.path;
            const fromLabel = pointLabels[segIndex] || `点${segIndex + 1}`;
            const toLabel = pointLabels[segIndex + 1] || '终点';

            // 分段小标题
            segmentsHtml += `
                <div class="segment-header">
                    <span class="segment-label">${fromLabel} → ${toLabel}</span>
                    <span class="segment-info">${Utils.formatDistance(path.distance)} / ${Utils.formatDuration(path.duration)}</span>
                </div>
            `;

            // 该段的前几步指引
            if (path.steps && path.steps.length > 0) {
                path.steps.slice(0, 4).forEach((step) => {
                    segmentsHtml += `
                        <div class="step">
                            <div class="step-icon">${stepCounter++}</div>
                            <div class="step-content">
                                <div class="instruction">${step.instruction}</div>
                                <div class="distance">${Utils.formatDistance(step.distance)}</div>
                            </div>
                        </div>
                    `;
                });
            }
        });

        const modeLabels = {
            [CONFIG.MODE.BICYCLING]: '🛵 骑行路线',
            [CONFIG.MODE.DRIVING]: '🚗 驾车路线',
            [CONFIG.MODE.WALKING]: '🚶 步行路线'
        };

        const segmentCount = segments.filter(s => s !== null).length;
        const routeType = segmentCount > 1 ? `（${segmentCount}段路线）` : '';

        this.elements.routeInfo.innerHTML = `
            <h3>${modeLabels[RouteManager.currentMode]}${routeType}</h3>
            <div class="info-card">
                <div class="route-summary">
                    <div class="summary-item">
                        <div class="icon">📍</div>
                        <div class="label">总距离</div>
                        <div class="value distance animated">${Utils.formatDistance(totalDistance)}</div>
                    </div>
                    <div class="summary-item">
                        <div class="icon">⏱️</div>
                        <div class="label">预计时间</div>
                        <div class="value time animated">${Utils.formatDuration(totalDuration)}</div>
                    </div>
                </div>
            </div>

            <div class="weather-title" style="margin: 20px 0 10px 0; font-size: 16px; font-weight: bold;">🌤️ 天气信息</div>
            <div class="weather-section"> </div>

            <div class="steps-title" style="margin: 20px 0 10px 0; font-size: 16px; font-weight: bold;">🗺️ 导航指引</div>
            <div class="steps">${segmentsHtml}</div>
        `;

        // 路线完成后导航按钮闪烁提示
        this.elements.navBtn.classList.remove('route-ready');
        void this.elements.navBtn.offsetWidth;
        this.elements.navBtn.classList.add('route-ready');

        // 自动获取沿途天气
        this.fetchAndShowWeather();
    },

    /**
     * 获取并展示沿途天气（渲染到独立天气面板）
     */
    fetchAndShowWeather() {
        const toast = document.getElementById('weatherToast');
        if (toast) {
            toast.style.display = 'flex';
            toast.style.animation = 'toastIn 0.3s ease both';
        }

        WeatherManager.fetchRouteWeather().then(weatherData => {
            if (toast) toast.style.display = 'none';
            this.renderWeatherPanel(weatherData);
        }).catch(() => {
            if (toast) toast.style.display = 'none';
        });
    },

    /**
     * 渲染天气区域（route-info 内的并列区域）
     */
    renderWeatherPanel(weatherData) {
        const section = document.querySelector('.weather-section');
        if (!section) return;

        const weatherHtml = WeatherManager.renderWeatherCard(weatherData);

        if (!weatherData || weatherData.filter(d => d.weather).length === 0) {
            section.innerHTML = `
                <div class="weather-empty">
                    <span class="icon">🌤</span>
                    <span>暂无法获取天气数据</span>
                </div>
            `;
        } else {
            section.innerHTML = weatherHtml;
        }
    },

    /**
     * 重置路线信息
     */
    resetRouteInfo() {
        this.elements.routeInfo.innerHTML = `
            <div class="empty-state">
                <div class="icon">🗺️</div>
                <p>在地图上点击选择起点和终点<br>即可规划骑行路线</p>
            </div>
        `;
        this.elements.waypointsContainer.innerHTML = '';
        this.waypointCount = 0;
        this.updateAddWaypointButton();
        this.updateNavButton();
    },

    /**
     * 显示加载
     */
    showLoading(show) {
        this.elements.loading.classList.toggle('show', show);
        if (show) {
            this.elements.routeInfo.style.display = 'none';
        } else {
            this.elements.routeInfo.style.display = 'block';
        }
    },

    /**
     * 显示错误
     */
    showError(msg) {
        this.elements.errorMsg.textContent = msg;
        this.elements.errorMsg.classList.add('show');
    },

    /**
     * 隐藏错误
     */
    hideError() {
        this.elements.errorMsg.classList.remove('show');
    },

    /**
     * 执行搜索
     */
    performSearch() {
        const keyword = this.elements.searchInput.value.trim();
        if (keyword.length < 2) {
            this.showSearchHint('请输入至少2个字符进行搜索');
            return;
        }

        this.showSearchLoading();
        this.elements.searchBtn.disabled = true;
        this.currentSearchResults = [];

        Geocoder.search(keyword, (results) => {
            this.elements.searchBtn.disabled = false;
            this.currentSearchResults = results;
            if (results.length > 0) {
                this.displaySearchResults(results);
            } else {
                this.showSearchEmpty();
            }
        });
    },

    /**
     * 当前搜索结果缓存
     */
    currentSearchResults: [],

    /**
     * 当前选中的分类
     */
    currentCategory: '全部',

    /**
     * 显示搜索加载中
     */
    showSearchLoading() {
        this.elements.searchResults.innerHTML = `
            <div class="search-loading">
                <div class="spinner" style="width:24px;height:24px;border-width:2px;margin-bottom:10px;"></div>
                <p>搜索中...</p>
            </div>
        `;
        this.elements.searchResults.classList.add('show');
    },

    /**
     * 显示搜索提示
     */
    showSearchHint(message) {
        this.elements.searchResults.innerHTML = `
            <div class="search-hint">${message}</div>
        `;
        this.elements.searchResults.classList.add('show');
    },

    /**
     * 显示无结果
     */
    showSearchEmpty() {
        this.elements.searchResults.innerHTML = `
            <div class="search-empty">未找到相关地点，请尝试其他关键词</div>
        `;
        this.elements.searchResults.classList.add('show');
    },

    /**
     * 显示搜索结果（分类视图）
     */
    displaySearchResults(results) {
        const grouped = Utils.groupByCategory(results);
        const categories = Object.keys(grouped);

        // 分类标签栏HTML
        const categoryBarHtml = `
            <div class="search-category-bar">
                <button class="search-category-btn active" data-category="全部">
                    📍 全部 (${results.length})
                </button>
                ${categories.map(cat => `
                    <button class="search-category-btn" data-category="${cat}">
                        ${Utils.CATEGORY_ICONS[cat] || '📌'} ${cat} (${grouped[cat].length})
                    </button>
                `).join('')}
            </div>
        `;

        // 生成带分类的结果HTML
        let resultsHtml = '';
        categories.forEach(category => {
            const items = grouped[category];
            const icon = Utils.CATEGORY_ICONS[category] || '📌';
            resultsHtml += `
                <div class="search-category-group category-${category}">
                    <div class="search-category-header">
                        ${icon} ${category}
                        <span class="count">${items.length}</span>
                    </div>
                    ${items.map(item => this.renderSearchItem(item)).join('')}
                </div>
            `;
        });

        this.elements.searchResults.innerHTML = categoryBarHtml + resultsHtml;
        this.elements.searchResults.classList.add('show');

        // 绑定分类切换事件
        this.bindCategoryEvents();

        // 绑定结果项点击事件
        this.bindResultItemEvents();
    },

    /**
     * 渲染单个搜索结果项
     */
    renderSearchItem(result) {
        const index = this.currentSearchResults.indexOf(result);
        const category = Utils.getPOICategory(result.typecode, result.type);
        const icon = Utils.CATEGORY_ICONS[category] || '📌';
        const shortType = result.type ? result.type.split(';')[0].substring(0, 8) : '';
        const locationStr = result.adname || result.cityname || '';

        // 判断可用的快捷操作
        const hasStart = MarkerManager.hasStart();
        const hasEnd = MarkerManager.hasEnd();
        const canAddWaypoint = this.waypointCount < this.maxWaypoints;

        return `
            <div class="search-result-item" data-index="${index}">
                <div class="search-result-icon">${icon}</div>
                <div class="search-result-content">
                    <div class="name">
                        ${result.name}
                        ${shortType ? `<span class="type-tag">${shortType}</span>` : ''}
                    </div>
                    <div class="address">${result.address || locationStr}</div>
                </div>
                <div class="search-result-action">
                    ${!hasStart ? `<button class="start-btn" data-action="start">起点</button>` : ''}
                    ${hasStart && !hasEnd ? `<button class="end-btn" data-action="end">终点</button>` : ''}
                    ${hasStart && hasEnd && canAddWaypoint ? `<button class="wp-btn" data-action="waypoint">途经</button>` : ''}
                </div>
            </div>
        `;
    },

    /**
     * 绑定分类切换事件
     */
    bindCategoryEvents() {
        const btns = this.elements.searchResults.querySelectorAll('.search-category-btn');
        btns.forEach(btn => {
            btn.addEventListener('click', () => {
                // 更新按钮状态
                btns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                const category = btn.dataset.category;
                this.filterByCategory(category);
            });
        });
    },

    /**
     * 按分类筛选
     */
    filterByCategory(category) {
        const groups = this.elements.searchResults.querySelectorAll('.search-category-group');
        groups.forEach(group => {
            if (category === '全部') {
                group.style.display = 'block';
            } else {
                group.style.display = group.classList.contains(`category-${category}`) ? 'block' : 'none';
            }
        });
    },

    /**
     * 绑定结果项点击事件
     */
    bindResultItemEvents() {
        // 整个项点击选择
        this.elements.searchResults.querySelectorAll('.search-result-item').forEach(item => {
            item.addEventListener('click', (e) => {
                // 如果点击的是操作按钮，不触发选择
                if (e.target.closest('.search-result-action')) return;

                const index = parseInt(item.dataset.index);
                this.selectSearchResult(this.currentSearchResults[index]);
            });
        });

        // 快捷操作按钮
        this.elements.searchResults.querySelectorAll('.search-result-action button').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const item = btn.closest('.search-result-item');
                const index = parseInt(item.dataset.index);
                const action = btn.dataset.action;
                this.quickSetLocation(this.currentSearchResults[index], action);
            });
        });
    },

    /**
     * 快速设置位置
     */
    quickSetLocation(result, action) {
        const [lng, lat] = result.location.split(',');
        const lngLat = new AMap.LngLat(parseFloat(lng), parseFloat(lat));

        switch (action) {
            case 'start':
                MarkerManager.setStart(lngLat);
                this.elements.startInput.value = result.name;
                break;
            case 'end':
                MarkerManager.setEnd(lngLat);
                this.elements.endInput.value = result.name;
                break;
            case 'waypoint':
                const wpIndex = this.addWaypointInput();
                MarkerManager.setWaypoint(wpIndex, lngLat);
                this.setWaypointAddress(wpIndex, result.name);
                break;
        }

        MapEvents.cancelAddWaypoint();
        this.setWaypointAddingMode(false);

        // 地图定位
        MapManager.fitView([MarkerManager.getStart() || lngLat, lngLat], [50, 50, 50, 50]);

        // 刷新搜索结果中的按钮状态
        this.displaySearchResults(this.currentSearchResults);
    },

    /**
     * 选择搜索结果
     */
    selectSearchResult(result) {
        const [lng, lat] = result.location.split(',');
        const lngLat = new AMap.LngLat(parseFloat(lng), parseFloat(lat));

        // 判断应该设置哪个点
        if (!MarkerManager.hasStart()) {
            MarkerManager.setStart(lngLat);
            this.elements.startInput.value = result.name;
        } else if (!MarkerManager.hasEnd()) {
            MarkerManager.setEnd(lngLat);
            this.elements.endInput.value = result.name;
        } else {
            // 起点终点都已设置，自动设为途径点
            if (this.waypointCount < this.maxWaypoints) {
                const wpIndex = this.addWaypointInput();
                MarkerManager.setWaypoint(wpIndex, lngLat);
                this.setWaypointAddress(wpIndex, result.name);
            } else {
                this.showError('已达最大途径点数量');
            }
        }

        MapEvents.cancelAddWaypoint();
        this.setWaypointAddingMode(false);

        // 地图定位到该点
        MapManager.fitView([MarkerManager.getStart() || lngLat, lngLat], [50, 50, 50, 50]);

        // 清空搜索并关闭
        this.elements.searchInput.value = '';
        this.hideSearchResults();
        this.hideError();
    },

    /**
     * 隐藏搜索结果
     */
    hideSearchResults() {
        this.elements.searchResults.classList.remove('show');
    },

    /**
     * 更新底图切换按钮状态（仅图标切换）
     */
    updateMapStyleButton() {
        const isGrey = MapManager.isGrey();
        const btn = this.elements.mapStyleBtn;
        btn.classList.toggle('active', isGrey);
        const icon = btn.querySelector('.icon');
        icon.textContent = isGrey ? '◐' : '◑';
    },

    /**
     * 导出路线
     */
    exportRoute() {
        const start = MarkerManager.getStart();
        const end = MarkerManager.getEnd();
        const waypoints = MarkerManager.getWaypoints();

        if (!start || !end) {
            this.showError('请先规划路线后再导出');
            return;
        }

        const routeData = {
            version: '1.0',
            exportTime: new Date().toISOString(),
            mode: RouteManager.currentMode,
            start: {
                lng: start.lng,
                lat: start.lat,
                address: this.elements.startInput.value
            },
            end: {
                lng: end.lng,
                lat: end.lat,
                address: this.elements.endInput.value
            },
            waypoints: waypoints.map((wp, i) => {
                const input = document.getElementById(`waypointInput${i}`);
                return {
                    lng: wp.lng,
                    lat: wp.lat,
                    address: input ? input.value : ''
                };
            })
        };

        const blob = new Blob([JSON.stringify(routeData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `骑行路线_${new Date().toLocaleDateString().replace(/\//g, '-')}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    },

    /**
     * 导入路线
     */
    importRoute(file) {
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);

                // 验证数据格式
                if (!data.start || !data.end) {
                    throw new Error('路线文件格式错误，缺少起点或终点');
                }

                // 清除现有路线
                MarkerManager.clearAll();
                RouteManager.clear();
                this.elements.waypointsContainer.innerHTML = '';
                this.waypointCount = 0;

                // 设置起点
                const startLngLat = new AMap.LngLat(data.start.lng, data.start.lat);
                MarkerManager.setStart(startLngLat);
                this.elements.startInput.value = data.start.address || '已导入';

                // 设置途径点
                if (data.waypoints && data.waypoints.length > 0) {
                    data.waypoints.forEach((wp, index) => {
                        this.addWaypointInput(index); // 使用预设索引
                        const waypointLngLat = new AMap.LngLat(wp.lng, wp.lat);
                        MarkerManager.setWaypoint(index, waypointLngLat);
                        const input = document.getElementById(`waypointInput${index}`);
                        if (input) input.value = wp.address || '已导入';
                    });
                    this.waypointCount = data.waypoints.length; // 同步计数
                }

                // 设置终点
                const endLngLat = new AMap.LngLat(data.end.lng, data.end.lat);
                MarkerManager.setEnd(endLngLat);
                this.elements.endInput.value = data.end.address || '已导入';

                // 恢复导航模式
                if (data.mode !== undefined) {
                    RouteManager.setMode(data.mode);
                    this.setActiveMode(data.mode);
                }

                // 自动规划路线
                setTimeout(() => {
                    this.startNavigation();
                }, 500);

                this.hideError();
            } catch (err) {
                this.showError(`导入失败: ${err.message}`);
            }
        };

        reader.onerror = () => {
            this.showError('文件读取失败');
        };

        reader.readAsText(file);
    },

    /**
     * 更新拥堵图层按钮状态（仅图标，无文字）
     */
    updateTrafficButton(isOn) {
        this.elements.trafficBtn.classList.toggle('active', isOn);
        // 只切换图标，无需文字
    },

    /**
     * 初始化途经点拖拽排序
     */
    initWaypointDragSort() {
        const container = this.elements.waypointsContainer;
        let draggedItem = null;

        container.addEventListener('dragstart', (e) => {
            const waypointInput = e.target.closest('.waypoint-input');
            if (!waypointInput || e.target.closest('.waypoint-actions')) return;

            draggedItem = waypointInput;
            waypointInput.classList.add('dragging');
            container.classList.add('drag-active');

            if (e.dataTransfer) {
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/plain', waypointInput.dataset.index);
            }
        });

        container.addEventListener('dragend', (e) => {
            const waypointInput = e.target.closest('.waypoint-input');
            if (waypointInput) {
                waypointInput.classList.remove('dragging');
            }
            container.classList.remove('drag-active');
            draggedItem = null;
        });

        container.addEventListener('dragover', (e) => {
            if (!draggedItem) return;

            e.preventDefault();
            if (e.dataTransfer) {
                e.dataTransfer.dropEffect = 'move';
            }

            const afterElement = this._getDragAfterElement(container, e.clientY);
            if (afterElement === null) {
                container.appendChild(draggedItem);
            } else if (afterElement !== draggedItem) {
                container.insertBefore(draggedItem, afterElement);
            }
        });

        container.addEventListener('drop', (e) => {
            e.preventDefault();
            if (!draggedItem) return;

            const changed = Array.from(container.querySelectorAll('.waypoint-input')).some((el, index) => {
                return parseInt(el.dataset.index, 10) !== index;
            });

            if (changed) {
                const snapshot = this._captureWaypointSnapshot();
                this._rebuildWaypoints(snapshot, { replanRoute: true, animateDrop: true });
            }

            container.classList.remove('drag-active');
            draggedItem = null;
        });
    },

    /**
     * 获取拖拽放置位置
     */
    _getDragAfterElement(container, y) {
        const draggableElements = [...container.querySelectorAll('.waypoint-input:not(.dragging)')];

        return draggableElements.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = y - box.top - box.height / 2;
            if (offset < 0 && offset > closest.offset) {
                return { offset: offset, element: child };
            }
            return closest;
        }, { offset: Number.NEGATIVE_INFINITY }).element;
    },

    /**
     * 移动途径点（上下调整顺序）
     */
    moveWaypoint(index, direction) {
        const targetIndex = index + direction;
        if (targetIndex < 0 || targetIndex >= this.waypointCount) {
            return;
        }

        const snapshot = this._captureWaypointSnapshot();
        const temp = snapshot[index];
        snapshot[index] = snapshot[targetIndex];
        snapshot[targetIndex] = temp;

        this._rebuildWaypoints(snapshot, { replanRoute: true, animateDrop: true });
    }
};

/**
 * 应用入口（由 index.html 的 loadAmapAndInit 在高德地图加载完毕后调用）
 * MapManager.init() 和 UI.init() 由外部统一触发，无需在此监听 DOMContentLoaded
 */