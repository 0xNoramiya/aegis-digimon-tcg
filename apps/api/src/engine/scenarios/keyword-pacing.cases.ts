import fixtureKeywordPacingAllianceAccept from "./keyword-pacing-alliance-accept.fixture.js";
import fixtureKeywordPacingAllianceDecline from "./keyword-pacing-alliance-decline.fixture.js";
import fixtureKeywordPacingBarrierAccept from "./keyword-pacing-barrier-accept.fixture.js";
import fixtureKeywordPacingBarrierDecline from "./keyword-pacing-barrier-decline.fixture.js";
import fixtureKeywordPacingBlockerAccept from "./keyword-pacing-blocker-accept.fixture.js";
import fixtureKeywordPacingBlockerDecline from "./keyword-pacing-blocker-decline.fixture.js";
import fixtureKeywordPacingEvadeAccept from "./keyword-pacing-evade-accept.fixture.js";
import fixtureKeywordPacingEvadeDecline from "./keyword-pacing-evade-decline.fixture.js";
import fixtureKeywordPacingArmorPurgeAccept from "./keyword-pacing-armor-purge-accept.fixture.js";
import fixtureKeywordPacingArmorPurgeDecline from "./keyword-pacing-armor-purge-decline.fixture.js";
import fixtureKeywordPacingDeDigivolveOne from "./keyword-pacing-de-digivolve-one.fixture.js";
import fixtureKeywordPacingDeDigivolveMany from "./keyword-pacing-de-digivolve-many.fixture.js";
import fixtureKeywordPacingDigiBurstDelete from "./keyword-pacing-digi-burst-delete.fixture.js";
import fixtureKeywordPacingDigiBurstReduce from "./keyword-pacing-digi-burst-reduce.fixture.js";
import fixtureKeywordPacingRaidAccept from "./keyword-pacing-raid-accept.fixture.js";
import fixtureKeywordPacingRaidDecline from "./keyword-pacing-raid-decline.fixture.js";
import fixtureKeywordPacingBlitzAccept from "./keyword-pacing-blitz-accept.fixture.js";
import fixtureKeywordPacingBlitzDecline from "./keyword-pacing-blitz-decline.fixture.js";
import fixtureKeywordPacingVortexAccept from "./keyword-pacing-vortex-accept.fixture.js";
import fixtureKeywordPacingVortexDecline from "./keyword-pacing-vortex-decline.fixture.js";
import type { ScenarioFixture } from "../scenario/types.js";
import fixtureKeywordPacingPiercing from "./keyword-pacing-piercing.fixture.js";
import fixtureKeywordPacingJamming from "./keyword-pacing-jamming.fixture.js";
import fixtureKeywordPacingRetaliation from "./keyword-pacing-retaliation.fixture.js";
import fixtureKeywordPacingReboot from "./keyword-pacing-reboot.fixture.js";
import fixtureKeywordPacingDrawOne from "./keyword-pacing-draw-one.fixture.js";
import fixtureKeywordPacingDrawMany from "./keyword-pacing-draw-many.fixture.js";
import fixtureKeywordPacingDrawOpponent from "./keyword-pacing-draw-opponent.fixture.js";
import fixtureKeywordPacingRecoveryOne from "./keyword-pacing-recovery-one.fixture.js";
import fixtureKeywordPacingRecoveryMany from "./keyword-pacing-recovery-many.fixture.js";
import fixtureKeywordPacingRecoveryCondition from "./keyword-pacing-recovery-condition.fixture.js";
import fixtureKeywordPacingRecoveryOpponent from "./keyword-pacing-recovery-opponent.fixture.js";
import fixtureKeywordPacingRush from "./keyword-pacing-rush.fixture.js";
import fixtureKeywordPacingSecurityAttackInherited from "./keyword-pacing-security-attack-inherited.fixture.js";
import fixtureKeywordPacingSecurityAttackAccumulated from "./keyword-pacing-security-attack-accumulated.fixture.js";
import type { Keyword } from "@aegis/shared";

interface KeywordPacingBoard {
  fixture: ScenarioFixture;
  id: `keyword-pacing-${string}`;
  keyword: Keyword;
  attackerCardId: string;
  defenderCardId: string | undefined;
  securityCardId: string;
  target: "permanent" | "player";
  attackerRemains: boolean;
  defenderRemains: boolean;
  securityRemoved: number;
  ownSecurityRemoved?: number;
  allies?: readonly string[];
  decision?: { kind: "Alliance" | "Barrier"; accept: boolean };
}

