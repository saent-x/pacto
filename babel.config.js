// babel-preset-expo (SDK 56) automatically adds react-native-worklets/plugin when
// react-native-worklets is installed — required for Reanimated 4 worklets/gestures.
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
  };
};
