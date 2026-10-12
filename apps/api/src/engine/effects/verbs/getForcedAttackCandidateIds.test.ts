import { describe, expect, it } from "vitest";
import { AttackTargetScope } from "@aegis/shared/effects/ir/actions/AttackTargetScope";
import { getForcedAttackCandidateIds } from "#api/engine/effects/verbs/getForcedAttackCandidateIds";

const legalDigimonIds = ["enemy-a", "enemy-b"];

describe("getForcedAttackCandidateIds", () => {
  it.each([
    { scope: AttackTargetScope.ANY.value, expected: ["player", "enemy-a", "enemy-b"] },
    { scope: AttackTargetScope.PLAYER.value, expected: ["player"] },
    { scope: AttackTargetScope.DIGIMON.value, expected: ["enemy-a", "enemy-b"] },
  ])("offers $expected for the $scope scope", ({ scope, expected }) => {
    expect(
      getForcedAttackCandidateIds({ scope, isPlayerLegal: true, playerCandidateId: "player", legalDigimonIds }),
    ).toEqual(expected);
  });

  it.each([
    { scope: AttackTargetScope.ANY.value, expected: ["enemy-a", "enemy-b"] },
    { scope: AttackTargetScope.PLAYER.value, expected: [] },
  ])("omits an illegal player target for the $scope scope", ({ scope, expected }) => {
    expect(
      getForcedAttackCandidateIds({ scope, isPlayerLegal: false, playerCandidateId: "player", legalDigimonIds }),
    ).toEqual(expected);
  });
});
