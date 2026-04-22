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
    events: i.entity({
      title: i.string(),
      description: i.string().optional(),
      startsAt: i.number().indexed(),
      endsAt: i.number().optional(),
      priority: i.number().optional(),
      isPrivate: i.boolean().optional(),
      createdAt: i.number().indexed(),
      updatedAt: i.number().optional(),
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
    eventCouple: {
      forward: { on: 'events', has: 'one', label: 'couple', onDelete: 'cascade' },
      reverse: { on: 'spaces', has: 'many', label: 'events' },
    },
    eventCreator: {
      forward: { on: 'events', has: 'one', label: 'createdBy' },
      reverse: { on: '$users', has: 'many', label: 'createdEvents' },
    },
  },
});

type _AppSchema = typeof _schema;
interface AppSchema extends _AppSchema {}
const schema: AppSchema = _schema;

export type { AppSchema };
export default schema;
