const { getDefaultConfig } = require('expo/metro-config');
const { getBundleModeMetroConfig } = require('react-native-worklets/bundleMode');

let config = getDefaultConfig(__dirname);

config.resolver.assetExts.push('bin', 'gguf', 'mlmodel', 'mlmodelc', 'tflite');

// Worklets Bundle Mode: removes runtime `eval()` of worklet source, which
// fails on release Hermes ("Parsing source code unsupported"). The matching
// `metro` patch (patches/metro+0.84.4.patch) handles the generated `.worklets`
// modules during one-shot bundling.
config = getBundleModeMetroConfig(config);

// getBundleModeMetroConfig replaces resolver.resolveRequest; re-add the
// web-only zustand/middleware alias on top of it.
const bundleModeResolveRequest = config.resolver.resolveRequest;
const zustandMiddlewarePath = require.resolve('zustand/middleware');

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === 'web' && moduleName === 'zustand/middleware') {
    return {
      type: 'sourceFile',
      filePath: zustandMiddlewarePath,
    };
  }

  return bundleModeResolveRequest
    ? bundleModeResolveRequest(context, moduleName, platform)
    : context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
