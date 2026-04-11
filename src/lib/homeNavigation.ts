import type { MilestoneStripItem, TimelineItem } from "@/convex/timeline";

export function routeForTimelineItem(item: TimelineItem): string | null {
  switch (item.type) {
    case "event":
      return "/(tabs)/calendar";
    case "plan":
      return "/(tabs)/together/plans";
    case "reminder":
      return "/(tabs)/reminders";
    case "task":
      return "/(tabs)/tasks";
    case "ritual":
      return "/(tabs)/calendar";
    default:
      return null;
  }
}

export function routeForMilestoneItem(_item: MilestoneStripItem): string {
  return "/(tabs)/together/milestones";
}
