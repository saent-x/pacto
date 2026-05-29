const { AndroidConfig, createRunOncePlugin, withAndroidManifest } = require('@expo/config-plugins');

const BLOCKED_ANDROID_PERMISSIONS = [
  'android.permission.CAMERA',
  'android.permission.ACCESS_FINE_LOCATION',
];

function normalizeAndroidPermission(permission) {
  return permission.includes('.') ? permission : `android.permission.${permission}`;
}

function withLeastPrivilegeAndroidPermissions(config) {
  config.android = config.android ?? {};

  const blockedPermissions = new Set(
    [...(config.android.blockedPermissions ?? []), ...BLOCKED_ANDROID_PERMISSIONS].map(
      normalizeAndroidPermission,
    ),
  );

  config.android.blockedPermissions = Array.from(blockedPermissions);

  if (Array.isArray(config.android.permissions)) {
    config.android.permissions = config.android.permissions
      .map(normalizeAndroidPermission)
      .filter((permission) => !blockedPermissions.has(permission));
  }

  return withAndroidManifest(config, (manifestConfig) => {
    manifestConfig.modResults = AndroidConfig.Manifest.ensureToolsAvailable(
      manifestConfig.modResults,
    );
    manifestConfig.modResults = AndroidConfig.Permissions.addBlockedPermissions(
      manifestConfig.modResults,
      Array.from(blockedPermissions),
    );
    return manifestConfig;
  });
}

module.exports = createRunOncePlugin(
  withLeastPrivilegeAndroidPermissions,
  'with-least-privilege-android-permissions',
  '1.0.0',
);
