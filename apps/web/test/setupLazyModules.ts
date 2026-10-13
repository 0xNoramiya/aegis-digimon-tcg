import { loadCardData } from "../src/cardData/loadCardData";
import { loadFamousDecks } from "../src/game/loadFamousDecks";
import { loadDictionary } from "../src/i18n/loadDictionary";
import { LOCALES } from "../src/i18n/locales";

await Promise.all([loadCardData(), ...LOCALES.map(loadDictionary), loadFamousDecks()]);
