# Competitive deck seeds

The development and compiled production seeds share ten exact, attributed 60-card lists from the **2025 World Championships (Masters)**. These are historical Standard lists from that event, not a claim of legality in the current rotation.

## Included lists

| Deck | Player | Place | Source |
| --- | --- | ---: | --- |
| Gardevoir ex | Riley McKay | 1 | [Decklist](https://limitlesstcg.com/decks/list/18916) |
| Dragapult ex / Dusknoir | Justin Newdorf | 2 | [Decklist](https://limitlesstcg.com/decks/list/18917) |
| Raging Bolt ex / Ogerpon | Shizuki Nakagawa | 3 | [Decklist](https://limitlesstcg.com/decks/list/18918) |
| Charizard ex / Pidgeot ex | Junya Tanaka | 4 | [Decklist](https://limitlesstcg.com/decks/list/18919) |
| N’s Zoroark ex | Mateusz Łaszkiewicz | 6 | [Decklist](https://limitlesstcg.com/decks/list/18921) |
| Gholdengo ex | Piper Lepine | 7 | [Decklist](https://limitlesstcg.com/decks/list/18922) |
| Noctowl / Ogerpon | Alex Schemanske | 31 | [Decklist](https://limitlesstcg.com/decks/list/18945) |
| Ethan’s Ho-Oh ex | Nathan Spry | 32 | [Decklist](https://limitlesstcg.com/decks/list/18946) |
| Marnie’s Grimmsnarl ex | Aaron Curry | 41 | [Decklist](https://limitlesstcg.com/decks/list/18955) |
| Joltik Box | Chunhchih Chen | 50 | [Decklist](https://limitlesstcg.com/decks/list/18963) |

## Exact catalog mapping

`data/competitive-decks.json` retains every source card name, set abbreviation, collector number and quantity. Set abbreviations were matched against `data/en/sets.json`; collector numbers use the catalog’s three-digit form (for example `TWM 95` → `sv06-095`, `SVE 5` → `sve-005`). All **133 distinct prints** were checked against both their `tcgDexId` and English names in the connected catalog. No reprints, name-based guesses, or substitutions were needed.

At runtime, the seed resolves `(game = POKEMON, tcgDexId)` to the environment’s own `card.id` UUID. A missing print aborts the entire batch with an explicit per-deck diagnostic. No shortened decks are created. Cover cards are explicitly selected from each list. All cards use the main-deck role.

Source attribution is stored with the checked-in presets; seeded deck names include the player and Worlds 2025. The deck entity does not currently expose source metadata.

## Run without resetting application data

Run from the repository root, with the API database environment configured as usual:

```bash
# Development: verify against the configured catalog without writing anything.
npm run seed:decks --workspace api -- --check

# Development: insert the complete decks.
npm run seed:decks --workspace api

# Compiled production: build once, then verify and insert.
npm run build --workspace api
npm run seed:decks:prod --workspace api -- --check
npm run seed:decks:prod --workspace api
```

The owner is the existing administrator with the smallest ID. To choose a different existing account, set `SEED_DECK_OWNER_ID` on the command. A missing administrator or invalid explicit owner fails clearly; the seed never creates a login or chooses an arbitrary user.

The dedicated commands do not start the Nest application, run schedulers, import the catalog, synchronize the schema, run migrations, or truncate tables. `--check` uses a PostgreSQL read-only transaction. Database environment and TLS options come from the existing CLI data source.

The regular `seed` / `seed:prod` flow also calls this same implementation after catalog import. Those **full-dataset commands retain their existing reset/demo behavior**; use the dedicated commands above to add just the decks to an existing environment. The demo persona Maxime receives copies of the first five reference lists instead of randomly assembled cards.

## Re-runs and failures

The entire batch is transactional. A PostgreSQL transaction advisory lock serializes simultaneous seed runs. Existing decks matching the selected owner and exact seeded name are skipped, preserving user edits, visibility, card rows and dates. Old demo decks and previous presets already in a database are not deleted. To seed the same lists for another account, explicitly select that owner.

Nest copies the JSON preset asset into `dist/seed/data` so the compiled command does not depend on source files.

## Verification

```bash
npm run check-types --workspace api
NODE_ENV=test npm run test --workspace api -- --runInBand seed/competitive-decks.spec.ts seed/seed.service.spec.ts
TCG_E2E_PROJECT_NAME=tcg-nexus-deck-seed-e2e E2E_DATABASE_PORT=55439 bash scripts/run-e2e-postgres.sh competitive-deck-seed.e2e-spec.ts
```

The PostgreSQL suite runs against a disposable database and verifies exact quantities and UUID mapping, read-only checks, missing-print rejection, rollback on card insertion failure, concurrent re-runs, ownership, and preservation of existing edits.
