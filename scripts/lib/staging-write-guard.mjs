export function assertStagingWriteAllowed({ appId, operation, env = process.env }) {
  if (env.COUPL_QA_ENV !== 'staging') {
    throw new Error(`Refusing ${operation} writes without COUPL_QA_ENV=staging.`);
  }

  if (env.COUPL_QA_CONFIRM_APP_ID !== appId) {
    throw new Error(
      `Refusing ${operation} writes unless COUPL_QA_CONFIRM_APP_ID exactly matches EXPO_PUBLIC_INSTANT_APP_ID.`,
    );
  }

  if (env.COUPL_QA_ALLOW_STAGING_WRITES !== '1') {
    throw new Error(`Refusing ${operation} writes without COUPL_QA_ALLOW_STAGING_WRITES=1.`);
  }
}
