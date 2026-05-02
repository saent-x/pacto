import { describe, expect, it } from "vitest";

import type { MilestoneStripItem, TimelineItem } from "@/src/lib/home/types";
import {
  routeForMilestoneItem,
  routeForTimelineItem,
} from "@/src/lib/homeNavigation";

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
    expect(routeForTimelineItem(makeTimelineItem({ type: "event" }))).toBe(
      "/(tabs)/calendar",
    );
    expect(routeForTimelineItem(makeTimelineItem({ type: "plan" }))).toBe(
      "/(tabs)/us/plans",
    );
    expect(routeForTimelineItem(makeTimelineItem({ type: "reminder" }))).toBe(
      "/(tabs)/reminders",
    );
    expect(routeForTimelineItem(makeTimelineItem({ type: "task" }))).toBe(
      "/(tabs)/tasks",
    );
    expect(routeForTimelineItem(makeTimelineItem({ type: "ritual" }))).toBe(
      "/(tabs)/calendar",
    );
    expect(
      routeForTimelineItem(
        makeTimelineItem({ type: "memory", sourceTable: "journalEntries" }),
      ),
    ).toBe("/(tabs)/us/journal");
    expect(
      routeForTimelineItem(
        makeTimelineItem({ type: "memory", sourceTable: "loveNotes" }),
      ),
    ).toBe("/(tabs)/us/notes");
  });

  it("returns a milestones route for countdown cards", () => {
    const milestone: MilestoneStripItem = {
      id: "milestone-1",
      type: "countdown",
      title: "Anniversary",
      subtitle: null,
      date: "2026-05-01",
      daysUntil: 20,
    };

    expect(routeForMilestoneItem(milestone)).toBe(
      "/(tabs)/us/milestones",
    );
  });
});
