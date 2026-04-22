/**
 * 配置模板文件 - 上传到 GitHub 的安全版本
 *
 * 使用步骤：
 * 1. 复制此文件并命名为 config.js
 *    cp config.template.js config.js
 * 2. 在 config.js 中填入你自己的高德地图 API 密钥
 * 3. 访问 https://console.amap.com/ 申请密钥
 *
 * ⚠️  config.js 已加入 .gitignore，请勿手动提交
 */
const APP_CONFIG = {
    AMAP_WEB_KEY: 'YOUR_AMAP_WEB_API_KEY',   // 高德地图 Web JS API Key
    AMAP_WS_KEY:  'YOUR_AMAP_WS_API_KEY'    // 高德地图 Web 服务 Key（REST API）
};
