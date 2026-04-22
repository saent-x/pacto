import type { MilestoneStripItem, TimelineItem } from "@/src/lib/home/types";

export function routeForTimelineItem(item: TimelineItem): string | null {
  switch (item.type) {
    case "event":
      return "/(tabs)/calendar";
    case "plan":
      return "/(tabs)/us/plans";
    case "reminder":
      return "/(tabs)/reminders";
    case "task":
      return "/(tabs)/tasks";
    case "ritual":
      return "/(tabs)/calendar";
    case "memory":
      return "/(tabs)/us/journal";
    default:
      return null;
  }
}

export function routeForMilestoneItem(_item: MilestoneStripItem): string {
  return "/(tabs)/us/milestones";
}
