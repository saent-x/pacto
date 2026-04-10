import React, { useState, useCallback, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { ThemedSheet, BottomSheetTextInput } from '@/src/components/ui';
import { useColors } from '@/src/hooks/useColors';
import { sheet, useGlass } from '@/src/components/ui/sheetStyles';

interface Props {
  sheetRef: React.RefObject<BottomSheetModal | null>;
  onSave: (data: { body: string; isPrivate: boolean }) => Promise<void>;
  note?: { id: string; body: string; isPrivate: boolean };
}

export function CreateLoveNoteSheet({ sheetRef, onSave, note }: Props) {
  const C = useColors();
  const { glassBg, glassBorder } = useGlass();

  const [body, setBody] = useState(note?.body ?? '');
  const [isPrivate, setIsPrivate] = useState(note?.isPrivate ?? false);
  const [saving, setSaving] = useState(false);
  const sessionKey = note ? `edit:${note.id}` : 'create';
  const sessionKeyRef = useRef(sessionKey);

  const isEdit = !!note;

  useEffect(() => {
    if (sessionKeyRef.current === sessionKey) {
      return;
    }

    sessionKeyRef.current = sessionKey;
    setBody(note?.body ?? '');
    setIsPrivate(note?.isPrivate ?? false);
  }, [note, sessionKey]);

  const handleSave = useCallback(async () => {
    if (!body.trim()) {
      Alert.alert('Note required', 'Write something before sending.');
      return;
    }
    setSaving(true);
    try {
      await onSave({ body: body.trim(), isPrivate });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      sheetRef.current?.dismiss();
      if (!isEdit) {
        setBody('');
        setIsPrivate(false);
      }
    } catch (error) {
      console.warn('[Coupl] Save love note failed:', error);
      Alert.alert('Save failed', 'Try again.');
    } finally {
      setSaving(false);
    }
  }, [body, isPrivate, onSave, isEdit, sheetRef]);

  const togglePrivacy = useCallback(() => {
    Haptics.selectionAsync();
    setIsPrivate((prev) => !prev);
  }, []);

  const footer = (
    <TouchableOpacity
      onPress={handleSave}
      disabled={saving}
      activeOpacity={0.8}
      style={[sheet.saveBtn, { backgroundColor: C.primary }]}
    >
      <Feather name={isEdit ? 'check' : 'send'} size={18} color={C.ink} />
      <Text style={[sheet.saveBtnText, { color: C.ink }]}>
        {saving ? 'Saving...' : isEdit ? 'Update' : 'Send Note'}
      </Text>
    </TouchableOpacity>
  );

  return (
    <ThemedSheet
      sheetRef={sheetRef}
      scrollable
      footer={footer}
    >
      <View style={sheet.form}>
        <View style={sheet.dateHeader}>
          <Text style={[sheet.sheetLabel, { color: C.primary }]}>
            {isEdit ? 'EDIT NOTE' : 'NEW NOTE'}
          </Text>
        </View>

        <View style={[sheet.bodyCard, { backgroundColor: glassBg, borderColor: glassBorder }]}>
          <BottomSheetTextInput
            style={[sheet.bodyInput, { color: C.text, minHeight: 120 }]}
            placeholder="Write something sweet..."
            placeholderTextColor={C.fog}
            value={body}
            onChangeText={setBody}
            multiline
            textAlignVertical="top"
            autoFocus
          />
        </View>

        <View style={sheet.section}>
          <Text style={[sheet.sectionTitle, { color: C.textTertiary }]}>Visibility</Text>
          <TouchableOpacity
            style={[
              sheet.privacyToggle,
              { backgroundColor: isPrivate ? C.primaryMuted : glassBg, borderColor: isPrivate ? C.primary : glassBorder },
            ]}
            onPress={togglePrivacy}
            activeOpacity={0.7}
          >
            <Feather name={isPrivate ? 'lock' : 'unlock'} size={16} color={isPrivate ? C.primary : C.fog} />
            <Text style={[sheet.privacyText, { color: isPrivate ? C.primary : C.haze }]}>
              {isPrivate ? 'Only you' : 'Share with partner'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </ThemedSheet>
  );
}
