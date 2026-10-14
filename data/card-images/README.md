# Local card scans

These WebP files cover printings that no image origin of
`tools/deploy/card-images.mjs` publishes. Most are official "SAMPLE" scans, so
they carry the watermark. The first batch was downloaded on 2026-09-29,
re-encoded as WebP, and scaled to at most 430 px wide.

The sync copies each file into the gateway mirror as `<id>-Sample.webp` on every
deploy and in the daily cron job. The client already tries that name after
`<id>.webp`. Once an origin publishes the real image, the sync stores it and
deletes the sample. Delete the file here then.

| Files                                                                                                                                                           | Source                                                                                    |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| BT11-023_P1, BT17-059_P1, BT20-014_P1, BT21-009_P2, BT22-004_P1, BT22-063_P2, BT22-099_P1, BT5-090_P2                                                           | Bandai's English card list, `https://world.digimoncard.com/images/cardlist/card/<id>.png` |
| P-147 (the wiki's P-147_P1 scan), BT21-005_P1, BT21-018_P2, BT21-023_P2, BT24-011_P2, BT24-059_P2, BT25-041_P2, BT25-053_P2, EX8-055_P2 (the wiki's EX8-055_P3) | DigimonCardGame Wiki, `https://static.wikia.nocookie.net/digimoncardgame/images/`         |
| LM-063 to LM-068, ST24-11_P2, ST24-11_P3                                                                                                                        | `https://images.digimoncard.io/images/cards/`                                             |

Copyright belongs to Bandai and the credited Digimon rights holders.
