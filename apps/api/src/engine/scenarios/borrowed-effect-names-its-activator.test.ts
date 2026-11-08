import "#api/cards/BT27/BT27-072";
import "#api/cards/BT11/BT11-068";
import "#api/cards/BT6/BT6-064";
import "#api/cards/BT8/BT8-065";
import "#api/cards/BT4/BT4-096";
import { expect, it } from "vitest";
import { Phase } from "@aegis/shared/schema/enums";
import fixture from "#api/engine/scenarios/borrowed-on-deletion-alliance-attack.fixture";
import { setupScenario } from "#api/engine/testkit/scenario";
import { settle } from "#api/engine/testkit/harness";
import { observe } from "#api/engine/testkit/observe";

it("announces a borrowed On Deletion effect with the card and timing that activated it", async () => {
  const s = setupScenario(fixture);
  await s.ready();
  s.state.phase = Phase.Main;
  expect(
    s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: s.perm("attacker").permanentId,
      target: { kind: "player" },
    }),
  ).toEqual({ ok: true });
  await settle(() => s.state.combatWindow?.kind === "alliance");
  expect(s.engine.applyIntent(0, { type: "respondAlliance" })).toEqual({ ok: true });
  await settle(() => s.events.filter((event) => event.kind === "alliancePrompt").length === 2);
  expect(s.engine.applyIntent(0, { type: "respondAlliance" })).toEqual({ ok: true });
  await settle(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined);

  const borrowed = s.events.find((event) => event.kind === "effectTriggered" && event.sourceCardId === "BT6-064");
  expect(borrowed).toMatchObject({
    kind: "effectTriggered",
    sourceCardId: "BT6-064",
    activatedBy: { cardId: "BT27-072", timing: "WhenAttacking" },
  });
  const activator = s.events.find(
    (event) =>
      event.kind === "effectTriggered" && event.sourceCardId === "BT27-072" && !event.effectKey.includes("alliance"),
  );
  expect(activator).toBeDefined();
  expect(activator).not.toHaveProperty("activatedBy");
  expect(s.state.players[1]!.battleArea).toHaveLength(0);
});
