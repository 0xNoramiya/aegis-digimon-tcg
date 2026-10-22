export const InterpreterCallbackKind = {
  COST_REPLACEMENT: { name: "COST_REPLACEMENT", value: "ir-cost-replacement" },
  SUBTRIGGER: { name: "SUBTRIGGER", value: "ir-subtrigger" },
  DELAYED_MATCH: { name: "DELAYED_MATCH", value: "ir-delayed-match" },
  DELAYED_BODY: { name: "DELAYED_BODY", value: "ir-delayed-body" },
  LEAVE_REPLACEMENT: { name: "LEAVE_REPLACEMENT", value: "ir-leave-replacement" },
  COST_MODIFIER: { name: "COST_MODIFIER", value: "ir-cost-modifier" },
  PERMANENT_FILTER_MATCH: { name: "PERMANENT_FILTER_MATCH", value: "ir-permanent-filter-match" },
  GRANT_ACTIVITY: { name: "GRANT_ACTIVITY", value: "ir-grant-activity" },
} as const;
