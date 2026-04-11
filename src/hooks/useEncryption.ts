/**
 * Hook for client-side encryption of sensitive couple data.
 *
 * Provides encrypt/decrypt functions bound to the active couple's key.
 * If no key exists (couple not set up yet, or key exchange pending),
 * operations gracefully pass through plaintext.
 */
import { useCallback, useEffect, useState } from 'react';
import { useSession } from './useSession';
import {
  encryptField,
  decryptField,
  getCoupleKey,
  generateCoupleKey,
  storeCoupleKey,
} from '@/src/lib/crypto';

export function useEncryption() {
  const { activeCouple } = useSession();
  const coupleId = activeCouple?.couple?.id ?? null;
  const [hasKey, setHasKey] = useState(false);

  useEffect(() => {
    if (!coupleId) {
      setHasKey(false);
      return;
    }
    getCoupleKey(coupleId).then((key) => setHasKey(!!key));
  }, [coupleId]);

  const encrypt = useCallback(
    async (plaintext: string): Promise<string> => {
      if (!coupleId) return plaintext;
      return encryptField(coupleId, plaintext);
    },
    [coupleId],
  );

  const decrypt = useCallback(
    async (ciphertext: string): Promise<string> => {
      if (!coupleId) return ciphertext;
      return decryptField(coupleId, ciphertext);
    },
    [coupleId],
  );

  const decryptAll = useCallback(
    async <T extends Record<string, unknown>>(
      doc: T,
      fields: (keyof T)[],
    ): Promise<T> => {
      if (!coupleId) return doc;
      const result = { ...doc };
      for (const field of fields) {
        const value = result[field];
        if (typeof value === 'string') {
          (result as Record<string, unknown>)[field as string] = await decryptField(coupleId, value);
        }
      }
      return result;
    },
    [coupleId],
  );

  /**
   * Initialize encryption for a new couple.
   * Call this after creating a couple.
   */
  const initializeKey = useCallback(async (): Promise<string> => {
    if (!coupleId) throw new Error('No active couple');
    const keyBase64 = await generateCoupleKey();
    await storeCoupleKey(coupleId, keyBase64);
    setHasKey(true);
    return keyBase64;
  }, [coupleId]);

  /**
   * Import a key received from partner (during invite acceptance).
   */
  const importPartnerKey = useCallback(
    async (keyBase64: string): Promise<void> => {
      if (!coupleId) throw new Error('No active couple');
      await storeCoupleKey(coupleId, keyBase64);
      setHasKey(true);
    },
    [coupleId],
  );

  return {
    hasKey,
    encrypt,
    decrypt,
    decryptAll,
    initializeKey,
    importPartnerKey,
  };
}
