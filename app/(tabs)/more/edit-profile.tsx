import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useMutation } from 'convex/react';
import { makeFunctionReference } from 'convex/server';
import { useColors } from '@/src/hooks/useColors';
import { useTheme } from '@/src/lib/theme';
import { useSession } from '@/src/hooks/useSession';
import { Typography } from '@/src/constants/typography';
import { Spacing } from '@/src/constants/spacing';
import { GlassSection, GlassRow } from '@/src/components/ui';

const createProfileMutation = makeFunctionReference<
  'mutation',
  { displayName?: string; avatarUrl?: string },
  unknown
>('users:createProfile');

export default function EditProfileScreen() {
  const C = useColors();
  const { mode } = useTheme();
  const router = useRouter();
  const { profile, refetch } = useSession();
  const [displayName, setDisplayName] = useState(profile?.displayName ?? '');
  const updateProfile = useMutation(createProfileMutation);

  const handleEditName = () => {
    Haptics.selectionAsync();
    if (Alert.prompt) {
      Alert.prompt(
        'Edit Display Name',
        'Enter your new display name',
        [
          { text: 'Cancel', style: 'cancel' as const },
          {
            text: 'Save',
            onPress: async (text?: string) => {
              if (text?.trim() && text.trim() !== displayName) {
                try {
                  await updateProfile({ displayName: text.trim() });
                  setDisplayName(text.trim());
                } catch {
                  Alert.alert('Error', 'Failed to update display name. Please try again.');
                }
              }
            },
          },
        ],
        'plain-text',
        displayName,
      );
    } else {
      Alert.alert('Coming Soon', 'Display name editing will be available in a future update.');
    }
  };

  const handleEditPhoto = () => {
    Haptics.selectionAsync();
    Alert.alert('Coming Soon', 'Photo editing will be available in a future update.');
  };

  return (
    <View style={[styles.screen, { backgroundColor: C.background }]}>
      <SafeAreaView style={styles.flex} edges={['top']}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: C.border }]}>
          <TouchableOpacity
            onPress={() => {
              Haptics.selectionAsync();
              router.back();
            }}
            style={styles.backBtn}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Feather name="chevron-left" size={24} color={C.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: C.text }]}>Edit Profile</Text>
          <View style={styles.backBtn} />
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {/* Avatar */}
          <Animated.View entering={FadeInDown.duration(400).delay(100)} style={styles.avatarSection}>
            <TouchableOpacity onPress={handleEditPhoto} activeOpacity={0.7}>
              <View style={[styles.avatar, { backgroundColor: C.primaryMuted, borderColor: C.primary }]}>
                <Text style={[styles.avatarLetter, { color: C.primary }]}>
                  {(displayName?.[0] || profile?.displayName?.[0] || '?').toUpperCase()}
                </Text>
              </View>
              <View style={[styles.cameraBadge, { backgroundColor: C.primary }]}>
                <Feather name="camera" size={12} color={C.background} />
              </View>
            </TouchableOpacity>
          </Animated.View>

          {/* Info rows */}
          <Animated.View entering={FadeInDown.duration(400).delay(200)}>
            <GlassSection header="Profile">
              <GlassRow
                icon="user"
                label="Display Name"
                value={displayName || profile?.displayName || '—'}
                chevron
                onPress={handleEditName}
              />
              <GlassRow
                icon="mail"
                iconColor={C.textTertiary}
                label="Email"
                value={profile?.email || '—'}
                last
              />
            </GlassSection>
          </Animated.View>

          <Animated.View entering={FadeInDown.duration(400).delay(300)}>
            <Text style={[styles.hint, { color: C.textTertiary }]}>
              Changes are saved to your account immediately.
            </Text>
          </Animated.View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    ...Typography.subheading,
  },
  content: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing['3xl'],
    paddingBottom: 120,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: Spacing['3xl'],
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLetter: {
    fontSize: 32,
    fontWeight: '600',
  },
  cameraBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hint: {
    ...Typography.small,
    textAlign: 'center',
    paddingHorizontal: Spacing.xl,
  },
});