/** Printed-card boards for real server actions; outcomes are measured, never scripted. */
export const KEYWORD_PACING_SCENARIOS = [
  {
    id: "keyword-pacing-piercing",
    fixture: fixtureKeywordPacingPiercing,
    keyword: "Piercing",
    attackerCardId: "BT1-026",
    defenderCardId: "BT1-009",
    securityCardId: "BT1-010",
    target: "permanent",
    attackerRemains: true,
    defenderRemains: false,
    securityRemoved: 1,
  },
  {
    id: "keyword-pacing-jamming",
    fixture: fixtureKeywordPacingJamming,
    keyword: "Jamming",
    attackerCardId: "ST19-07",
    defenderCardId: undefined,
    securityCardId: "BT1-081",
    target: "player",
    attackerRemains: true,
    defenderRemains: false,
    securityRemoved: 1,
  },
  {
    id: "keyword-pacing-retaliation",
    fixture: fixtureKeywordPacingRetaliation,
    keyword: "Retaliation",
    attackerCardId: "BT19-059",
    defenderCardId: "BT1-025",
    securityCardId: "BT1-010",
    target: "permanent",
    attackerRemains: false,
    defenderRemains: false,
    securityRemoved: 0,
  },
  ...([true, false] as const).map(
    (accept) =>
      ({
        id: accept ? "keyword-pacing-alliance-accept" : "keyword-pacing-alliance-decline",
        fixture: accept ? fixtureKeywordPacingAllianceAccept : fixtureKeywordPacingAllianceDecline,
        keyword: "Alliance",
        attackerCardId: "AD1-009",
        defenderCardId: undefined,
        securityCardId: "BT1-010",
        target: "player",
        attackerRemains: true,
        defenderRemains: false,
        securityRemoved: accept ? 2 : 1,
        allies: ["BT1-009", "BT1-010"],
        decision: { kind: "Alliance", accept },
      }) as const,
  ),
  ...([true, false] as const).map(
    (accept) =>
      ({
        id: accept ? "keyword-pacing-barrier-accept" : "keyword-pacing-barrier-decline",
        fixture: accept ? fixtureKeywordPacingBarrierAccept : fixtureKeywordPacingBarrierDecline,
        keyword: "Barrier",
        attackerCardId: "BT13-041",
        defenderCardId: "BT1-025",
        securityCardId: "BT1-010",
        target: "permanent",
        attackerRemains: accept,
        defenderRemains: true,
        securityRemoved: 0,
        ownSecurityRemoved: accept ? 1 : 0,
        decision: { kind: "Barrier", accept },
      }) as const,
  ),
] as const satisfies readonly KeywordPacingBoard[];

/** Defensive and turn-transition cases use public actions on both sides of the field. */
export const KEYWORD_TURN_PACING_SCENARIOS = [
  ...([true, false] as const).map(
    (accept) =>
      ({
        id: accept ? "keyword-pacing-blocker-accept" : "keyword-pacing-blocker-decline",
        fixture: accept ? fixtureKeywordPacingBlockerAccept : fixtureKeywordPacingBlockerDecline,
        keyword: "Blocker",
        flow: "block",
        blockerCardId: "ST18-07",
        attackerCardId: "ST1-10",
        securityCardId: "BT1-010",
        accept,
      }) as const,
  ),
  {
    id: "keyword-pacing-reboot",
    fixture: fixtureKeywordPacingReboot,
    keyword: "Reboot",
    flow: "reboot",
    holderCardIds: ["BT4-070", "BT5-069"],
    controlCardId: "BT1-009",
    defenderCardId: "BT1-010",
  },
] as const;

