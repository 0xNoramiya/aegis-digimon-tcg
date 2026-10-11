import prepared0 from "./mastemon-digivolve.fixture.js";
import prepared1 from "./mastemon-attack.fixture.js";
import { fixtureVariant, fixtureInstanceId, fixturePermanentId } from "../scenario/references.js";

import { expect, it } from "vitest";
import { Phase, Zone, type DecisionResponse } from "@aegis/shared";
import { layScenarioFixture } from "../scenario/fixture.js";

import { advance } from "../testkit/advance.js";
import { observe } from "../testkit/observe.js";
import { setupEngine, settle, assertNoLoudGap } from "../testkit/harness.js";
import "../../cards/index.js";

const preparedFixtures = { "mastemon-digivolve": prepared0, "mastemon-attack": prepared1 };

const COST_CLAUSE =
  "[When Digivolving] [When Attacking] [Once Per Turn] By trashing your top security card, you may play 1 purple or yellow Digimon card with 6000 DP or less from your hand or trash without paying the cost.";
const PLAY_CLAUSE =
  "You may play 1 purple or yellow Digimon card with 6000 DP or less from your hand or trash without paying the cost.";

it.each(["digivolve", "attack"] as const)(
  "Feedback #84: Mastemon can pay the security cost on %s and decline the free play",
  async (timing) => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: timing === "digivolve" ? "BT10-079" : "P-187", as: "host" }],
        hand: [
          ...(timing === "digivolve" ? [{ card: "P-187", as: "mastemon" }] : []),
          { card: "BT1-045", as: "handCandidate" },
          { card: "BT1-059", as: "tooLarge" },
        ],
        trash: [{ card: "BT3-083", as: "trashCandidate" }],
        security: [
          { card: "BT1-009", as: "topSecurity" },
          { card: "BT1-009", as: "bottomSecurity" },
        ],
        deck: [
          { card: "BT1-009", as: "evolutionDraw" },
          { card: "BT1-009", as: "recovery" },
          ...Array(18).fill("BT1-009"),
        ],
      },
      1: { security: Array(5).fill("BT1-009"), deck: Array(20).fill("BT1-009") },
    });
    s.state.memory = 10;
    await s.ready();
    const host = s.perm("host");
    const sourceId = host.topCard.instanceId;
    const costId = s.inst(timing === "digivolve" ? "recovery" : "topSecurity").instanceId;
    try {
      expect(
        s.engine.applyIntent(
          0,
          timing === "digivolve"
            ? { type: "digivolve", permanentId: host.permanentId, instanceId: s.inst("mastemon").instanceId }
            : { type: "attack", attackerPermanentId: host.permanentId, target: { kind: "player" } },
        ),
      ).toEqual({ ok: true });
      await settle(() => s.state.pendingDecision?.kind === "optional");
      expect(
        s.engine.applyIntent(0, {
          type: "respondDecision",
          decisionId: s.state.pendingDecision!.decisionId,
          response: { kind: "optional", accept: true },
        }),
      ).toEqual({ ok: true });
      await settle(() => s.state.players[0]!.trash.some((c) => c.instanceId === costId) && !!s.state.pendingDecision);
      expect(s.state.pendingDecision!.kind).toBe("optional");
      const request = s.decisions.at(-1)!.req;
      expect(request.options!.effectTextPart).toBe(COST_CLAUSE);
      expect(
        s.engine.applyIntent(0, {
          type: "respondDecision",
          decisionId: s.state.pendingDecision!.decisionId,
          response: { kind: "optional", accept: false },
        }),
      ).toEqual({ ok: true });
      await settle(() => !s.state.pendingDecision && s.engine.mainVerbContinuationsInFlight === 0);
      expect(s.state.players[0]!.battleArea.map((p) => p.permanentId)).toEqual([host.permanentId]);
      expect(s.state.players[0]!.hand.map((c) => c.instanceId)).toContain(s.inst("handCandidate").instanceId);
      expect(s.state.players[0]!.trash.map((c) => c.instanceId)).toEqual([s.inst("trashCandidate").instanceId, costId]);
      expect(s.state.players[0]!.security.map((c) => c.instanceId)).toEqual(
        timing === "digivolve"
          ? [s.inst("topSecurity").instanceId, s.inst("bottomSecurity").instanceId]
          : [s.inst("bottomSecurity").instanceId],
      );
      expect(host.stack.map((c) => c.instanceId)).toEqual(timing === "digivolve" ? [sourceId] : []);
      expect(s.state.memory).toBe(timing === "digivolve" ? 5 : 10);
      expect(s.events.filter((e) => e.kind === "attackEnded")).toHaveLength(timing === "digivolve" ? 0 : 1);
      assertNoLoudGap(s);
    } finally {
      s.engine.applyIntent(0, { type: "surrender" });
    }
  },
);

