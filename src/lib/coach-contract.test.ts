import { describe, expect, it } from "vitest";
import {
  normalizeBootstrapPayload,
  normalizeMember,
  normalizeReplacement,
  normalizeSession,
} from "../../coach-mobile/src/contract";

describe("coach-mobile full-parity contract normalization", () => {
  it("normalizes ERP /api/coach/bootstrap payload including swimmers, allCoaches, myAbsences, and coachNotifications", () => {
    const normalized = normalizeBootstrapPayload({
      coach: {
        id: "c1",
        name: "Coach Karim",
        email: "karim@aqasports.com",
        role: "head_coach",
        specialties: ["Crawl", "Papillon"],
      },
      allCoaches: [
        {
          id: "c2",
          name: "Coach Sara",
          phone: "0600000000",
          role: "coach",
        },
      ],
      groups: [
        {
          id: "g1",
          name: "Cadets Elite",
          category: "homme",
          level: "Perfectionnement",
          capacity: 20,
          activeMembersCount: 1,
        },
      ],
      swimmers: [
        {
          id: "m1",
          swimId: "SWM-101",
          fullName: "Yassine Amrani",
          groupId: "g1",
          groupName: "Cadets Elite",
          currentLevel: "Perfectionnement",
          isNewClient: true,
          bars: {
            basics: 140,
            crawl: 155,
            backstroke: 130,
            breaststroke: 120,
            butterfly: 135,
          },
          totalDistanceMeters: 800,
          record50m: 32.5,
          recordApnea: 35,
          heightCm: 168,
          weightKg: 58,
          unlockedBadges: ["starter", "dolphin", "shark"],
          badgeKey: "shark",
          stageKey: "crawl_back",
        },
      ],
      sessions: [],
      todaySessions: [],
      pendingRequests: [],
      activeReplacements: [],
      myAbsences: [
        {
          id: "abs-1",
          startDate: "2026-11-08",
          endDate: "2026-11-09",
          reason: "Competition Nationale",
          status: "PENDING",
        },
      ],
      coachNotifications: [
        {
          id: "notif-1",
          type: "new_client",
          title: "Nouveau nageur",
          message: "Yassine Amrani a rejoint Cadets Elite",
          createdAt: "2026-11-07T18:00:00.000Z",
        },
      ],
      appConfig: {
        swimmerOfTheMonthLocked: true,
      },
      todayDate: "2026-11-07",
      serverTime: "2026-11-07T18:00:00.000Z",
    });

    expect(normalized.coach.name).toBe("Coach Karim");
    expect(normalized.coach.isHeadCoach).toBe(true);
    expect(normalized.allCoaches).toHaveLength(1);
    expect(normalized.allCoaches[0].name).toBe("Coach Sara");
    expect(normalized.members).toHaveLength(1);
    expect(normalized.members[0].fullName).toBe("Yassine Amrani");
    expect(normalized.members[0].bars.crawl).toBe(155);
    expect(normalized.members[0].totalDistanceMeters).toBe(800);
    expect(normalized.members[0].unlockedBadges).toEqual(["starter", "dolphin", "shark"]);
    expect(normalized.myAbsences).toHaveLength(1);
    expect(normalized.coachNotifications).toHaveLength(1);
    expect(normalized.appConfig.swimmerOfTheMonthLocked).toBe(true);
  });

  it("normalizes session, member 0-200% bars, and replacement payloads accurately", () => {
    const session = normalizeSession({
      id: "s1",
      groupId: "g1",
      groupName: "Cadets Elite",
      sessionDate: "2026-11-07T00:00:00.000Z",
      startTime: "18:00",
      endTime: "19:30",
      status: "COMPLETED",
      attendanceStats: {
        present: 14,
        absent: 2,
        marked: 16,
        total: 16,
      },
      sessionRating: {
        rating: 5,
        intensity: "Elevée",
        focus: "Sprint Crawl",
        discipline: 5,
        waterTempC: 27,
      },
    });

    expect(session.groupName).toBe("Cadets Elite");
    expect(session.isCompleted).toBe(true);
    expect(session.presentCount).toBe(14);
    expect(session.sessionRating?.focus).toBe("Sprint Crawl");

    const member = normalizeMember({
      id: "m1",
      fullName: "Yassine Amrani",
      bars: {
        basics: 200,
        crawl: 185,
        backstroke: 170,
        breaststroke: 160,
        butterfly: 150,
      },
      totalDistanceMeters: 1500,
      unlockedBadges: ["orca", "kraken"],
    });

    expect(member.bars.basics).toBe(200);
    expect(member.bars.crawl).toBe(185);
    expect(member.totalDistanceMeters).toBe(1500);

    const replacement = normalizeReplacement(
      {
        id: "rep-1",
        sessionId: "s1",
        sessionDate: "2026-11-08",
        groupName: "Cadets Elite",
        originalCoachId: "c1",
        originalCoachName: "Coach Karim",
        substituteCoachId: "c2",
        substituteCoachName: "Coach Sara",
        status: "PROPOSED",
        reason: "Competition",
      },
      "c2"
    );

    expect(replacement.isIncomingRequest).toBe(true);
    expect(replacement.isPending).toBe(true);
    expect(replacement.replacementCoachName).toBe("Coach Sara");
  });
});
