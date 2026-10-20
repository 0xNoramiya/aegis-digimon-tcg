import { ManualCombatStage } from "@aegis/shared/manual/ManualCombatStage";
import { ArraySchema } from "@colyseus/schema";
import { tokenDefinitions } from "@aegis/shared/cards/tokens";
import { getManualPermanentCards } from "@aegis/shared/manual/getManualPermanentCards";
import { ManualAction } from "@aegis/shared/manual/ManualAction";
import { getCardDefinition } from "@aegis/shared/cards/registry";
import { CardInstance } from "@aegis/shared/schema/CardInstance";
import type { GameState } from "@aegis/shared/schema/GameState";
import { Permanent } from "@aegis/shared/schema/Permanent";
import type { PlayerState } from "@aegis/shared/schema/PlayerState";
import { Phase, Zone, type Seat } from "@aegis/shared/schema/enums";
import type { IntentResult } from "@aegis/shared/protocol/intents";
import type { ServerEvent } from "@aegis/shared/protocol/events";
import type { ManualCommand, ManualDestination, ManualLocation } from "@aegis/shared/manual/ManualCommand";
import { parseManualIntent } from "@aegis/shared/manual/parseManualIntent";
import {
  extractCardAt,
  extractLinkedById,
  extractPermanentAt,
  fillZone,
  findPermanentInPlayer,
  insertCard,
  linkCard,
  placePermanent,
  popFromStack,
  pushOnStack,
  removeFromStackAt,
  replaceStack,
  setBreeding,
  setTopCard,
  unshiftOnStack,
  type CardZone,
} from "#api/engine/state/access";
import { makeRng, seatSeed, shuffleInPlace } from "#api/engine/setup";
import { captureManualCheckpoint, type ManualCheckpoint } from "#api/manual/captureManualCheckpoint";
import { restoreManualCheckpoint } from "#api/manual/restoreManualCheckpoint";

type Params = { state: GameState; seed: number; randomKey?: string; emit: (event: ServerEvent) => void };
type Source = { card: CardInstance; permanent?: Permanent; index: number; zone: Zone; part?: ManualLocation["part"] };
type Inspection = { zone: Zone; cards: CardInstance[] };

class ManualCommandError extends Error {}

export class ManualController {
  private checkpoint?: ManualCheckpoint;
  private readonly requests = new Map<string, IntentResult>();
  private readonly inspections = new Map<Seat, Inspection>();
  private permanentSequence = 0;

  constructor(private readonly params: Params) {}

  begin(): void {
    const { state, emit } = this.params;
    state.phase = Phase.Main;
    state.turnCount = 1;
    emit({ kind: "phaseChanged", phase: state.phase, turnSeat: state.turnSeat, turnCount: state.turnCount });
  }

  apply(seat: Seat, value: unknown): IntentResult {
    const intent = parseManualIntent(value);
    const { state } = this.params;
    if (!intent || !state.players[seat]) {
      return { ok: false, reason: "illegal-target" };
    }
    const key = `${seat}:${intent.requestId}`;
    const previous = this.requests.get(key);
    if (previous) {
      return previous;
    }
    if (intent.revision !== state.manual.revision || state.gameOver || state.phase !== Phase.Main) {
      return { ok: false, reason: "wrong-phase" };
    }
    try {
      const execute = this.prepareCommand(seat, intent.command);
      const checkpoint = captureManualCheckpoint({ state });
      const description = execute();
      if (
        intent.command.action !== ManualAction.REQUEST_UNDO.value &&
        intent.command.action !== ManualAction.ANSWER_UNDO.value &&
        intent.command.action !== ManualAction.PROPOSE_RESULT.value &&
        intent.command.action !== ManualAction.ANSWER_RESULT.value
      ) {
        this.checkpoint = checkpoint;
        state.manual.canUndo = true;
      }
      state.manual.revision += 1;
      state.manual.history.push(`${state.manual.revision}|${seat}|${description}`);
      if (state.manual.history.length > 200) {
        state.manual.history.shift();
      }
      this.refreshInspections();
      this.params.emit({ kind: "manualAction", seat, action: description });
      const result = { ok: true } as const;
      this.requests.set(key, result);
      if (this.requests.size > 512) {
        this.requests.delete(this.requests.keys().next().value!);
      }
      return result;
    } catch (error) {
      if (!(error instanceof ManualCommandError)) {
        throw error;
      }
      return { ok: false, reason: "illegal-target" };
    }
  }

