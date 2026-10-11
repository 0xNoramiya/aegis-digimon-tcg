// @aegis/shared - the contract layer shared by @aegis/api and @aegis/web.
// Types, card data, the Colyseus state schema, and the wire protocol all live
// here so the server and client are compile-time forced to agree.

export * from "./schema/index.js";
export * from "./cards/index.js";
export * from "./protocol/index.js";
export * from "./effects/index.js";
export * from "./banlist.js";
export * from "./tournaments/index.js";
export * from "./decks/index.js";
export * from "./account/avatars.js";
export * from "./dev/keywordPacing.js";
export * from "./dev/phasePacing.js";

export * from "./matchTimer.js";
export * from "./matchFormat.js";
export * from "./replays.js";
export * from "./deckFormat.js";
export * from "./feedback/FeedbackStatus.js";
export * from "./feedback/isFeedbackStatus.js";
export * from "./feedback/isClosedFeedbackStatus.js";
export * from "./feedback/limits.js";
export * from "./feedback/types.js";
