import { RematchStatus } from "@aegis/shared/protocol/RematchStatus";
import type { SeriesClientMessage } from "@aegis/shared/protocol/series";
import type { GameState } from "@aegis/shared/schema/GameState";
import type { Seat } from "@aegis/shared/schema/enums";
import { turnOrderChooser, type GameResult } from "#api/rooms/series/seriesRules";

type RematchOfferParams = {
  readState: () => GameState;
  startSeries: (chooser: Seat) => boolean;
};

type OpenParams = {
  result: GameResult;
  departed: boolean;
};

export class RematchOffer {
  private firstSeat: Seat = 0;
  private result: GameResult | undefined;

  constructor(private readonly params: RematchOfferParams) {}

  noteFirstSeat(seat: Seat): void {
    this.firstSeat = seat;
  }

  open({ result, departed }: OpenParams): void {
    this.result = result;
    this.setStatus(departed ? RematchStatus.CLOSED.value : RematchStatus.OPEN.value);
  }

  close(): void {
    const status = this.readSeries().rematchStatus;
    if (status === RematchStatus.OPEN.value || status === RematchStatus.OFFERED.value) {
      this.setStatus(RematchStatus.CLOSED.value);
    }
  }

  handleMessage(seat: Seat, payload: unknown): void {
    const message = payload as Partial<SeriesClientMessage> | undefined;
    if (message?.action === "offerRematch") {
      this.offer(seat);
      return;
    }
    if (message?.action === "answerRematch" && typeof message.accept === "boolean") {
      this.answer(seat, message.accept);
    }
  }

  private offer(seat: Seat): void {
    const series = this.readSeries();
    if (series.rematchStatus === RematchStatus.OFFERED.value && series.rematchOfferSeat !== seat) {
      this.accept();
      return;
    }
    if (series.rematchStatus !== RematchStatus.OPEN.value) {
      return;
    }
    series.rematchOfferSeat = seat;
    this.setStatus(RematchStatus.OFFERED.value);
  }

  private answer(seat: Seat, accept: boolean): void {
    const series = this.readSeries();
    if (series.rematchStatus !== RematchStatus.OFFERED.value || series.rematchOfferSeat === seat) {
      return;
    }
    if (accept) {
      this.accept();
      return;
    }
    this.setStatus(RematchStatus.DECLINED.value);
  }

  private accept(): void {
    if (this.result === undefined) {
      return;
    }
    this.setStatus(RematchStatus.ACCEPTED.value);
    if (!this.params.startSeries(turnOrderChooser(this.result, this.firstSeat))) {
      this.setStatus(RematchStatus.CLOSED.value);
    }
  }

  private setStatus(status: RematchStatus): void {
    this.readSeries().rematchStatus = status;
  }

  private readSeries(): GameState["series"] {
    return this.params.readState().series;
  }
}
