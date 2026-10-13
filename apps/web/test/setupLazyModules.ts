import { loadFamousDecks } from "../src/game/loadFamousDecks";
import { loadDictionary } from "../src/i18n/loadDictionary";
import { LOCALES } from "../src/i18n/locales";

await Promise.all([...LOCALES.map(loadDictionary), loadFamousDecks()]);
