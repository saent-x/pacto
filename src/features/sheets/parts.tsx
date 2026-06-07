import React from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { useColors, useTheme } from '@/theme';
import { FONTS } from '@/theme/tokens';
import { Serif, T, Kick, Pill, PrimaryBtn, RoundBtn, Press, Mono, type IconName } from '@/ui';
import { PRIORITY_OPTIONS, PRIORITY_ICON, priorityColor } from '@/constants/priority';
import type { Member } from '@/features/account/SpaceProvider';
import { MemberAvatar } from '@/features/account/avatars';

const DANGER = '#C2564A';

const fmtDay = (d: Date) => d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
const fmtClock = (d: Date) => d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });

/**
 * Native date/time field. iOS shows the compact inline picker; Android opens the
 * platform dialog on tap. `mode` is 'date' or 'time' (Android can't do 'datetime'
 * in one shot — compose two fields for that).
 */
export function QPicker({
  label,
  value,
  onChange,
  mode,
}: {
  label: string;
  value: Date;
  onChange: (d: Date) => void;
  mode: 'date' | 'time';
}) {
  const C = useColors();
  const { isDark } = useTheme();

  if (Platform.OS === 'ios') {
    return (
      <View
        style={{
          marginBottom: 24,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
        }}
      >
        <Kick>{label}</Kick>
        <DateTimePicker
          value={value}
          mode={mode}
          display="compact"
          themeVariant={isDark ? 'dark' : 'light'}
          accentColor={C.accent}
          onChange={(_e, d) => d && onChange(d)}
        />
      </View>
    );
  }

  const open = () =>
    DateTimePickerAndroid.open({
      value,
      mode,
      is24Hour: false,
      onChange: (e, d) => {
        if (e.type === 'set' && d) onChange(d);
      },
    });

  return (
    <View style={{ marginBottom: 24 }}>
      <Kick style={{ marginBottom: 10 }}>{label}</Kick>
      <Press onPress={open} style={{ paddingBottom: 11, borderBottomWidth: 1.5, borderBottomColor: C.line }}>
        <Mono size={17} weight={500}>
          {mode === 'time' ? fmtClock(value) : fmtDay(value)}
        </Mono>
      </Press>
    </View>
  );
}

export function SheetShell({
  kicker,
  title,
  children,
  footerLabel,
  footerIcon = 'check',
  onSubmit,
  disabled,
  onDelete,
  loading = false,
}: {
  kicker: string;
  title: string;
  children: React.ReactNode;
  footerLabel: string;
  footerIcon?: IconName;
  onSubmit: () => void;
  disabled?: boolean;
  /** When provided (edit mode), renders a confirmed Delete action under the footer. */
  onDelete?: () => void;
  /** While true (edit mode awaiting its record), show a spinner instead of the
   *  fields so empty inputs never flash before the saved values load. */
  loading?: boolean;
}) {
  const C = useColors();
  const router = useRouter();
  return (
    // No flex:1 — the sheet sizes to this content (formSheet + sheetAllowedDetents:'fitToContents').
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ backgroundColor: C.surface }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          paddingHorizontal: 24,
          paddingTop: 16,
          paddingBottom: 10,
        }}
      >
        <View>
          <Kick color={C.accent} style={{ marginBottom: 6 }}>
            {kicker}
          </Kick>
          <Serif size={34} numberOfLines={1}>
            {title}
          </Serif>
        </View>
        <RoundBtn name="x" onPress={() => router.back()} />
      </View>
      {loading ? (
        <View style={{ paddingVertical: 64, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={C.accent} />
        </View>
      ) : (
        <>
          <View style={{ paddingHorizontal: 24, paddingTop: 8 }}>{children}</View>
          <View style={{ paddingHorizontal: 24, paddingTop: 12, paddingBottom: 28 }}>
            <PrimaryBtn icon={footerIcon} onPress={onSubmit} disabled={disabled}>
              {footerLabel}
            </PrimaryBtn>
            {onDelete && (
              <Press onPress={onDelete} style={{ alignSelf: 'center', paddingVertical: 14, marginTop: 4 }}>
                <T size={14.5} weight={600} color={DANGER}>
                  Delete
                </T>
              </Press>
            )}
          </View>
        </>
      )}
    </KeyboardAvoidingView>
  );
}

export function QField({
  label,
  value,
  onChangeText,
  placeholder,
  big,
  multiline,
}: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  big?: boolean;
  multiline?: boolean;
}) {
  const C = useColors();
  return (
    <View style={{ marginBottom: 24 }}>
      <Kick style={{ marginBottom: 10 }}>{label}</Kick>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={C.ink4}
        multiline={multiline}
        style={{
          fontFamily: big ? FONTS.display600 : FONTS.sans500,
          fontSize: big ? 26 : 17,
          lineHeight: big ? 30 : 22,
          color: C.ink,
          paddingBottom: 11,
          borderBottomWidth: 1.5,
          borderBottomColor: value ? C.accent : C.line,
        }}
      />
    </View>
  );
}

export function QChips({
  label,
  options,
  value,
  onPick,
}: {
  label: string;
  options: string[];
  value: string;
  onPick: (o: string) => void;
}) {
  return (
    <View style={{ marginBottom: 24 }}>
      <Kick style={{ marginBottom: 12 }}>{label}</Kick>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {options.map((o) => (
          <Pill key={o} active={value === o} onPress={() => onPick(o)}>
            {o}
          </Pill>
        ))}
      </View>
    </View>
  );
}

export function QPriority({
  value,
  onPick,
}: {
  value: string;
  onPick: (option: string) => void;
}) {
  return (
    <View style={{ marginBottom: 24 }}>
      <Kick style={{ marginBottom: 12 }}>Priority</Kick>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {PRIORITY_OPTIONS.map((o) => (
          <Pill key={o} active={value === o} icon={PRIORITY_ICON} iconColor={priorityColor(o)} onPress={() => onPick(o)}>
            {o}
          </Pill>
        ))}
      </View>
    </View>
  );
}

export function QAssign({
  members,
  value,
  onPick,
}: {
  members: Member[];
  value: string | null;
  onPick: (userId: string | null) => void;
}) {
  const C = useColors();
  return (
    <View style={{ marginBottom: 24 }}>
      <Kick style={{ marginBottom: 12 }}>Assign to</Kick>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {/* "Everyone" = no specific assignee (visible to all). */}
        <Pill active={value == null} icon="users" onPress={() => onPick(null)}>
          Everyone
        </Pill>
        {members.map((m) => {
          const on = value === m.userId;
          return (
            <Pill
              key={m.userId}
              active={on}
              leading={<MemberAvatar member={m} size={18} ringColor={on ? C.bg : undefined} />}
              onPress={() => onPick(m.userId)}
            >
              {m.isYou ? 'You' : m.displayName}
            </Pill>
          );
        })}
      </View>
    </View>
  );
}
