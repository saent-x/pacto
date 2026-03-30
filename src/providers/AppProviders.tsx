import type { ReactNode } from 'react';
import { ConvexBetterAuthProvider } from '@convex-dev/better-auth/react';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';

import { SessionProvider } from '@/src/hooks/useSession';
import { authClient } from '@/src/lib/auth-client';
import { getConvexClient } from '@/src/lib/convex';
import { ThemeProvider } from '@/src/lib/theme';

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ConvexBetterAuthProvider client={getConvexClient()} authClient={authClient}>
      <SessionProvider>
        <ThemeProvider>
          <BottomSheetModalProvider>{children}</BottomSheetModalProvider>
        </ThemeProvider>
      </SessionProvider>
    </ConvexBetterAuthProvider>
  );
}
