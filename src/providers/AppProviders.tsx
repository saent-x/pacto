import type { ReactNode } from 'react';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';

import { SessionProvider } from '@/src/hooks/useSession';
import { ThemeProvider } from '@/src/lib/theme';

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <ThemeProvider>
        <BottomSheetModalProvider>{children}</BottomSheetModalProvider>
      </ThemeProvider>
    </SessionProvider>
  );
}
