export const FieldGroup = {
  DEEP_SAVERS: { name: "DEEP_SAVERS", value: "DS", label: "Deep Savers" },
  WIND_GUARDIANS: { name: "WIND_GUARDIANS", value: "WG", label: "Wind Guardians" },
  METAL_EMPIRE: { name: "METAL_EMPIRE", value: "ME", label: "Metal Empire" },
  NATURE_SPIRITS: { name: "NATURE_SPIRITS", value: "NSp", label: "Nature Spirits" },
  NIGHTMARE_SOLDIERS: { name: "NIGHTMARE_SOLDIERS", value: "NSo", label: "Nightmare Soldiers" },
  VIRUS_BUSTERS: { name: "VIRUS_BUSTERS", value: "VB", label: "Virus Busters" },
} as const;

export type FieldGroup = (typeof FieldGroup)[keyof typeof FieldGroup]["value"];
