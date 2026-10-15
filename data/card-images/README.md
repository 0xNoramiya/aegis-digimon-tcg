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

## Official card list gaps, 2026-10-14

A comparison with every product page of Bandai's English card list found 65
printings the upstream set does not list. Their files come from
`https://world.digimoncard.com/images/cardlist/card/<id>.png`, re-encoded as
WebP at the source width of 430 px.

Bandai and upstream number some printings differently. Where Bandai's number
already belongs to another upstream printing of the card, the file takes the
next free number:

| File       | Bandai image | Product                  |
| ---------- | ------------ | ------------------------ |
| BT9-112_P4 | BT9-112_P3   | Special Limited Set      |
| EX1-066_P6 | EX1-066_P4   | BT-21: Limited Card Pack |
| EX5-070_P5 | EX5-070_P3   | Special Event Pack 2025  |

The comparison skipped printings whose image matches another printing of the
same card: the second ST-12 printings of BT3-093, BT3-094, BT4-096, ST1-12,
ST3-12 and ST6-14, and the ST-24 printings of LM-033 to LM-038.

Copyright belongs to Bandai and the credited Digimon rights holders.
