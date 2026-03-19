import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import 'react-native-url-polyfill/auto';
import { Database } from '@/src/types/database';

// Storage adapter that works on native (SecureStore) and web/SSR (in-memory fallback)
const storage = {
  _memoryStore: {} as Record<string, string>,

  async getItem(key: string): Promise<string | null> {
    if (Platform.OS !== 'web') {
      const SecureStore = require('expo-secure-store');
      return SecureStore.getItemAsync(key);
    }
    return this._memoryStore[key] ?? null;
  },

  async setItem(key: string, value: string): Promise<void> {
    if (Platform.OS !== 'web') {
      const SecureStore = require('expo-secure-store');
      return SecureStore.setItemAsync(key, value);
    }
    this._memoryStore[key] = value;
  },

  async removeItem(key: string): Promise<void> {
    if (Platform.OS !== 'web') {
      const SecureStore = require('expo-secure-store');
      return SecureStore.deleteItemAsync(key);
    }
    delete this._memoryStore[key];
  },
};

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
