import { Alert } from 'react-native';

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
        void Promise.resolve(onConfirm());
      },
    },
  ]);
}
