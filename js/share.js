/**
 * 路线分享模块
 * 提供路线 URL 生成、二维码渲染、分享链接复制功能
 */
const ShareManager = {

    /**
     * 生成路线分享数据对象
     */
    buildShareData() {
        const start = MarkerManager.getStart();
        const end = MarkerManager.getEnd();
        const waypoints = MarkerManager.getWaypoints();

        if (!start || !end) return null;

        return {
            v: '1',           // 版本号，便于后续兼容
            m: RouteManager.currentMode,
            s: `${start.lng.toFixed(6)},${start.lat.toFixed(6)}`,
            e: `${end.lng.toFixed(6)},${end.lat.toFixed(6)}`,
            w: waypoints.map(wp => `${wp.lng.toFixed(6)},${wp.lat.toFixed(6)}`).join('|')
        };
    },

    /**
     * 从 URL 参数解析路线数据
     * @returns {Object|null} 解析后的路线数据
     */
    parseShareData() {
        const params = new URLSearchParams(window.location.search);
        const r = params.get('r');
        if (!r) return null;

        try {
            const decoded = atob(r);
            const data = JSON.parse(decoded);

            // 版本兼容性检查
            if (!data.s || !data.e) return null;

            return {
                version: data.v || '1',
                mode: data.m,
                start: data.s,
                end: data.e,
                waypoints: data.w || ''
            };
        } catch (e) {
            console.error('解析分享链接失败:', e);
            return null;
        }
    },

    /**
     * 从解析数据导入路线到地图
     */
    importFromShareData(data) {
        if (!data) return;

        // 清除现有路线
        MarkerManager.clearAll();
        RouteManager.clear();
        UI.elements.waypointsContainer.innerHTML = '';
        UI.waypointCount = 0;

        // 解析起点
        const [sLng, sLat] = data.start.split(',').map(Number);
        const startLngLat = new AMap.LngLat(sLng, sLat);
        MarkerManager.setStart(startLngLat);
        UI.elements.startInput.value = '分享的起点';

        // 解析途径点
        if (data.waypoints) {
            const wpList = data.waypoints.split('|').filter(Boolean);
            wpList.forEach((wp, index) => {
                const [wLng, wLat] = wp.split(',').map(Number);
                UI.addWaypointInput(index); // presetIndex 模式
                const waypointLngLat = new AMap.LngLat(wLng, wLat);
                MarkerManager.setWaypoint(index, waypointLngLat);
                const input = document.getElementById(`waypointInput${index}`);
                if (input) input.value = `途径点${index + 1}`;
            });
            UI.waypointCount = wpList.length;
        }

        // 解析终点
        const [eLng, eLat] = data.end.split(',').map(Number);
        const endLngLat = new AMap.LngLat(eLng, eLat);
        MarkerManager.setEnd(endLngLat);
        UI.elements.endInput.value = '分享的终点';

        // 恢复导航模式
        if (data.mode !== undefined) {
            RouteManager.setMode(data.mode);
            UI.setActiveMode(data.mode);
        }

        // 隐藏URL参数（不刷新页面）
        const url = new URL(window.location.href);
        url.searchParams.delete('r');
        window.history.replaceState({}, '', url);

        // 弹出提示
        UI.hideError();
        setTimeout(() => {
            UI.startNavigation();
        }, 600);
    },

    /**
     * 生成完整分享链接
     */
    buildShareUrl() {
        const data = this.buildShareData();
        if (!data) return null;

        const json = JSON.stringify(data);
        const encoded = btoa(encodeURIComponent(json));
        const baseUrl = window.location.href.split('?')[0];
        return `${baseUrl}?r=${encoded}`;
    },

    /**
     * 复制链接到剪贴板
     */
    async copyLink() {
        const url = this.buildShareUrl();
        if (!url) {
            UI.showError('请先规划路线后再分享');
            return false;
        }

        try {
            await navigator.clipboard.writeText(url);
            return true;
        } catch {
            // fallback
            const textarea = document.createElement('textarea');
            textarea.value = url;
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
            return true;
        }
    },

    /**
     * 渲染二维码（使用 qrcode-generator，无依赖）
     * @param {HTMLElement} container - 二维码挂载容器
     * @param {string} text - 二维码内容文本
     * @param {number} size - 二维码像素尺寸
     */
    renderQRCode(container, text, size = 200) {
        container.innerHTML = '';

        // 动态加载 qrcode-generator（轻量，无外部依赖）
        const loadQR = () => {
            return new Promise((resolve, reject) => {
                if (window.QRCode) { resolve(); return; }
                const s = document.createElement('script');
                s.src = 'https://cdn.jsdelivr.net/npm/davidshimjs-qrcodejs@0.0.2/qrcode.min.js';
                s.onload = resolve;
                s.onerror = reject;
                document.head.appendChild(s);
            });
        };

        loadQR().then(() => {
            new QRCode(container, {
                text: text,
                width: size,
                height: size,
                colorDark: '#1a1a2e',
                colorLight: '#ffffff',
                correctLevel: QRCode.CorrectLevel.M
            });
        }).catch(() => {
            container.innerHTML = '<p style="color:#999;font-size:12px;text-align:center;">二维码加载失败<br>请直接复制上方链接</p>';
        });
    },

    /**
     * 显示分享弹窗
     */
    showShareModal() {
        const url = this.buildShareUrl();
        if (!url) {
            UI.showError('请先规划路线后再分享');
            return;
        }

        // 填充链接
        const linkInput = document.getElementById('shareLinkInput');
        if (linkInput) linkInput.value = url;

        // 更新导出按钮状态
        const exportBtnModal = document.getElementById('exportBtnModal');
        if (exportBtnModal) {
            const hasRoute = MarkerManager.hasStart() && MarkerManager.hasEnd();
            exportBtnModal.disabled = !hasRoute;
        }

        // 渲染二维码
        const qrContainer = document.getElementById('qrcodeContainer');
        if (qrContainer) {
            this.renderQRCode(qrContainer, url, 180);
        }

        // 显示弹窗
        const modal = document.getElementById('shareModal');
        if (modal) {
            modal.classList.add('show');
        }
    },

    /**
     * 隐藏分享弹窗
     */
    hideShareModal() {
        const modal = document.getElementById('shareModal');
        if (modal) {
            modal.classList.remove('show');
        }
    },

    /**
     * 复制分享链接
     */
    async copyShareLink() {
        const success = await this.copyLink();
        if (success) {
            const btn = document.getElementById('copyLinkBtn');
            if (btn) {
                const original = btn.textContent;
                btn.textContent = '✓ 已复制';
                btn.classList.add('copied');
                setTimeout(() => {
                    btn.textContent = original;
                    btn.classList.remove('copied');
                }, 2000);
            }
        }
    }
};
