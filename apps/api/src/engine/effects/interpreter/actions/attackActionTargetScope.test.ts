import { describe, expect, it } from "vitest";
import { AttackTargetScope } from "@aegis/shared/effects/ir/actions/AttackTargetScope";
import type { AttackAction } from "@aegis/shared/effects/ir/actions/combat";
import { attackActionTargetScope } from "#api/engine/effects/interpreter/actions/attackActionTargetScope";

const self = { filter: { isSelfRef: true }, count: 1, isSelf: true } satisfies AttackAction["target"];
const opponentDigimon = {
  filter: { controller: "opponent", kind: ["Digimon"] },
  count: 1,
} satisfies AttackAction["target"];

describe("attackActionTargetScope", () => {
  it("defaults to any target", () => {
    expect(attackActionTargetScope({ kind: "Attack", target: self })).toBe(AttackTargetScope.ANY.value);
  });

  it.each([AttackTargetScope.ANY.value, AttackTargetScope.PLAYER.value, AttackTargetScope.DIGIMON.value])(
    "keeps the authored %s scope",
    (scope) => {
      expect(attackActionTargetScope({ kind: "Attack", target: self, attackTargetScope: scope })).toBe(scope);
    },
  );

  it("limits an attack that names a separate Digimon defender to Digimon", () => {
    expect(attackActionTargetScope({ kind: "Attack", attacker: self, target: opponentDigimon })).toBe(
      AttackTargetScope.DIGIMON.value,
    );
  });

  it("lets an authored scope override the separate Digimon defender default", () => {
    expect(
      attackActionTargetScope({
        kind: "Attack",
        attacker: self,
        target: opponentDigimon,
        attackTargetScope: AttackTargetScope.ANY.value,
      }),
    ).toBe(AttackTargetScope.ANY.value);
  });

  it("keeps any target when the attacker is the target", () => {
    expect(attackActionTargetScope({ kind: "Attack", target: opponentDigimon })).toBe(AttackTargetScope.ANY.value);
  });
});