/** Optional protection keeps a real permanent, or exposes its departure and stack cost. */
export const KEYWORD_PROTECTION_PACING_SCENARIOS = [
  ...([true, false] as const).map(
    (accept) =>
      ({
        id: accept ? "keyword-pacing-evade-accept" : "keyword-pacing-evade-decline",
        fixture: accept ? fixtureKeywordPacingEvadeAccept : fixtureKeywordPacingEvadeDecline,
        keyword: "Evade",
        flow: "evade",
        attackerCardId: "BT1-020",
        holderCardIds: ["BT14-021"],
        securityCardId: "ST6-15",
        accept,
      }) as const,
  ),
  ...([true, false] as const).map(
    (accept) =>
      ({
        id: accept ? "keyword-pacing-armor-purge-accept" : "keyword-pacing-armor-purge-decline",
        fixture: accept ? fixtureKeywordPacingArmorPurgeAccept : fixtureKeywordPacingArmorPurgeDecline,
        keyword: "Armor Purge",
        flow: "armor-purge",
        holderCardIds: ["BT1-009", "BT8-012"],
        defenderCardId: "ST1-10",
        accept,
      }) as const,
  ),
] as const;

/** Stack costs and level reduction are measured one physical card at a time. */
export const KEYWORD_STACK_PACING_SCENARIOS = [
  ...([1, 4] as const).map(
    (amount) =>
      ({
        id: amount === 1 ? "keyword-pacing-de-digivolve-one" : "keyword-pacing-de-digivolve-many",
        fixture: amount === 1 ? fixtureKeywordPacingDeDigivolveOne : fixtureKeywordPacingDeDigivolveMany,
        keyword: "DeDigivolve",
        flow: "de-digivolve",
        optionCardId: amount === 1 ? "BT2-105" : "BT2-106",
        supportCardId: "BT4-070",
        targetCardIds: ["BT1-001", "BT1-009", "ST1-07", "ST1-08", "ST1-10"],
        removedCount: amount === 1 ? 1 : 3,
        expectedTopCardId: amount === 1 ? "ST1-08" : "BT1-009",
      }) as const,
  ),
  ...([false, true] as const).map(
    (deletesTarget) =>
      ({
        id: deletesTarget ? "keyword-pacing-digi-burst-delete" : "keyword-pacing-digi-burst-reduce",
        fixture: deletesTarget ? fixtureKeywordPacingDigiBurstDelete : fixtureKeywordPacingDigiBurstReduce,
        keyword: "DigiBurst",
        flow: "digi-burst",
        holderCardIds: ["BT1-006", "ST3-02", "BT1-051", "BT4-046"],
        targetCardId: deletesTarget ? "ST1-04" : "ST1-10",
        deletesTarget,
      }) as const,
  ),
] as const;

export type KeywordStackPacingScenario = (typeof KEYWORD_STACK_PACING_SCENARIOS)[number];

/** Actual On Play draws/recovery; deck identities stay private to their owner. */
export const KEYWORD_DECK_PACING_SCENARIOS = [
  {
    id: "keyword-pacing-draw-one",
    fixture: fixtureKeywordPacingDrawOne,
    keyword: "Draw",
    flow: "draw",
    sourceSeat: 0,
    sourceCardId: "BT1-029",
    amount: 1,
    initialSecurity: 1,
  },
  {
    id: "keyword-pacing-draw-many",
    fixture: fixtureKeywordPacingDrawMany,
    keyword: "Draw",
    flow: "draw",
    sourceSeat: 0,
    sourceCardId: "BT1-041",
    amount: 2,
    initialSecurity: 1,
  },
  {
    id: "keyword-pacing-draw-opponent",
    fixture: fixtureKeywordPacingDrawOpponent,
    keyword: "Draw",
    flow: "draw",
    sourceSeat: 1,
    sourceCardId: "BT1-041",
    amount: 2,
    initialSecurity: 1,
  },
  {
    id: "keyword-pacing-recovery-one",
    fixture: fixtureKeywordPacingRecoveryOne,
    keyword: "Recovery",
    flow: "recovery",
    sourceSeat: 0,
    sourceCardId: "BT1-060",
    amount: 1,
    initialSecurity: 1,
  },
  {
    id: "keyword-pacing-recovery-many",
    fixture: fixtureKeywordPacingRecoveryMany,
    keyword: "Recovery",
    flow: "recovery",
    sourceSeat: 0,
    sourceCardId: "BT2-039",
    amount: 2,
    initialSecurity: 1,
  },
  {
    id: "keyword-pacing-recovery-condition",
    fixture: fixtureKeywordPacingRecoveryCondition,
    keyword: "Recovery",
    flow: "recovery",
    sourceSeat: 0,
    sourceCardId: "BT2-039",
    amount: 0,
    initialSecurity: 4,
  },
  {
    id: "keyword-pacing-recovery-opponent",
    fixture: fixtureKeywordPacingRecoveryOpponent,
    keyword: "Recovery",
    flow: "recovery",
    sourceSeat: 1,
    sourceCardId: "BT1-060",
    amount: 1,
    initialSecurity: 1,
  },
] as const;
/** Printed attack permissions, tied Raid targets and inherited/accumulated checks. */
export const KEYWORD_ATTACK_PACING_SCENARIOS = [
  {
    id: "keyword-pacing-rush",
    fixture: fixtureKeywordPacingRush,
    keyword: "Rush",
    flow: "rush",
    attackerCardIds: ["BT4-038"],
    controlCardId: "BT1-009",
    securityRemoved: 1,
  },
  ...([true, false] as const).map(
    (accept) =>
      ({
        id: accept ? "keyword-pacing-raid-accept" : "keyword-pacing-raid-decline",
        fixture: accept ? fixtureKeywordPacingRaidAccept : fixtureKeywordPacingRaidDecline,
        keyword: "Raid",
        flow: "raid",
        attackerCardIds: ["BT24-011"],
        defenderCardIds: ["BT1-009", "BT1-009", "BT1-010"],
        accept,
        securityRemoved: accept ? 0 : 1,
      }) as const,
  ),
  {
    id: "keyword-pacing-security-attack-inherited",
    fixture: fixtureKeywordPacingSecurityAttackInherited,
    keyword: "SecurityAttack",
    flow: "security-attack",
    attackerCardIds: ["BT1-009", "ST1-07", "ST1-09", "ST1-10"],
    securityRemoved: 2,
  },
  {
    id: "keyword-pacing-security-attack-accumulated",
    fixture: fixtureKeywordPacingSecurityAttackAccumulated,
    keyword: "SecurityAttack",
    flow: "security-attack",
    attackerCardIds: ["BT1-001", "BT1-009", "ST1-06", "ST1-09", "ST1-11"],
    securityRemoved: 3,
  },
] as const;
export type KeywordAttackPacingScenario = (typeof KEYWORD_ATTACK_PACING_SCENARIOS)[number];

