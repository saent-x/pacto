import { i } from '@instantdb/react-native';

const _schema = i.schema({
  entities: {
    $users: i.entity({
      email: i.string().unique().indexed(),
      displayName: i.string().optional(),
      avatarUrl: i.string().optional(),
      birthday: i.string().optional(),
      createdAt: i.number().optional(),
    }),
    spaces: i.entity({
      kind: i.string(),                                     // 'solo' | 'couple'
      name: i.string().optional(),
      anniversary: i.string().optional(),
      inviteCode: i.string().optional().unique().indexed(),
      createdAt: i.number(),
      updatedAt: i.number(),
    }),
    memberships: i.entity({
      role: i.string(),                                     // 'owner' | 'partner'
      joinedAt: i.number(),
    }),
  },
  links: {
    spaceCreator: {
      forward: { on: 'spaces', has: 'one', label: 'createdBy' },
      reverse: { on: '$users', has: 'many', label: 'createdSpaces' },
    },
    membershipUser: {
      forward: { on: 'memberships', has: 'one', label: 'user' },
      reverse: { on: '$users', has: 'many', label: 'memberships' },
    },
    membershipSpace: {
      forward: { on: 'memberships', has: 'one', label: 'space', onDelete: 'cascade' },
      reverse: { on: 'spaces', has: 'many', label: 'memberships' },
    },
  },
});

type _AppSchema = typeof _schema;
interface AppSchema extends _AppSchema {}
const schema: AppSchema = _schema;

export type { AppSchema };
export default schema;
