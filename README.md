# 摩托车导航 moto-nav_v2.1_fusion

基于高德地图 JS API 2.0 的摩托车路径规划 Web 应用，融合了 `V1.9` 的搜索体验和 `V2` 的途径点调序逻辑。

## 功能特性

- 🏍️ 支持摩托车 / 驾车 / 步行多种出行模式
- 📍 最多支持 10 个途径点的多段路线规划
- 🔄 途径点支持拖拽排序 + 上下移动按钮调整
- ✅ 删除、重排、导入后的途径点会自动重建顺序与地图标记
- 🚦 实时路况显示（拥堵图层开关）
- 🔍 地点搜索（含 POI 分类过滤）
- 🗺️ 灰度 / 彩色底图切换
- 📤 路线导出 / 导入（JSON 格式）
- 🔗 路线分享（链接 + 二维码，微信/QQ一扫即开）
- 🌤 沿途天气（自动查询起点/途径点/终点的实时天气）
- ✨ 流畅的 CSS 动画与交互效果

## 快速开始

### 1. 获取高德地图 API Key

前往 [高德开放平台控制台](https://console.amap.com/) 创建应用，获取：
- **Web 端 JS API Key**（用于地图展示）
- **Web 服务 Key**（用于地理编码 & 路线规划 REST API）

### 2. 配置 API Key

```bash
# 复制配置模板
cp config.template.js config.js
```

然后编辑 `config.js`，填入你的 API Key：

```js
const APP_CONFIG = {
    AMAP_WEB_KEY: 'YOUR_AMAP_WEB_API_KEY',  // 替换为你的 Web JS API Key
    AMAP_WS_KEY:  'YOUR_AMAP_WS_API_KEY'   // 替换为你的 Web 服务 Key
};
```

### 3. 运行

直接用浏览器打开 `index.html` 即可（推荐使用本地服务器，如 VS Code Live Server）。

## 项目结构

```
moto-nav_v2/
├── index.html              # 主页面（入口）
├── config.js               # ⚠️ 本地配置（含 API Key，已被 .gitignore）
├── config.template.js      # 配置模板（无密钥，可安全提交）
├── css/
│   └── style.css           # 全部样式与动画
└── js/
    ├── utils.js            # 工具函数、POI 分类、格式化
    ├── map.js              # 地图初始化、样式切换、路况图层
    ├── marker.js           # 标记点管理（起点/终点/途径点）
    ├── route.js            # 路线规划（分段导航）
    ├── weather.js          # 沿途天气查询与渲染
    ├── share.js            # 路线分享（链接/二维码/文件）
    └── ui.js               # UI 交互、状态管理、事件绑定
```

### 模块依赖关系

```
index.html (入口)
    │
    ├── CONFIG (全局配置)
    │
    └── JS 模块加载顺序:
        utils.js        → 工具函数库（无依赖）
        ├── map.js      → 地图管理
        ├── marker.js   → 标记点管理
        ├── route.js    → 路线规划（依赖 marker）
        ├── weather.js  → 天气查询（依赖 route）
        ├── share.js    → 分享管理（依赖 marker/route）
        └── ui.js       → UI 交互（依赖所有模块）
```

## 安全说明

- `config.js` 已加入 `.gitignore`，不会被提交到 Git 仓库
- 请勿将含有真实 API Key 的 `config.js` 提交或分享
- 高德地图 API Key 建议在控制台设置域名白名单，限制使用范围

## 技术栈

- 高德地图 JavaScript API 2.0
- 原生 JavaScript (ES6+)
- CSS3 动画 / 过渡
- HTML5