function respond(s: ReturnType<typeof setupEngine>, response: DecisionResponse) {
  expect(
    s.engine.applyIntent(0, {
      type: "respondDecision",
      decisionId: s.state.pendingDecision!.decisionId,
      response,
    }),
  ).toEqual({ ok: true });
}

async function optional(s: ReturnType<typeof setupEngine>, accept: boolean) {
  await settle(() => s.state.pendingDecision?.kind === "optional");
  const request = s.decisions.at(-1)!.req;
  expect(request.options!.effectTextPart).toBe(COST_CLAUSE);
  expect(request.options!.effectTextEmphasis).toBe(
    request.promptText?.startsWith("Pay cost:") ? "By trashing your top security card" : PLAY_CLAUSE,
  );
  respond(s, { kind: "optional", accept });
}

async function drained(s: ReturnType<typeof setupEngine>) {
  await settle(
    () => !s.state.pendingDecision && s.engine.mainVerbContinuationsInFlight === 0 && !observe(s.engine).isAttacking(),
  );
  assertNoLoudGap(s);
}

function attack(s: ReturnType<typeof setupEngine>) {
  expect(
    s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: s.perm("host").permanentId,
      target: { kind: "player" },
    }),
  ).toEqual({ ok: true });
}

function fixture(timing: "digivolve" | "attack", security = true, eligible = true) {
  const s = setupEngine({
    0: {
      battleArea: [{ card: timing === "digivolve" ? "BT10-079" : "P-187", as: "host" }],
      hand: [
        ...(timing === "digivolve" ? [{ card: "P-187", as: "mastemon" }] : []),
        ...(eligible
          ? [
              { card: "BT1-057", as: "yellow6000" },
              { card: "BT10-079", as: "purple6000" },
            ]
          : []),
        { card: "BT1-058", as: "yellow7000" },
        { card: "BT1-020", as: "red6000" },
        { card: "BT1-087", as: "yellowTamer" },
      ],
      trash: eligible
        ? [
            { card: "BT1-057", as: "trashYellow" },
            { card: "BT10-079", as: "trashPurple" },
          ]
        : [],
      security: security
        ? [
            { card: "BT1-009", as: "securityTop" },
            { card: "BT1-010", as: "securityBottom" },
          ]
        : [],
      deck: [{ card: "BT1-009", as: "draw" }, { card: "BT1-010", as: "recovery" }, ...Array(18).fill("BT1-009")],
    },
    1: { security: Array(5).fill("BT1-009"), deck: Array(20).fill("BT1-009") },
  });
  s.state.memory = 10;
  return s;
}

async function trigger(s: ReturnType<typeof setupEngine>, timing: "digivolve" | "attack") {
  await s.ready();
  expect(
    s.engine.applyIntent(
      0,
      timing === "attack"
        ? { type: "attack", attackerPermanentId: s.perm("host").permanentId, target: { kind: "player" } }
        : { type: "digivolve", permanentId: s.perm("host").permanentId, instanceId: s.inst("mastemon").instanceId },
    ),
  ).toEqual({ ok: true });
}

it.each(["digivolve", "attack"] as const)(
  "Feedback #84: %s can accept play, reject illegal targets, then back out of the paid min-0 pick",
  async (timing) => {
    const s = fixture(timing);
    try {
      await trigger(s, timing);
      await optional(s, true);
      await optional(s, true);
      await settle(() => s.state.pendingDecision?.kind === "selectCards");
      const request = s.decisions.at(-1)!.req;
      expect(request.options).toMatchObject({ min: 0, max: 1 });
      expect(request.options!.candidateInstanceIds).toEqual(
        expect.arrayContaining(
          ["yellow6000", "purple6000", "trashYellow", "trashPurple"].map((a) => s.inst(a).instanceId),
        ),
      );
      expect(request.options!.candidateInstanceIds).toHaveLength(4);
      for (const alias of ["yellow7000", "red6000", "yellowTamer"]) {
        const decisionId = s.state.pendingDecision!.decisionId;
        expect(
          s.engine.applyIntent(0, {
            type: "respondDecision",
            decisionId,
            response: { kind: "selectCards", instanceIds: [s.inst(alias).instanceId] },
          }).ok,
        ).toBe(false);
        expect(s.state.pendingDecision!.decisionId).toBe(decisionId);
      }
      respond(s, { kind: "selectCards", instanceIds: [] });
      await drained(s);
      const costId = s.inst(timing === "digivolve" ? "recovery" : "securityTop").instanceId;
      expect(s.state.players[0]!.trash.map((c) => c.instanceId)).toContain(costId);
      expect(s.state.players[0]!.battleArea).toHaveLength(1);
      expect(s.state.memory).toBe(timing === "digivolve" ? 5 : 10);
      const decisions = s.decisions.length;
      if (timing === "digivolve") {
        attack(s);
        await drained(s);
      }
      expect(s.decisions.slice(decisions).some(({ req }) => req.sourceCardId === "P-187")).toBe(false);
      expect(s.state.players[0]!.security).toHaveLength(timing === "digivolve" ? 2 : 1);
    } finally {
      s.engine.applyIntent(0, { type: "surrender" });
    }
  },
);

