import { init } from '@instantdb/react-native';
import schema from '../../instant.schema';

const db = init({
  appId: process.env.EXPO_PUBLIC_INSTANT_APP_ID!,
  schema,
});

export { db };
export { id } from '@instantdb/react-native';
