/**
 * rules-engine.js
 *
 * Evaluates a JSON ruleset against a ticket object.
 *
 * Rule shape:
 * {
 *   "name": "auto_resolve_low_priority_wait",
 *   "conditions": [
 *     { "field": "priority", "operator": "equals", "value": "low" },
 *     { "field": "wait_time_minutes", "operator": "lte", "value": 10 }
 *   ],
 *   "match": "all",              // "all" (AND) or "any" (OR)
 *   "action": "auto_resolve"     // "auto_resolve" | "escalate"
 * }
 */

const OPERATORS = {
  equals: (a, b) => a === b,
  not_equals: (a, b) => a !== b,
  gt: (a, b) => Number(a) > Number(b),
  gte: (a, b) => Number(a) >= Number(b),
  lt: (a, b) => Number(a) < Number(b),
  lte: (a, b) => Number(a) <= Number(b),
  contains: (a, b) => String(a).toLowerCase().includes(String(b).toLowerCase()),
  in: (a, b) => Array.isArray(b) && b.includes(a),
};

class RuleValidationError extends Error {}

/** Validates ruleset structure. Throws RuleValidationError on failure. */
function validateRuleset(rules) {
  if (!Array.isArray(rules) || rules.length === 0) {
    throw new RuleValidationError("Ruleset must be a non-empty array of rules.");
  }
  for (const rule of rules) {
    if (!rule.name || typeof rule.name !== "string") {
      throw new RuleValidationError("Each rule requires a string 'name'.");
    }
    if (!Array.isArray(rule.conditions) || rule.conditions.length === 0) {
      throw new RuleValidationError(`Rule '${rule.name}' requires a non-empty 'conditions' array.`);
    }
    for (const cond of rule.conditions) {
      if (!cond.field || !cond.operator) {
        throw new RuleValidationError(`Rule '${rule.name}' has a condition missing 'field' or 'operator'.`);
      }
      if (!OPERATORS[cond.operator]) {
        throw new RuleValidationError(
          `Rule '${rule.name}' uses unsupported operator '${cond.operator}'. Supported: ${Object.keys(OPERATORS).join(", ")}`
        );
      }
    }
    if (!["all", "any"].includes(rule.match || "all")) {
      throw new RuleValidationError(`Rule '${rule.name}' has invalid 'match' value (use 'all' or 'any').`);
    }
    if (!["auto_resolve", "escalate"].includes(rule.action)) {
      throw new RuleValidationError(`Rule '${rule.name}' has invalid 'action' (use 'auto_resolve' or 'escalate').`);
    }
  }
  return true;
}

/** Evaluates one rule's conditions against a ticket. Returns true/false. */
function evaluateConditions(rule, ticket) {
  const results = rule.conditions.map((cond) => {
    const ticketValue = ticket[cond.field];
    const fn = OPERATORS[cond.operator];
    return fn(ticketValue, cond.value);
  });
  return (rule.match || "all") === "all" ? results.every(Boolean) : results.some(Boolean);
}

/**
 * Evaluates a ticket against an ordered ruleset.
 * First matching rule wins (policy-engine convention).
 * Returns { outcome, matchedRuleName }.
 */
function evaluateTicket(rules, ticket) {
  for (const rule of rules) {
    if (evaluateConditions(rule, ticket)) {
      return { outcome: rule.action, matchedRuleName: rule.name };
    }
  }
  return { outcome: "no_match", matchedRuleName: null };
}

/** Evaluates a batch of tickets, returns array of results with ticket ids. */
function evaluateBatch(rules, tickets) {
  return tickets.map((ticket) => ({
    ticketId: ticket.id,
    ...evaluateTicket(rules, ticket),
  }));
}

module.exports = {
  validateRuleset,
  evaluateConditions,
  evaluateTicket,
  evaluateBatch,
  RuleValidationError,
  OPERATORS,
};