  private require(condition: unknown): asserts condition {
    if (!condition) {
      throw new ManualCommandError("Invalid manual operation");
    }
  }

  private getPermanent(player: PlayerState, id: string): Permanent {
    const permanent = findPermanentInPlayer(player, id);
    this.require(permanent);
    return permanent;
  }

  private getZone(player: PlayerState, zone: Zone): readonly CardInstance[] {
    switch (zone) {
      case Zone.Deck:
        return player.deck;
      case Zone.EggDeck:
        return player.eggDeck;
      case Zone.Hand:
        return player.hand;
      case Zone.Security:
        return player.security;
      case Zone.Trash:
        return player.trash;
      case Zone.Delay:
        return player.delayZone;
      default:
        throw new ManualCommandError("Not a loose zone");
    }
  }

  private getSource(player: PlayerState, location: ManualLocation): Source {
    if (location.zone === Zone.BattleArea || location.zone === Zone.Breeding) {
      this.require(location.permanentId);
      const permanent = this.getPermanent(player, location.permanentId);
      this.require(permanent.inBreeding === (location.zone === Zone.Breeding));
      const part = location.part ?? "top";
      const cards = getManualPermanentCards({ permanent, part });
      const index = location.instanceId
        ? cards.findIndex((card) => card.instanceId === location.instanceId)
        : (location.index ?? 0);
      const card = cards[index];
      this.require(card);
      return { card, permanent, part, index, zone: location.zone };
    }
    const cards = this.getZone(player, location.zone);
    const index = location.instanceId
      ? cards.findIndex((card) => card.instanceId === location.instanceId)
      : (location.index ?? 0);
    const card = cards[index];
    this.require(card);
    if (
      location.instanceId &&
      (location.zone === Zone.Deck || location.zone === Zone.EggDeck || location.zone === Zone.Security)
    ) {
      this.require(
        this.inspections.get(player.seat)?.cards.includes(card) || (location.zone === Zone.Security && card.faceUp),
      );
    }
    return { card, index, zone: location.zone };
  }

  private removePermanent(player: PlayerState, permanent: Permanent): void {
    if (permanent.inBreeding) {
      setBreeding(player, undefined);
    } else {
      extractPermanentAt(player, player.battleArea.indexOf(permanent));
    }
  }

  private takeSource(player: PlayerState, source: Source): CardInstance {
    const { permanent, card } = source;
    if (!permanent) {
      extractCardAt(player, source.zone as CardZone, source.index);
    } else if (source.part === "source") {
      removeFromStackAt(permanent, source.index);
    } else if (source.part === "link") {
      extractLinkedById(permanent, card.instanceId);
    } else {
      const next = popFromStack(permanent);
      if (next) {
        setTopCard(permanent, next);
        this.setPrintedDp(permanent);
      } else {
        this.removePermanent(player, permanent);
      }
    }
    return card;
  }

  private setPrintedDp(permanent: Permanent): void {
    const dp = getCardDefinition(permanent.topCard.cardId)?.dp ?? 0;
    permanent.baseDP = dp;
    permanent.currentDP = dp;
  }

