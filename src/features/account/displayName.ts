export const DISPLAY_NAME_LIMIT = 48;

const clean = (value?: string | null) => (value ?? '').trim().replace(/\s+/g, ' ');

const generatedFromEmail = (name: string, email?: string | null) => {
  const emailValue = clean(email).toLowerCase();
  if (!emailValue) return false;
  const emailLocal = emailValue.split('@')[0];
  const nameValue = name.toLowerCase();
  return nameValue === emailValue || nameValue === emailLocal;
};

export const normalizeDisplayNameInput = (value: string) =>
  clean(value).slice(0, DISPLAY_NAME_LIMIT);

export const profileDisplayNameForInput = (displayName?: string | null, email?: string | null) => {
  const name = normalizeDisplayNameInput(displayName ?? '');
  return name && !generatedFromEmail(name, email) ? name : '';
};

export const displayNameForGreeting = (displayName?: string | null, email?: string | null) => {
  const name = normalizeDisplayNameInput(displayName ?? '');
  return name && !generatedFromEmail(name, email) ? name : 'you';
};
