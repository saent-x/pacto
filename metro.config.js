const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

config.resolver.assetExts.push('bin', 'gguf', 'mlmodel', 'mlmodelc', 'tflite');

module.exports = config;
