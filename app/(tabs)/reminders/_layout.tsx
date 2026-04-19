import { NavAddBtn } from '@/src/components/ui/NavAddBtn';
import { TabStackLayout } from '@/src/components/ui/TabStackLayout';
import { pastels } from '@/src/lib/tokens';

export default function RemindersLayout() {
  return (
    <TabStackLayout
      eyebrow="06 · Reminders"
      title="REMIND"
      accent={pastels.reminders}
      headerRight={() => <NavAddBtn href="/sheets/new-reminder" />}
    />
  );
}
