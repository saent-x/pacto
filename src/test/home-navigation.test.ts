import { describe, expect, it } from "vitest";

import type { TimelineItem } from "@/src/lib/home/types";
import { routeForTimelineItem } from "@/src/lib/homeNavigation";

function makeTimelineItem(
  overrides: Partial<TimelineItem> = {},
): TimelineItem {
  return {
    id: "item-1",
    type: "event",
    sourceId: "source-1",
    sourceTable: "events",
    title: "Example",
    subtitle: null,
    occursAt: Date.now(),
    priority: 0,
    isPrivate: false,
    isOverdue: false,
    ...overrides,
  };
}

describe("homeNavigation", () => {
  it("maps timeline items to their home destinations", () => {
    expect(
      routeForTimelineItem(
        makeTimelineItem({
          type: "event",
          occursAt: new Date(2026, 3, 17, 20, 0, 0, 0).getTime(),
        }),
      ),
    ).toBe(
      "/(tabs)/calendar?date=2026-04-17",
    );
    expect(routeForTimelineItem(makeTimelineItem({ type: "plan" }))).toBe(
      "/(tabs)/us/plans",
    );
    expect(routeForTimelineItem(makeTimelineItem({ type: "reminder" }))).toBe(
      "/(tabs)/us/reminders?reminderId=source-1",
    );
    expect(routeForTimelineItem(makeTimelineItem({ type: "task" }))).toBe(
      "/(tabs)/us/tasks",
    );
    expect(
      routeForTimelineItem(
        makeTimelineItem({ type: "task", sourceParentId: "list-1" }),
      ),
    ).toBe("/(tabs)/us/tasks/list-1?taskId=source-1");
    expect(
      routeForTimelineItem(
        makeTimelineItem({
          type: "ritual",
          occursAt: new Date(2026, 3, 18, 9, 0, 0, 0).getTime(),
        }),
      ),
    ).toBe(
      "/(tabs)/calendar?date=2026-04-18",
    );
    expect(
      routeForTimelineItem(
        makeTimelineItem({ type: "memory", sourceTable: "journalEntries" }),
      ),
    ).toBe("/(tabs)/us/journal");
    expect(
      routeForTimelineItem(
        makeTimelineItem({ type: "memory", sourceTable: "retiredMemory" }),
      ),
    ).toBeNull();
  });
});
