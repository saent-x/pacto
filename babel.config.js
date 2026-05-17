module.exports = function (api) {
  api.cache(true);

  /** @type {import('react-native-worklets/plugin').PluginOptions} */
  const workletsPluginOptions = {
    bundleMode: true,
    strictGlobal: true,
  };

  return {
    presets: ['babel-preset-expo'],
    plugins: [['react-native-worklets/plugin', workletsPluginOptions]],
  };
};
