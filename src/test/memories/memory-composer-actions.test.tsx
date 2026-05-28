import React from 'react';
import { Pressable, Text } from 'react-native';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const routerMock = vi.hoisted(() => ({
  back: vi.fn(),
  push: vi.fn(),
  setParams: vi.fn(),
}));

const sessionMock = vi.hoisted(() => ({
  current: {
    mode: 'pair',
    user: { id: 'user-1', displayName: 'Tor', email: 'tor@example.test' },
    activeCouple: { couple: { id: 'shared-1', kind: 'pair', plan: 'free' } },
    space: { id: 'shared-1', kind: 'pair', plan: 'free' },
    soloSpace: { id: 'solo-1', kind: 'solo', plan: 'free' },
    sharedSpace: { id: 'shared-1', kind: 'pair', plan: 'free' },
    personalSpaceId: 'solo-1',
    sharedSpaceId: 'shared-1',
  } as any,
}));

const composerMock = vi.hoisted(() => ({
  draft: {
    body: 'Photo',
    attachments: [],
    pollOptions: [],
    mode: 'post',
    isPrivate: false,
  } as any,
  setDraft: vi.fn(),
  submit: vi.fn(async () => undefined),
  addMemoryDraftAttachment: vi.fn(),
  deleteOwnedDraftMediaPath: vi.fn(async () => undefined),
  removeMemoryDraftAttachmentAt: vi.fn(async () => null),
  setMemoryComposerPrivacy: vi.fn(async () => ({ removedMediaCount: 0, removedEntityRefCount: 0 })),
}));

const mediaPickerMock = vi.hoisted(() => ({
  pick: vi.fn(),
}));

const mediaUploadMock = vi.hoisted(() => ({
  upload: vi.fn(async () => ({
    mediaUrl: 'https://cdn.pacto.test/photo.jpg',
    mediaPath: 'users/user-1/spaces/shared-1/memories/photo.jpg',
    mediaSize: 1024,
    mediaWidth: 800,
    mediaHeight: 600,
  })),
}));

vi.mock('expo-router', () => ({
  router: routerMock,
  useLocalSearchParams: () => ({}),
}));

vi.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

vi.mock('@/src/lib/theme', () => ({
  useTheme: () => ({
    C: {
      accent: '#D88B74',
      bg: '#FFFFFF',
      bgCard: '#FFFFFF',
      bgSoft: '#F5F1ED',
      coal: '#FFFFFF',
      error: '#C43B3B',
      ink2: '#555555',
      ink3: '#777777',
      inkColor: '#222222',
      lineColor: '#EEEEEE',
    },
  }),
}));

vi.mock('@/src/hooks/useSession', () => ({
  useSession: () => sessionMock.current,
}));

vi.mock('@/src/hooks/memories/useMemory', () => ({
  useMemory: () => ({ memory: null }),
}));

vi.mock('@/src/hooks/memories/useMemoryComposer', () => ({
  addMemoryDraftAttachment: composerMock.addMemoryDraftAttachment,
  canSubmitComposerDraft: () => true,
  deleteOwnedDraftMediaPath: composerMock.deleteOwnedDraftMediaPath,
  removeMemoryDraftAttachmentAt: composerMock.removeMemoryDraftAttachmentAt,
  resolveMemoryDraftAttachmentScopeId: (targetSpaceId: string | null | undefined, attachmentSpaceId: string | null | undefined) =>
    targetSpaceId ?? attachmentSpaceId ?? null,
  resolveComposerTargetSpace: () => ({ id: 'shared-1', kind: 'pair', plan: 'free' }),
  setMemoryComposerPrivacy: composerMock.setMemoryComposerPrivacy,
  sumDraftMediaBytes: (attachments: Array<{ mediaSize?: number }>) =>
    attachments.reduce((total, attachment) => total + (attachment.mediaSize ?? 0), 0),
  useMemoryComposer: () => ({
    draft: composerMock.draft,
    setDraft: composerMock.setDraft,
    submit: composerMock.submit,
  }),
}));