  private addCard(player: PlayerState, card: CardInstance, destination: ManualDestination, target?: Permanent): void {
    if (target) {
      card.faceUp = true;
      if (destination.part === "source") {
        if (destination.position === "bottom") {
          unshiftOnStack(target, card);
        } else {
          pushOnStack(target, card);
        }
      } else if (destination.part === "link") {
        linkCard(target, card, destination.position);
      } else {
        pushOnStack(target, target.topCard);
        setTopCard(target, card);
        this.setPrintedDp(target);
      }
      return;
    }
    if (destination.zone === Zone.BattleArea || destination.zone === Zone.Breeding) {
      const permanent = new Permanent();
      this.permanentSequence += 1;
      permanent.permanentId = `manual-${this.permanentSequence}`;
      permanent.controllerSeat = player.seat;
      permanent.inBreeding = destination.zone === Zone.Breeding;
      card.faceUp = true;
      setTopCard(permanent, card);
      this.setPrintedDp(permanent);
      if (permanent.inBreeding) {
        setBreeding(player, permanent);
      } else {
        placePermanent(player, permanent);
      }
      return;
    }
    card.faceUp = destination.zone === Zone.Trash || destination.zone === Zone.Delay;
    insertCard(player, destination.zone as CardZone, card, destination.position);
  }

  private prepareMove(
    player: PlayerState,
    command: Extract<ManualCommand, { action: typeof ManualAction.MOVE.value }>,
  ): () => string {
    const source = this.getSource(player, command.from);
    const destination = command.to;
    const target = destination.permanentId ? this.getPermanent(player, destination.permanentId) : undefined;
    const field = destination.zone === Zone.BattleArea || destination.zone === Zone.Breeding;
    if (target) {
      this.require(field && target !== source.permanent && target.inBreeding === (destination.zone === Zone.Breeding));
    } else if (field) {
      this.require(!destination.part || destination.part === "top");
      this.require(
        destination.zone !== Zone.Breeding ||
          !player.breeding ||
          (command.wholePile && source.permanent === player.breeding),
      );
    } else {
      this.getZone(player, destination.zone);
      this.require(!destination.part);
    }
    if (command.wholePile) {
      this.require(source.permanent && source.part === "top");
      this.require(!target || destination.part !== "link");
    } else if (source.permanent && source.part === "top" && source.permanent.stack.length === 0) {
      this.require(source.permanent.linked.length === 0);
    }
    return () => {
      const permanent = source.permanent;
      if (command.wholePile && permanent) {
        this.removePermanent(player, permanent);
        if (field && !target) {
          permanent.inBreeding = destination.zone === Zone.Breeding;
          if (permanent.inBreeding) {
            setBreeding(player, permanent);
          } else {
            placePermanent(player, permanent);
          }
        } else if (target) {
          const incoming = [...permanent.stack, permanent.topCard];
          const existing = [...target.stack];
          if (destination.part === "source") {
            const combined =
              destination.position === "bottom" ? [...incoming, ...existing] : [...existing, ...incoming];
            replaceStack(target, combined);
          } else {
            replaceStack(target, [...existing, target.topCard, ...permanent.stack]);
            setTopCard(target, permanent.topCard);
            this.setPrintedDp(target);
          }
          for (const card of permanent.linked) {
            linkCard(target, card, "bottom");
          }
        } else {
          const cards = [permanent.topCard, ...Array.from(permanent.stack).reverse(), ...permanent.linked];
          if (destination.position === "top") {
            cards.reverse();
          }
          for (const card of cards) {
            this.addCard(player, card, destination);
          }
        }
      } else {
        this.addCard(player, this.takeSource(player, source), destination, target);
      }
      return `move ${command.from.zone} → ${destination.zone}${command.wholePile ? " (pile)" : ""}`;
    };
  }

