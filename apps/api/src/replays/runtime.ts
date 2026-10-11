import { accountStore } from "../accounts/runtime.js";
import { ReplayLibrary } from "./ReplayLibrary.js";

export const replayLibrary = new ReplayLibrary(accountStore, { apiKey: process.env.AEGIS_GOOGLE_API_KEY?.trim() });
