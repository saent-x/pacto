import { Alert } from 'react-native';
import * as Haptics from 'expo-haptics';

export function confirmDestructive(
  title: string,
  message: string,
  onConfirm: () => void | Promise<void>,
  confirmLabel: string = 'Delete',
): void {
  Alert.alert(title, message, [
    { text: 'Cancel', style: 'cancel' },
    {
      text: confirmLabel,
      style: 'destructive',
      onPress: () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(
          () => undefined,
        );
        void Promise.resolve(onConfirm());
      },
    },
  ]);
}
