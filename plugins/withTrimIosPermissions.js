const { withInfoPlist } = require('@expo/config-plugins');

/**
 * Strips iOS permission usage-description keys that upstream config plugins
 * inject but this app never exercises:
 *   - NSCameraUsageDescription  — added by @config-plugins/react-native-webrtc,
 *     but Pacto uses WebRTC for voice only and never opens the camera.
 *   - NSFaceIDUsageDescription  — added by expo-secure-store, but SecureStore is
 *     used without `requireAuthentication`, so Face ID is never invoked.
 *
 * Declaring purpose strings for capabilities the binary doesn't use is an App
 * Store review / App-Privacy mismatch risk, so we remove them on every prebuild.
 *
 * We delete in BOTH places to be robust to plugin ordering and to a stale
 * existing Info.plist:
 *   1. `config.ios.infoPlist` (static) — what the base mod merges onto disk.
 *   2. `modResults` (the parsed Info.plist) — removes any value already on disk.
 * This plugin is registered last in app.json, so the other plugins have already
 * added the keys by the time it runs.
 */
const REMOVE_KEYS = ['NSCameraUsageDescription', 'NSFaceIDUsageDescription'];

module.exports = function withTrimIosPermissions(config) {
  config.ios = config.ios || {};
  config.ios.infoPlist = config.ios.infoPlist || {};
  for (const key of REMOVE_KEYS) {
    delete config.ios.infoPlist[key];
  }
  return withInfoPlist(config, (cfg) => {
    for (const key of REMOVE_KEYS) {
      delete cfg.modResults[key];
    }
    return cfg;
  });
};
