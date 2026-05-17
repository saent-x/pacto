export function useEncryption() {
  const passthrough = async (value: string) => value;
  return {
    encrypt: passthrough,
    decrypt: passthrough,
    hasKey: false as boolean,
  };
}
