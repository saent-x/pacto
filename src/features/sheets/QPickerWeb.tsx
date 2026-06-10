import type React from 'react';

// Native stub — QPicker renders the platform date/time pickers on iOS/Android;
// QPickerWeb.web.tsx replaces this with an HTML <input type="date|time"> on web,
// where @react-native-community/datetimepicker has no implementation.
export function QPickerWeb(_props: {
  value: Date;
  onChange: (d: Date) => void;
  mode: 'date' | 'time';
}): React.ReactNode {
  return null;
}
