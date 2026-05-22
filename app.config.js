const appJson = require('./app.json');

const GOOGLE_CLIENT_ID_SUFFIX = '.apps.googleusercontent.com';
const GOOGLE_IOS_SCHEME_PREFIX = 'com.googleusercontent.apps.';
const DEFAULT_GOOGLE_IOS_CLIENT_ID =
  '1054272612711-amsaaam2bqkqbpn3d65aknr47m90l7q3.apps.googleusercontent.com';

function googleIosUrlSchemeFromClientId(clientId) {
  if (clientId?.endsWith(GOOGLE_CLIENT_ID_SUFFIX)) {
    return `${GOOGLE_IOS_SCHEME_PREFIX}${clientId.slice(
      0,
      -GOOGLE_CLIENT_ID_SUFFIX.length
    )}`;
  }

  return undefined;
}

function googleIosUrlSchemeFromEnv(env = process.env) {
  if (env.EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME) {
    return env.EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME;
  }

  return googleIosUrlSchemeFromClientId(
    env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? DEFAULT_GOOGLE_IOS_CLIENT_ID
  );
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
