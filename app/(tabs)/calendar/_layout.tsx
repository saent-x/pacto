import { NavAddBtn } from '@/src/components/ui/NavAddBtn';
import { TabStackLayout } from '@/src/components/ui/TabStackLayout';

export default function CalendarLayout() {
  return (
    <TabStackLayout
      eyebrow="April 2026"
      title="CAL"
      headerRight={() => <NavAddBtn href="/sheets/new-reminder" />}
    />
  );
}
