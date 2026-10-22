export type ResolutionPlanState = {
  order: string[];
  presets: Map<string, boolean>;
  activationKeys: Map<object, Map<string, string>>;
  usedKeys: Set<string>;
  grantSourceInstances: Map<number, string>;
};