it.each(["yellow6000", "purple6000", "trashYellow", "trashPurple"])(
  "Feedback #84: plays the exact legal 6000-DP instance %s without memory cost",
  async (alias) => {
    const s = fixture("attack");
    const playedId = s.inst(alias).instanceId;
    const costId = s.inst("securityTop").instanceId;
    try {
      await trigger(s, "attack");
      await optional(s, true);
      await optional(s, true);
      await settle(() => s.state.pendingDecision?.kind === "selectCards");
      respond(s, { kind: "selectCards", instanceIds: [playedId] });
      await drained(s);
      expect(s.state.players[0]!.battleArea.map((p) => p.topCard.instanceId)).toContain(playedId);
      expect(s.state.players[0]!.hand.map((c) => c.instanceId)).not.toContain(playedId);
      expect(s.state.players[0]!.trash.map((c) => c.instanceId)).not.toContain(playedId);
      expect(s.state.players[0]!.trash.map((c) => c.instanceId)).toContain(costId);
      expect(s.state.players[0]!.security.map((c) => c.instanceId)).toEqual([s.inst("securityBottom").instanceId]);
      expect(s.state.memory).toBe(10);
    } finally {
      s.engine.applyIntent(0, { type: "surrender" });
    }
  },
);

it("Feedback #84: declining the digivolution cost preserves the shared attack opportunity", async () => {
  const s = fixture("digivolve");
  try {
    await trigger(s, "digivolve");
    await optional(s, false);
    await drained(s);
    expect(s.state.players[0]!.security).toHaveLength(3);
    expect(s.state.players[0]!.trash.map((c) => c.instanceId)).not.toContain(s.inst("recovery").instanceId);
    attack(s);
    await optional(s, true);
    await optional(s, false);
    await drained(s);
    expect(s.state.players[0]!.security).toHaveLength(2);
    expect(s.state.players[0]!.trash.map((c) => c.instanceId)).toContain(s.inst("recovery").instanceId);
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
  } finally {
    s.engine.applyIntent(0, { type: "surrender" });
  }
});

it.each(["digivolve", "attack"] as const)("Feedback #84: %s can pay with no eligible payload", async (timing) => {
  const s = fixture(timing, true, false);
  try {
    await trigger(s, timing);
    await optional(s, true);
    await optional(s, true);
    await drained(s);
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.state.players[0]!.trash.map((c) => c.instanceId)).toEqual([
      s.inst(timing === "digivolve" ? "recovery" : "securityTop").instanceId,
    ]);
    expect(s.state.players[0]!.security).toHaveLength(timing === "digivolve" ? 2 : 1);
  } finally {
    s.engine.applyIntent(0, { type: "surrender" });
  }
});

it("Feedback #84: zero-security attack cannot pay or play", async () => {
  const s = fixture("attack", false);
  try {
    await trigger(s, "attack");
    await drained(s);
    expect(s.decisions.some(({ req }) => req.sourceCardId === "P-187")).toBe(false);
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.state.players[0]!.security).toHaveLength(0);
    expect(s.state.memory).toBe(10);
  } finally {
    s.engine.applyIntent(0, { type: "surrender" });
  }
});

