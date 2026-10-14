import { describe, expect, it } from "vitest";
import { FieldGroup } from "#shared/cards/FieldGroup";
import { findFieldGroupTraitsInQuery } from "#shared/cards/findFieldGroupTraitsInQuery";

describe("findFieldGroupTraitsInQuery", () => {
  it.each([
    ["deep savers", FieldGroup.DEEP_SAVERS.value],
    ["Wind Guardians", FieldGroup.WIND_GUARDIANS.value],
    ["METAL EMPIRE", FieldGroup.METAL_EMPIRE.value],
    ["nature spirits", FieldGroup.NATURE_SPIRITS.value],
    ["Nightmare Soldiers", FieldGroup.NIGHTMARE_SOLDIERS.value],
    ["virus busters", FieldGroup.VIRUS_BUSTERS.value],
  ])("finds the group named by %s", (query, trait) => {
    expect(findFieldGroupTraitsInQuery(query)).toEqual([trait]);
  });

  it.each([
    ["DS", FieldGroup.DEEP_SAVERS.value],
    ["wg", FieldGroup.WIND_GUARDIANS.value],
    ["me", FieldGroup.METAL_EMPIRE.value],
    ["NSP", FieldGroup.NATURE_SPIRITS.value],
    ["nso", FieldGroup.NIGHTMARE_SOLDIERS.value],
    ["[VB]", FieldGroup.VIRUS_BUSTERS.value],
  ])("finds the group abbreviated as %s", (query, trait) => {
    expect(findFieldGroupTraitsInQuery(query)).toEqual([trait]);
  });

  it("finds every group mentioned in one query", () => {
    expect(findFieldGroupTraitsInQuery("DS or metal empire")).toEqual([
      FieldGroup.DEEP_SAVERS.value,
      FieldGroup.METAL_EMPIRE.value,
    ]);
  });

  it.each(["Agumon", "Metalgarurumon", "deep", "savers deep", "dsa", "", "   "])(
    "ignores %j because no whole group name or abbreviation appears",
    (query) => {
      expect(findFieldGroupTraitsInQuery(query)).toEqual([]);
    },
  );
});
