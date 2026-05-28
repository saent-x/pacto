const appJson = require('./app.config.base.json');

const GOOGLE_CLIENT_ID_SUFFIX = '.apps.googleusercontent.com';
const GOOGLE_IOS_SCHEME_PREFIX = 'com.googleusercontent.apps.';

function googleIosUrlSchemeFromEnv(env = process.env) {
  if (env.EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME) {
    return env.EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME;
  }

  const iosClientId = env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
  if (iosClientId?.endsWith(GOOGLE_CLIENT_ID_SUFFIX)) {
    return `${GOOGLE_IOS_SCHEME_PREFIX}${iosClientId.slice(
      0,
      -GOOGLE_CLIENT_ID_SUFFIX.length
    )}`;
  }

  return undefined;
}

module.exports = () => {
  const googleIosUrlScheme = googleIosUrlSchemeFromEnv();
  const plugins = appJson.expo.plugins.filter((plugin) => {
    const pluginName = Array.isArray(plugin) ? plugin[0] : plugin;
    return pluginName !== '@react-native-google-signin/google-signin';
  });

  if (googleIosUrlScheme) {
    plugins.push([
      '@react-native-google-signin/google-signin',
      { iosUrlScheme: googleIosUrlScheme },
    ]);
  }

  return {
    ...appJson,
    expo: {
      ...appJson.expo,
      plugins,
    },
  };
};