it("Feedback #84: zero initial security on digivolution recovers before the optional cost", async () => {
  const s = fixture("digivolve", false);
  try {
    await trigger(s, "digivolve");
    await settle(() => s.state.pendingDecision?.kind === "optional");
    expect(s.state.players[0]!.security.map((c) => c.instanceId)).toEqual([s.inst("recovery").instanceId]);
    await optional(s, true);
    await optional(s, false);
    await drained(s);
    expect(s.state.players[0]!.security).toHaveLength(0);
    expect(s.state.players[0]!.trash.map((c) => c.instanceId)).toContain(s.inst("recovery").instanceId);
    expect(s.state.memory).toBe(5);
  } finally {
    s.engine.applyIntent(0, { type: "surrender" });
  }
});

it("Feedback #84: the trashed top security becomes a legal payload candidate only after payment", async () => {
  const s = fixture("attack", false, false);
  const cost = s.give(0, Zone.Security, { card: "BT1-057", as: "costCandidate" });
  try {
    await trigger(s, "attack");
    await optional(s, true);
    await optional(s, true);
    // The engine resolves the unique legal candidate after the explicit payload Yes.
    await drained(s);
    expect(s.state.players[0]!.security).toHaveLength(0);
    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.state.players[0]!.battleArea.map((p) => p.topCard.instanceId)).toContain(cost.instanceId);
    expect(s.state.memory).toBe(10);
  } finally {
    s.engine.applyIntent(0, { type: "surrender" });
  }
});

it("Feedback #84: paid payload refusal consumes WD-to-WA OPT and resets on a natural next turn", async () => {
  const s = fixture("digivolve");
  await s.ready();
  const loop = s.engine.startTurnLoop();
  try {
    await advance(s.engine).waitForMainPhase(0);
    await trigger(s, "digivolve");
    await optional(s, true);
    await optional(s, false);
    await drained(s);
    const decisions = s.decisions.length;
    attack(s);
    await drained(s);
    expect(s.decisions.slice(decisions).some(({ req }) => req.sourceCardId === "P-187")).toBe(false);
    expect(s.state.players[0]!.security).toHaveLength(2);
    expect(s.state.memory).toBe(5);
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    advance(s.engine).endMainPhaseIfOpen(1);
    await advance(s.engine).waitForMainPhase(0);
    expect(s.perm("host").isSuspended).toBe(false);
    attack(s);
    await optional(s, true);
    await optional(s, false);
    await drained(s);
    expect(s.state.players[0]!.security.map((c) => c.instanceId)).toEqual([s.inst("securityBottom").instanceId]);
    expect(s.state.players[0]!.trash.map((c) => c.instanceId)).toEqual(
      expect.arrayContaining([s.inst("recovery").instanceId, s.inst("securityTop").instanceId]),
    );
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
  } finally {
    s.engine.applyIntent(0, { type: "surrender" });
    await loop;
  }
});

it.each(["digivolve", "attack"] as const)(
  "Feedback #84: playable %s arena pays then refuses through public decisions",
  async (timing) => {
    const s = setupEngine({ 0: {}, 1: {} });
    layScenarioFixture(
      s.state,
      fixtureVariant(preparedFixtures, timing === "digivolve" ? "mastemon-digivolve" : "mastemon-attack"),
    );
    const loop = s.engine.startTurnLoop();
    try {
      await settle(() => s.state.phase === Phase.Breeding);
      expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
      await advance(s.engine).waitForMainPhase(0);
      const hostId = fixturePermanentId("dev-perm-0-feedback84-host");
      expect(
        s.engine.applyIntent(
          0,
          timing === "digivolve"
            ? { type: "digivolve", permanentId: hostId, instanceId: fixtureInstanceId("dev-feedback84-mastemon") }
            : { type: "attack", attackerPermanentId: hostId, target: { kind: "player" } },
        ),
      ).toEqual({ ok: true });
      await settle(() => s.state.pendingDecision?.kind === "optional");
      const costId = s.state.players[0]!.security[0]!.instanceId;
      await optional(s, true);
      await optional(s, false);
      await drained(s);
      expect(s.state.players[0]!.trash.map((c) => c.instanceId)).toContain(costId);
      expect(s.state.players[0]!.security).toHaveLength(timing === "digivolve" ? 3 : 2);
      expect(s.state.players[0]!.battleArea.map((p) => p.permanentId)).toEqual([hostId]);
      expect(s.state.players[0]!.hand.map((c) => c.instanceId)).toContain(fixtureInstanceId("dev-feedback84-yellow"));
      expect(s.state.players[0]!.trash.map((c) => c.instanceId)).toContain(fixtureInstanceId("dev-feedback84-purple"));
      expect(s.state.memory).toBe(timing === "digivolve" ? 5 : 10);
    } finally {
      s.engine.applyIntent(0, { type: "surrender" });
      await loop;
    }
  },
);