vi.mock('@/src/hooks/memories/useMediaUpload', () => ({
  useMediaUpload: () => ({ upload: mediaUploadMock.upload }),
}));

vi.mock('@/src/hooks/memories/useMediaQuota', () => ({
  canAddMediaBytes: () => true,
  useMediaQuota: () => ({
    bytesUsed: 0,
    cap: 10_000_000,
    percent: 0,
    isAtCap: false,
    isOverThreshold: false,
  }),
}));

vi.mock('@/src/components/ui/pacto/memories/MediaPickerSheet', () => ({
  useMediaPicker: () => ({ pick: mediaPickerMock.pick }),
}));

vi.mock('@/src/components/ui/PressScale', () => ({
  PressScale: ({ children, disabled, onPress, style }: any) => (
    <Pressable disabled={disabled} onPress={disabled ? undefined : onPress} style={style}>
      {children}
    </Pressable>
  ),
}));

vi.mock('@/src/components/ui/pacto', () => ({
  Avatar: () => <Text testID="memory-composer-avatar">avatar</Text>,
}));

vi.mock('@/src/components/ui/pacto/memories/MemoriesIcon', () => ({
  MemoriesIcon: ({ name }: { name: string }) => <Text>{name}</Text>,
}));

vi.mock('@/src/components/ui/pacto/memories/QuotaBadge', () => ({
  QuotaBadge: () => <Text testID="memory-composer-quota">quota</Text>,
}));

vi.mock('@/src/components/ui/pacto/memories/EntityRefCard', () => ({
  EntityRefCard: () => <Text testID="memory-composer-entity">entity</Text>,
}));

vi.mock('@/src/hooks/memories/useEntityRef', () => ({
  isEntityRefKind: () => false,
}));

const TestRenderer: any = require('react-test-renderer');
const { act } = TestRenderer;
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('MemoryComposer actions', () => {
  beforeEach(() => {
    routerMock.back.mockClear();
    routerMock.push.mockClear();
    routerMock.setParams.mockClear();
    composerMock.setDraft.mockClear();
    composerMock.submit.mockClear();
    composerMock.addMemoryDraftAttachment.mockClear();
    composerMock.deleteOwnedDraftMediaPath.mockClear();
    composerMock.removeMemoryDraftAttachmentAt.mockClear();
    composerMock.setMemoryComposerPrivacy.mockClear();
    mediaPickerMock.pick.mockReset();
    mediaUploadMock.upload.mockClear();
    composerMock.draft = {
      body: 'Photo',
      attachments: [],
      pollOptions: [],
      mode: 'post',
      isPrivate: false,
    };
  });

  it('ignores duplicate media taps while the first picker flow is pending', async () => {
    let releasePick: ((asset: any) => void) | undefined;
    mediaPickerMock.pick.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          releasePick = resolve;
        }),
    );
    const { MemoryComposer } = await import('@/src/components/ui/pacto/memories/MemoryComposer');
    let renderer: any;
    await act(async () => {
      renderer = TestRenderer.create(<MemoryComposer />);
      await flush();
    });

    const imageButton = renderer.root.findAllByType(Pressable)[1];
    let firstPick: Promise<void> | undefined;
    let secondPick: Promise<void> | undefined;
    await act(async () => {
      firstPick = imageButton.props.onPress();
      secondPick = imageButton.props.onPress();
      await Promise.resolve();
    });

    expect(mediaPickerMock.pick).toHaveBeenCalledTimes(1);
    releasePick?.({
      uri: 'file:///tmp/photo.jpg',
      width: 800,
      height: 600,
      size: 1024,
      mime: 'image/jpeg',
      isGif: false,
    });
    await act(async () => {
      await Promise.all([firstPick, secondPick]);
    });

    expect(mediaUploadMock.upload).toHaveBeenCalledTimes(1);
    expect(composerMock.addMemoryDraftAttachment).toHaveBeenCalledTimes(1);
    act(() => renderer.unmount());
  });
});
