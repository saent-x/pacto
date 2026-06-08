const { withInfoPlist } = require('@expo/config-plugins');

/**
 * Strips iOS permission usage-description keys that upstream config plugins
 * inject but this app never exercises:
 *   - NSFaceIDUsageDescription  — added by expo-secure-store, but SecureStore is
 *     used without `requireAuthentication`, so Face ID is never invoked. Apple's
 *     binary scan does not flag it, so removing it is safe.
 *
 * NSCameraUsageDescription is NOT stripped: react-native-webrtc links the Camera
 * API, so Apple's automated processing rejects the binary (ITMS-90683) without a
 * purpose string even though Pacto only captures audio. That camera string is
 * declared in app.json's ios.infoPlist instead.
 *
 * We delete in BOTH places to be robust to plugin ordering and to a stale
 * existing Info.plist:
 *   1. `config.ios.infoPlist` (static) — what the base mod merges onto disk.
 *   2. `modResults` (the parsed Info.plist) — removes any value already on disk.
 * This plugin is registered last in app.json, so the other plugins have already
 * added the keys by the time it runs.
 */
// NOTE: NSCameraUsageDescription is intentionally NOT stripped — react-native-webrtc
// links the Camera API, so Apple rejects the binary (ITMS-90683) without a purpose
// string even though Pacto only uses audio. That string is declared in app.json.
const REMOVE_KEYS = ['NSFaceIDUsageDescription'];

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
