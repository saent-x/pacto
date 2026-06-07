// Learn more: https://docs.expo.dev/versions/v56.0.0/config/metro/
const { getDefaultConfig } = require('expo/metro-config');
const connect = require('connect');
const { simMiddleware } = require('serve-sim/middleware');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

config.server = config.server || {};
const originalEnhanceMiddleware = config.server.enhanceMiddleware;

config.server.enhanceMiddleware = (metroMiddleware, server) => {
  const middleware = originalEnhanceMiddleware
    ? originalEnhanceMiddleware(metroMiddleware, server)
    : metroMiddleware;

  const app = connect();
  app.use(simMiddleware({ basePath: '/.sim' }));
  app.use(middleware);

  return app;
};

module.exports = config;
