export const MEMORY_POST_BASE_RELATIONS = {
  space: {},
  author: {},
  attachments: {},
  reactions: { user: {} },
  poll: { options: { votes: { user: {} } } },
  quoteOf: { space: {}, author: {}, attachments: {} },
};

export const MEMORY_POST_RELATIONS = {
  ...MEMORY_POST_BASE_RELATIONS,
  replyTo: {},
  repostOf: MEMORY_POST_BASE_RELATIONS,
};
