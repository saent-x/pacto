const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

config.resolver.assetExts.push('bin', 'gguf', 'mlmodel', 'mlmodelc', 'tflite');

const defaultResolveRequest = config.resolver.resolveRequest;
const zustandMiddlewarePath = require.resolve('zustand/middleware');

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === 'web' && moduleName === 'zustand/middleware') {
    return {
      type: 'sourceFile',
      filePath: zustandMiddlewarePath,
    };
  }

  return defaultResolveRequest
    ? defaultResolveRequest(context, moduleName, platform)
    : context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
