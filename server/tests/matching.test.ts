import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { ConverseCommandInput, ConverseCommandOutput } from "@aws-sdk/client-bedrock-runtime";
import { matchingService, resolveDate, resolveRequirements, type BedrockPort } from "../src/modules/matching/matching.service";
import { interpretQuerySchema } from "../src/modules/matching/matching.schemas";
import { isAppError } from "../src/lib/errors";

const NOW = Date.parse("2026-09-19T12:00:00+05:30");

function fakeBedrock(toolInput: unknown): BedrockPort {
  return {
    async converse(_input: ConverseCommandInput): Promise<ConverseCommandOutput> {
      return {
        $metadata: {},
        output: {
          message: {
            role: "assistant",
            content: [{ toolUse: { toolUseId: "tu_1", name: "extract_requirements", input: toolInput } }],
          },
        },
        stopReason: "tool_use",
      } as ConverseCommandOutput;
    },
  };
}

describe("resolveDate", () => {
  it("resolves relative days in Asia/Kolkata", () => {
    assert.equal(resolveDate("today", NOW), "2026-09-19");
    assert.equal(resolveDate("tomorrow", NOW), "2026-09-20");
  });

  it("resolves weekday names to the upcoming day", () => {
    assert.equal(resolveDate("saturday", NOW), "2026-09-19");
    assert.equal(resolveDate("monday", NOW), "2026-09-21");
  });

  it("passes ISO dates through and drops the rest", () => {
    assert.equal(resolveDate("2026-10-02", NOW), "2026-10-02");
    assert.equal(resolveDate("sometime", NOW), undefined);
    assert.equal(resolveDate(null, NOW), undefined);
  });
});

describe("resolveRequirements", () => {
  it("maps the PRODUCT example to a deterministic filter", () => {
    const { requirements, filter } = resolveRequirements(
      {
        skills: ["React ", "react", "Debugging"],
        location: "Pune",
        date: "today",
        startTime: "16:00",
        endTime: "18:00",
        maxHourlyRate: 800,
        mode: "ANY",
      },
      NOW,
    );

    assert.deepEqual(requirements.skills, ["React", "Debugging"]);
    assert.deepEqual(filter, {
      skills: ["React", "Debugging"],
      location: "Pune",
      from: "2026-09-19T16:00:00+05:30",
      to: "2026-09-19T18:00:00+05:30",
      maxHourlyRate: 800,
    });
  });

  it("falls back to the whole day when only a date is given", () => {
    const { filter } = resolveRequirements({ skills: [], date: "tomorrow" }, NOW);
    assert.deepEqual(filter, {
      from: "2026-09-20T00:00:00+05:30",
      to: "2026-09-20T23:59:59+05:30",
    });
  });

  it("keeps the usable half of an inverted time window", () => {
    const { filter } = resolveRequirements({ skills: [], date: "today", startTime: "18:00", endTime: "16:00" }, NOW);
    assert.equal(filter.from, "2026-09-19T18:00:00+05:30");
    assert.ok(!("to" in filter));
  });
});

describe("matchingService.interpretQuery", () => {
  it("turns a tool response into a search filter", async () => {
    const bedrock = fakeBedrock({
      skills: ["Python"],
      location: "Pune",
      date: "today",
      startTime: "16:00",
      endTime: "18:00",
      maxHourlyRate: 800,
      mode: "ONLINE",
    });

    const result = await matchingService.interpretQuery("Need a Python dev in Pune today 4 to 6pm under 800", "test-model", bedrock, NOW);
    assert.deepEqual(result.filter.skills, ["Python"]);
    assert.equal(result.filter.mode, "ONLINE");
    assert.equal(result.filter.from, "2026-09-19T16:00:00+05:30");
    assert.equal(result.filter.maxHourlyRate, 800);
  });

  it("maps Bedrock failures to a friendly unavailable error", async () => {
    const bedrock: BedrockPort = {
      async converse() {
        throw new Error("AccessDeniedException");
      },
    };

    await assert.rejects(
      matchingService.interpretQuery("Need help", "test-model", bedrock, NOW),
      (error: unknown) => isAppError(error) && error.status === 500,
    );
  });
});

describe("interpretQuerySchema", () => {
  it("bounds the query length", () => {
    assert.equal(interpretQuerySchema.safeParse({ query: "hi" }).success, false);
    assert.equal(interpretQuerySchema.safeParse({ query: "Need an electrician in Pune tomorrow morning" }).success, true);
  });
});
