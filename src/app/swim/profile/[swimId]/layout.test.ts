import { describe, it, expect, vi } from "vitest";
import { generateMetadata } from "./layout";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    swimMember: {
      findFirst: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";

describe("SwimmerProfileLayout metadata", () => {
  it("generates fallback metadata without AQA ERP when member is not found", async () => {
    vi.mocked(prisma.swimMember.findFirst).mockResolvedValueOnce(null);

    const meta = await generateMetadata({
      params: Promise.resolve({ swimId: "SWM-650535" }),
    });

    expect(meta.title).toEqual({
      absolute: "AQA Swim Client Card · SWM-650535",
    });
    expect(meta.description).toContain("AQA Swim Client Card");
    expect(meta.description).not.toContain("AQA ERP");
    expect(meta.openGraph?.title).toBe("AQA Swim Client Card · SWM-650535");
    expect(meta.openGraph?.description).toContain("AQA Swim Client Card");
    expect(meta.openGraph?.images).toBeDefined();
    expect((meta.twitter as { card?: string } | undefined)?.card).toBe("summary_large_image");
  });

  it("generates personalized metadata when member is found", async () => {
    vi.mocked(prisma.swimMember.findFirst).mockResolvedValueOnce({
      fullName: "Yanis Benali",
      swimId: "SWM-650535",
    } as any);

    const meta = await generateMetadata({
      params: Promise.resolve({ swimId: "SWM-650535" }),
    });

    expect(meta.title).toEqual({
      absolute: "Yanis Benali · AQA Swim Client Card",
    });
    expect(meta.description).toContain("Yanis Benali");
    expect(meta.description).toContain("AQA Swim Client Card");
    expect(meta.description).not.toContain("AQA ERP");
    expect(meta.openGraph?.title).toBe("Yanis Benali · AQA Swim Client Card");
  });
});
