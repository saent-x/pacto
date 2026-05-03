import type { MilestoneStripItem, TimelineItem } from "@/src/lib/home/types";
import type { FeatureId } from "@/src/lib/features/registry";

type IsFeatureEnabled = (featureId: FeatureId) => boolean;

const allFeaturesEnabled: IsFeatureEnabled = () => true;

export function routeForTimelineItem(
  item: TimelineItem,
  isFeatureEnabled: IsFeatureEnabled = allFeaturesEnabled,
): string | null {
  switch (item.type) {
    case "event":
      return isFeatureEnabled("calendar") ? "/(tabs)/calendar" : null;
    case "plan":
      return isFeatureEnabled("goals") ? "/(tabs)/us/plans" : null;
    case "reminder":
      return isFeatureEnabled("recurring") ? "/(tabs)/us/reminders" : null;
    case "task":
      return isFeatureEnabled("tasks") ? "/(tabs)/us/tasks" : null;
    case "ritual":
      return isFeatureEnabled("recurring") && isFeatureEnabled("calendar") ? "/(tabs)/calendar" : null;
    case "memory": {
      if (item.sourceTable === "journalEntries") {
        return isFeatureEnabled("journal") ? "/(tabs)/us/journal" : null;
      }
      if (item.sourceTable === "loveNotes" || item.sourceTable === "memories") {
        return isFeatureEnabled("memories") ? "/(tabs)/us/notes" : null;
      }
      if (item.sourceTable === "milestones") {
        return isFeatureEnabled("memories") ? "/(tabs)/us/milestones" : null;
      }
      return null;
    }
    default:
      return null;
  }
}

export function routeForMilestoneItem(_item: MilestoneStripItem): string {
  return "/(tabs)/us/milestones";
}