/** End-of-turn attacks retain their actual evolution/play and optional declaration. */
export const KEYWORD_END_ATTACK_PACING_SCENARIOS = [
  ...([true, false] as const).map(
    (accept) =>
      ({
        id: accept ? "keyword-pacing-blitz-accept" : "keyword-pacing-blitz-decline",
        fixture: accept ? fixtureKeywordPacingBlitzAccept : fixtureKeywordPacingBlitzDecline,
        keyword: "Blitz",
        flow: "blitz",
        attackerCardIds: ["ST1-10"],
        sourceCardId: "BT5-086",
        accept,
        securityRemoved: accept ? 1 : 0,
      }) as const,
  ),
  ...([true, false] as const).map(
    (accept) =>
      ({
        id: accept ? "keyword-pacing-vortex-accept" : "keyword-pacing-vortex-decline",
        fixture: accept ? fixtureKeywordPacingVortexAccept : fixtureKeywordPacingVortexDecline,
        keyword: "Vortex",
        flow: "vortex",
        attackerCardIds: [],
        sourceCardId: "EX7-034",
        defenderCardIds: ["BT1-009", "BT1-009", "BT1-010"],
        accept,
        securityRemoved: 0,
      }) as const,
  ),
] as const;
export type KeywordEndAttackPacingScenario = (typeof KEYWORD_END_ATTACK_PACING_SCENARIOS)[number];
export type KeywordDeckPacingScenario = (typeof KEYWORD_DECK_PACING_SCENARIOS)[number];
export type KeywordProtectionPacingScenario = (typeof KEYWORD_PROTECTION_PACING_SCENARIOS)[number];
export type KeywordTurnPacingScenario = (typeof KEYWORD_TURN_PACING_SCENARIOS)[number];
export type KeywordPacingScenarioId =
  | (typeof KEYWORD_PACING_SCENARIOS)[number]["id"]
  | KeywordTurnPacingScenario["id"]
  | KeywordProtectionPacingScenario["id"]
  | KeywordStackPacingScenario["id"]
  | KeywordDeckPacingScenario["id"]
  | KeywordAttackPacingScenario["id"]
  | KeywordEndAttackPacingScenario["id"];
export type KeywordPacingScenario = KeywordPacingBoard & { id: (typeof KEYWORD_PACING_SCENARIOS)[number]["id"] };
