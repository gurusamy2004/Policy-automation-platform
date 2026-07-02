const {
  validateRuleset,
  evaluateTicket,
  evaluateBatch,
  RuleValidationError,
} = require("../rules-engine");

const sampleRules = [
  {
    name: "auto_resolve_low_priority_short_wait",
    conditions: [
      { field: "priority", operator: "equals", value: "low" },
      { field: "wait_time_minutes", operator: "lte", value: 10 },
    ],
    match: "all",
    action: "auto_resolve",
  },
  {
    name: "escalate_safety_issues",
    conditions: [{ field: "category", operator: "equals", value: "safety" }],
    match: "all",
    action: "escalate",
  },
  {
    name: "escalate_long_wait",
    conditions: [{ field: "wait_time_minutes", operator: "gt", value: 60 }],
    match: "any",
    action: "escalate",
  },
];

describe("validateRuleset", () => {
  test("accepts a well-formed ruleset", () => {
    expect(validateRuleset(sampleRules)).toBe(true);
  });

  test("rejects empty ruleset", () => {
    expect(() => validateRuleset([])).toThrow(RuleValidationError);
  });

  test("rejects rule missing conditions", () => {
    expect(() =>
      validateRuleset([{ name: "bad_rule", action: "escalate", conditions: [] }])
    ).toThrow(RuleValidationError);
  });

  test("rejects unsupported operator", () => {
    expect(() =>
      validateRuleset([
        {
          name: "bad_op",
          conditions: [{ field: "priority", operator: "fuzzy_match", value: "x" }],
          action: "escalate",
        },
      ])
    ).toThrow(/unsupported operator/);
  });

  test("rejects invalid action", () => {
    expect(() =>
      validateRuleset([
        {
          name: "bad_action",
          conditions: [{ field: "priority", operator: "equals", value: "low" }],
          action: "delete_ticket",
        },
      ])
    ).toThrow(/invalid 'action'/);
  });
});

describe("evaluateTicket", () => {
  test("auto-resolves a low priority, short-wait ticket", () => {
    const ticket = { id: 1, priority: "low", wait_time_minutes: 5, category: "fare_dispute" };
    const result = evaluateTicket(sampleRules, ticket);
    expect(result).toEqual({ outcome: "auto_resolve", matchedRuleName: "auto_resolve_low_priority_short_wait" });
  });

  test("escalates a safety ticket regardless of wait time", () => {
    const ticket = { id: 2, priority: "high", wait_time_minutes: 1, category: "safety" };
    const result = evaluateTicket(sampleRules, ticket);
    expect(result.outcome).toBe("escalate");
    expect(result.matchedRuleName).toBe("escalate_safety_issues");
  });

  test("escalates on long wait time via 'any' match", () => {
    const ticket = { id: 3, priority: "high", wait_time_minutes: 75, category: "lost_item" };
    const result = evaluateTicket(sampleRules, ticket);
    expect(result.outcome).toBe("escalate");
    expect(result.matchedRuleName).toBe("escalate_long_wait");
  });

  test("returns no_match when nothing applies", () => {
    const ticket = { id: 4, priority: "medium", wait_time_minutes: 20, category: "billing" };
    const result = evaluateTicket(sampleRules, ticket);
    expect(result).toEqual({ outcome: "no_match", matchedRuleName: null });
  });

  test("first matching rule wins when multiple could match", () => {
    // Ticket matches both rule 1 (low/short wait) is false here, but rule 3 and rule 2 could overlap
    const ticket = { id: 5, priority: "low", wait_time_minutes: 90, category: "safety" };
    const result = evaluateTicket(sampleRules, ticket);
    // rule order: safety check comes before long-wait check
    expect(result.matchedRuleName).toBe("escalate_safety_issues");
  });
});

describe("evaluateBatch", () => {
  test("evaluates multiple tickets and preserves ticket ids", () => {
    const tickets = [
      { id: 10, priority: "low", wait_time_minutes: 5, category: "fare_dispute" },
      { id: 11, priority: "medium", wait_time_minutes: 20, category: "billing" },
    ];
    const results = evaluateBatch(sampleRules, tickets);
    expect(results).toHaveLength(2);
    expect(results[0]).toMatchObject({ ticketId: 10, outcome: "auto_resolve" });
    expect(results[1]).toMatchObject({ ticketId: 11, outcome: "no_match" });
  });
});
