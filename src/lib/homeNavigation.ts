import type { TimelineItem } from "@/src/lib/home/types";
import type { FeatureId } from "@/src/lib/features/registry";

type IsFeatureEnabled = (featureId: FeatureId) => boolean;

const allFeaturesEnabled: IsFeatureEnabled = () => true;

export function routeForTimelineItem(
  item: TimelineItem,
  isFeatureEnabled: IsFeatureEnabled = allFeaturesEnabled,
): string | null {
  switch (item.type) {
    case "event":
      return isFeatureEnabled("calendar") ? calendarRouteForTimelineItem(item) : null;
    case "plan":
      return isFeatureEnabled("goals") ? "/(tabs)/us/plans" : null;
    case "reminder":
      return isFeatureEnabled("recurring") ? `/(tabs)/us/reminders?reminderId=${item.sourceId}` : null;
    case "task":
      if (!isFeatureEnabled("tasks")) return null;
      return item.sourceParentId
        ? `/(tabs)/us/tasks/${item.sourceParentId}?taskId=${item.sourceId}`
        : "/(tabs)/us/tasks";
    case "ritual":
      return isFeatureEnabled("recurring") && isFeatureEnabled("calendar")
        ? calendarRouteForTimelineItem(item)
        : null;
    case "memory": {
      if (item.sourceTable === "journalEntries") {
        return isFeatureEnabled("journal") ? "/(tabs)/us/journal" : null;
      }
      return null;
    }
    default:
      return null;
  }
}

function calendarRouteForTimelineItem(item: TimelineItem): string {
  const date = localDateParamFromTimestamp(item.occursAt);
  return date ? `/(tabs)/calendar?date=${date}` : "/(tabs)/calendar";
}

function localDateParamFromTimestamp(timestamp: number | null): string | null {
  if (timestamp === null || !Number.isFinite(timestamp)) return null;
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return null;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
