// Learn more https://docs.expo.dev/guides/customizing-metro/
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// expo-sqlite 在 Web 端使用 wa-sqlite（wasm），需要把 wasm 当作资源打包。
config.resolver.assetExts.push('wasm');

// wa-sqlite 依赖 SharedArrayBuffer，需要跨域隔离响应头（仅开发服务器需要）。
config.server.enhanceMiddleware = (middleware) => {
  return (req, res, next) => {
    res.setHeader('Cross-Origin-Embedder-Policy', 'credentialless');
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    middleware(req, res, next);
  };
};

module.exports = config;
