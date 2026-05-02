import type { ImageSourcePropType } from 'react-native';

export type DefaultAvatarId =
  | 'pacto:avatar-1'
  | 'pacto:avatar-2'
  | 'pacto:avatar-3'
  | 'pacto:avatar-4'
  | 'pacto:avatar-5';

export type DefaultAvatar = {
  id: DefaultAvatarId;
  image: ImageSourcePropType;
};

export const DEFAULT_AVATARS: DefaultAvatar[] = [
  { id: 'pacto:avatar-1', image: require('../../assets/images/avatars/default-avatar-1.png') },
  { id: 'pacto:avatar-2', image: require('../../assets/images/avatars/default-avatar-2.png') },
  { id: 'pacto:avatar-3', image: require('../../assets/images/avatars/default-avatar-3.png') },
  { id: 'pacto:avatar-4', image: require('../../assets/images/avatars/default-avatar-4.png') },
  { id: 'pacto:avatar-5', image: require('../../assets/images/avatars/default-avatar-5.png') },
];

const DEFAULT_AVATAR_BY_ID = Object.fromEntries(
  DEFAULT_AVATARS.map((avatar) => [avatar.id, avatar.image]),
) as Record<DefaultAvatarId, ImageSourcePropType>;

export function resolveAvatarSource(avatarUrl: string | null | undefined): ImageSourcePropType | null {
  if (!avatarUrl) return null;
  if (avatarUrl in DEFAULT_AVATAR_BY_ID) return DEFAULT_AVATAR_BY_ID[avatarUrl as DefaultAvatarId];
  return { uri: avatarUrl };
}

export function randomDefaultAvatarId(seed = `${Date.now()}-${Math.random()}`): DefaultAvatarId {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return DEFAULT_AVATARS[hash % DEFAULT_AVATARS.length].id;
}