  private prepareCommand(seat: Seat, command: ManualCommand): () => string {
    const { state } = this.params;
    const table = state.manual;
    const player = state.players[seat]!;
    if (table.undoRequester !== -1) {
      this.require(command.action === ManualAction.ANSWER_UNDO.value);
    }
    if (table.resultRequester !== -1) {
      this.require(command.action === ManualAction.ANSWER_RESULT.value);
    }
    switch (command.action) {
      case ManualAction.MOVE.value:
        return this.prepareMove(player, command);
      case ManualAction.DRAW.value: {
        this.require(player.deck.length >= command.count);
        return () => {
          for (let i = 0; i < command.count; i += 1) {
            const card = extractCardAt(player, Zone.Deck, 0)!;
            card.faceUp = false;
            insertCard(player, Zone.Hand, card);
          }
          return `draw ${command.count}`;
        };
      }
      case ManualAction.SHUFFLE.value: {
        const cards = Array.from(this.getZone(player, command.zone));
        return () => {
          const rng = makeRng(seatSeed(this.params.seed ^ table.revision, seat), this.params.randomKey);
          shuffleInPlace(cards, rng);
          for (const card of cards) {
            card.faceUp = false;
          }
          fillZone(player, command.zone, cards);
          this.inspections.delete(seat);
          this.clearReveals(seat);
          return `shuffle ${command.zone}`;
        };
      }
      case ManualAction.INSPECT.value: {
        const cards = Array.from(this.getZone(player, command.zone)).slice(0, command.count);
        this.require(cards.length > 0);
        return () => {
          this.inspections.set(seat, { zone: command.zone, cards });
          return `inspect ${cards.length} ${command.zone}`;
        };
      }
      case ManualAction.CLOSE_INSPECTION.value:
        return () => {
          this.inspections.delete(seat);
          return "close inspection";
        };
      case ManualAction.REVEAL.value: {
        const source = this.getSource(player, command.from);
        const count = command.count ?? 1;
        const cards = source.permanent
          ? getManualPermanentCards({ permanent: source.permanent, part: source.part ?? "top" })
          : this.getZone(player, source.zone);
        this.require(source.index + count <= cards.length);
        const revealed = Array.from(cards).slice(source.index, source.index + count);
        return () => {
          const gallery = JSON.parse(table.revealedJson) as {
            cardId: string;
            artId: string;
            seat: Seat;
            instanceId?: string;
          }[];
          for (const card of revealed) {
            if (source.zone === Zone.Security || source.zone === Zone.Delay) {
              card.faceUp = true;
            }
            if (!gallery.some((entry) => entry.seat === seat && entry.instanceId === card.instanceId)) {
              gallery.push({ cardId: card.cardId, artId: card.artId, seat, instanceId: card.instanceId });
            }
          }
          table.revealedJson = JSON.stringify(gallery.slice(-220));
          return `reveal ${revealed.length} (${source.zone})`;
        };
      }
      case ManualAction.CLEAR_REVEALS.value:
        return () => {
          this.clearReveals(seat);
          return "clear reveals";
        };
      case ManualAction.FLIP.value: {
        this.require([Zone.Security, Zone.Delay, Zone.BattleArea, Zone.Breeding].includes(command.from.zone));
        const source = this.getSource(player, command.from);
        return () => {
          source.card.faceUp = command.faceUp;
          return command.faceUp ? "turn face up" : "turn face down";
        };
      }
      case ManualAction.MODIFIERS.value: {
        const permanent = this.getPermanent(player, command.permanentId);
        return () => {
          permanent.securityAttackModifier = command.securityAttackModifier;
          permanent.securityAttack = Math.max(0, 1 + command.securityAttackModifier);
          permanent.keywords = new ArraySchema(...command.keywords);
          permanent.grantedKeywords = new ArraySchema(...command.keywords);
          permanent.originalColorsOverride = new ArraySchema(...command.colors);
          return "set modifiers";
        };
      }
      case ManualAction.CREATE_TOKEN.value: {
        const definition = tokenDefinitions.find(
          (candidate) => candidate.cardId === command.cardId && candidate.isToken,
        );
        this.require(definition);
        return () => {
          const card = new CardInstance();
          card.instanceId = `manual-token-${seat}-${table.revision + 1}`;
          card.cardId = definition.cardId;
          card.ownerSeat = seat;
          this.addCard(player, card, { zone: Zone.BattleArea });
          return `create token ${definition.cardId}`;
        };
      }
      case ManualAction.REMOVE_TOKEN.value: {
        const permanent = this.getPermanent(player, command.permanentId);
        this.require(
          tokenDefinitions.some((definition) => definition.cardId === permanent.topCard.cardId && definition.isToken),
        );
        this.require(permanent.stack.length === 0 && permanent.linked.length === 0);
        return () => {
          this.removePermanent(player, permanent);
          return "remove token";
        };
      }
      case ManualAction.PHASE.value:
        this.require(state.turnSeat === seat && table.combatStage === ManualCombatStage.NONE.value);
        return () => {
          table.turnPhase = command.phase;
          return `phase ${command.phase}`;
        };
      case ManualAction.COMBAT.value: {
        this.require(table.combatStage !== ManualCombatStage.NONE.value);
        const stages = Object.values(ManualCombatStage).map((entry) => entry.value);
        const next = stages[stages.indexOf(table.combatStage) + 1];
        this.require(command.stage === ManualCombatStage.NONE.value || command.stage === next);
        const defensive =
          table.combatStage === ManualCombatStage.COUNTER.value || table.combatStage === ManualCombatStage.BLOCK.value;
        this.require(
          command.stage === ManualCombatStage.NONE.value ||
            (defensive ? seat !== table.attackerSeat : seat === table.attackerSeat),
        );
        const blocker = command.blockerPermanentId ? this.getPermanent(player, command.blockerPermanentId) : undefined;
        this.require(
          !blocker ||
            (table.combatStage === ManualCombatStage.BLOCK.value &&
              command.stage === ManualCombatStage.RESOLUTION.value &&
              !blocker.inBreeding),
        );
        this.require(
          command.stage !== ManualCombatStage.SECURITY.value ||
            (!table.attackTargetPermanentId && !table.blockerPermanentId),
        );
        return () => {
          table.combatStage = command.stage;
          if (blocker) {
            table.blockerPermanentId = blocker.permanentId;
          }
          if (command.stage === ManualCombatStage.NONE.value) {
            this.clearCombat();
          }
          return `combat ${command.stage}`;
        };
      }
      case ManualAction.REORDER.value: {
        const permanent = this.getPermanent(player, command.permanentId);
        const current = command.part === "source" ? permanent.stack : permanent.linked;
        this.require(
          command.instanceIds.length === current.length && new Set(command.instanceIds).size === current.length,
        );
        const ordered = command.instanceIds.map((id) => current.find((card) => card.instanceId === id));
        this.require(ordered.every((card) => card !== undefined));
        return () => {
          if (command.part === "source") {
            replaceStack(permanent, ordered);
          } else {
            for (const card of Array.from(permanent.linked)) {
              extractLinkedById(permanent, card.instanceId);
            }
            for (const card of ordered) {
              linkCard(permanent, card, "bottom");
            }
          }
          return `reorder ${command.part}`;
        };
      }
      case ManualAction.SUSPEND.value: {
        const permanent = this.getPermanent(player, command.permanentId);
        return () => {
          permanent.isSuspended = command.suspended;
          return command.suspended ? "suspend" : "unsuspend";
        };
      }
      case ManualAction.UNSUSPEND_ALL.value:
        return () => {
          for (const permanent of [...player.battleArea, ...(player.breeding ? [player.breeding] : [])]) {
            permanent.isSuspended = false;
          }
          return "unsuspend all";
        };
      case ManualAction.DP.value: {
        const permanent = this.getPermanent(player, command.permanentId);
        return () => {
          permanent.currentDP = command.value;
          return `DP ${command.value}`;
        };
      }
      case ManualAction.MARKER.value: {
        const permanent = this.getPermanent(player, command.permanentId);
        return () => {
          permanent.manualMarker = command.text;
          return `marker ${command.text}`;
        };
      }
      case ManualAction.MEMORY.value:
        return () => {
          state.memory = command.value;
          return `memory ${command.value}`;
        };
      case ManualAction.PASS.value: {
        this.require(state.turnSeat === seat && table.combatStage === ManualCombatStage.NONE.value);
        return () => {
          state.turnSeat = (1 - seat) as Seat;
          state.turnCount += 1;
          state.memory = -state.memory;
          state.isFirstPlayersFirstTurn = false;
          table.turnPhase = Phase.Active;
          this.params.emit({
            kind: "phaseChanged",
            phase: Phase.Main,
            turnSeat: state.turnSeat,
            turnCount: state.turnCount,
          });
          return "pass turn";
        };
      }
      case ManualAction.ATTACK.value: {
        const permanent = this.getPermanent(player, command.permanentId);
        const opponent = state.players[1 - seat]!;
        this.require(!permanent.inBreeding && table.combatStage === ManualCombatStage.NONE.value);
        this.require(
          !command.targetPermanentId ||
            opponent.battleArea.some((candidate) => candidate.permanentId === command.targetPermanentId),
        );
        return () => {
          table.combatStage = ManualCombatStage.ATTACK.value;
          table.attackerSeat = seat;
          table.attackerPermanentId = permanent.permanentId;
          table.attackTargetPermanentId = command.targetPermanentId ?? "";
          table.blockerPermanentId = "";
          this.params.emit({
            kind: "attackDeclared",
            seat,
            attackerPermanentId: permanent.permanentId,
            attackerCardId: permanent.topCard.cardId,
            target: command.targetPermanentId
              ? { kind: "permanent", permanentId: command.targetPermanentId }
              : { kind: "player" },
          });
          this.params.emit({ kind: "attackEnded", seat, attackerPermanentId: permanent.permanentId });
          return "declare attack";
        };
      }
      case ManualAction.REQUEST_UNDO.value: {
        this.require(this.checkpoint && table.canUndo);
        return () => {
          table.undoRequester = seat;
          return "request undo";
        };
      }
      case ManualAction.ANSWER_UNDO.value: {
        this.require(table.undoRequester !== -1 && table.undoRequester !== seat && this.checkpoint);
        const checkpoint = this.checkpoint;
        return () => {
          if (command.accept) {
            restoreManualCheckpoint({ state, checkpoint });
            this.inspections.clear();
            this.checkpoint = undefined;
            table.canUndo = false;
          }
          table.undoRequester = -1;
          return command.accept ? "accept undo (previously seen information remains known)" : "decline undo";
        };
      }
      case ManualAction.PROPOSE_RESULT.value:
        return () => {
          table.resultRequester = seat;
          table.proposedWinner = command.winnerSeat;
          return `propose result ${command.winnerSeat}`;
        };
      case ManualAction.ANSWER_RESULT.value: {
        this.require(table.resultRequester !== -1 && table.resultRequester !== seat);
        return () => {
          table.resultRequester = -1;
          if (command.accept) {
            state.gameOver = true;
            state.winnerSeat = table.proposedWinner;
            this.params.emit({
              kind: "gameOver",
              reason: "effect",
              result:
                table.proposedWinner === -1
                  ? { outcome: "draw" }
                  : { outcome: "win", winnerSeat: table.proposedWinner as Seat },
            });
          }
          return command.accept ? "accept result" : "decline result";
        };
      }
    }
  }

  private clearReveals(seat: Seat): void {
    const gallery = JSON.parse(this.params.state.manual.revealedJson) as { seat: Seat }[];
    this.params.state.manual.revealedJson = JSON.stringify(gallery.filter((entry) => entry.seat !== seat));
  }

  private clearCombat(): void {
    const table = this.params.state.manual;
    table.combatStage = ManualCombatStage.NONE.value;
    table.attackerSeat = -1;
    table.attackerPermanentId = "";
    table.attackTargetPermanentId = "";
    table.blockerPermanentId = "";
  }

  private refreshInspections(): void {
    for (const player of this.params.state.players) {
      const inspection = this.inspections.get(player.seat);
      if (!inspection) {
        player.manualInspectionJson = "[]";
        continue;
      }
      const current = this.getZone(player, inspection.zone);
      inspection.cards = inspection.cards.filter((card) => current.includes(card));
      player.manualInspectionJson = JSON.stringify(
        inspection.cards.map((card) => ({
          zone: inspection.zone,
          instanceId: card.instanceId,
          cardId: card.cardId,
          artId: card.artId,
        })),
      );
    }
  }
}
