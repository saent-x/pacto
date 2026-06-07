import { Alert } from 'react-native';

// Standard destructive confirmation. Every delete in the app routes through this
// so nothing is removed without an explicit confirm.
export function confirmDelete(opts: {
  title?: string;
  message?: string;
  confirmLabel?: string;
  onConfirm: () => void;
}) {
  Alert.alert(opts.title ?? 'Delete?', opts.message ?? "This can't be undone.", [
    { text: 'Cancel', style: 'cancel' },
    { text: opts.confirmLabel ?? 'Delete', style: 'destructive', onPress: opts.onConfirm },
  ]);
}
