---
name: enums
description: Define and consume Aegis domain enums, derive validation and UI options from one definition, and preserve existing wire, database, replay, and engine values.
---

# Enum conventions

Reference a domain's named enum entry instead of repeating its serialized literal in
application logic. Keep the definition with the domain; put it in `packages/shared`
only when both runtimes need it. Use PascalCase filenames matching the enum name.

## New domain enums

For a domain that needs metadata, define a typed `as const` object with
SCREAMING_SNAKE_CASE keys. Each entry exposes `name` for the key and `value` for the
serialized value. Aegis owns the definition and needs no external enum factory.

```typescript
export const FeedbackStatus = {
  NEW: { name: "NEW", value: "new", isClosed: false },
  RESOLVED: { name: "RESOLVED", value: "resolved", isClosed: true },
} as const;

export type FeedbackStatus = (typeof FeedbackStatus)[keyof typeof FeedbackStatus]["value"];
```

Use `.value` in comparisons, persistence, and intents; `.name` identifies the entry,
not a replacement storage format. Derive allowed values, ordering, options, and
subsets from entries. Put capability flags such as `isClosed` on the entry rather
than duplicating status lists across the server and client. Keep localized labels
in the existing translation system.

Export each validation or lookup helper from its own file. Import the enum and
helpers directly through aliases; do not create an `index` barrel. Validate unknown values
at the boundary before indexing metadata. Guards must refuse non-string values and
unknown strings, including object-property names such as `constructor`.

## Existing engine enums and compatibility

Use native enums already present in `packages/shared/src/schema/enums.ts` directly,
such as `Phase.Main` or `Zone.Hand`. Do not wrap them in `.name`/`.value` objects.
Numeric ordinals and declaration order are compatibility contracts; never reorder
or renumber them during a style change.

Preserve all existing wire, database, catalog, and replay values. Introducing an enum
does not authorize renaming persisted values. Literal values remain appropriate
inside the enum definition, released SQL migrations, external protocol fixtures,
and tests that independently assert serialization compatibility. Do not convert
arbitrary strings such as card IDs, free text, or translation keys into enums.

When migrating a domain, update its production consumers together and run behavior
tests for persistence, validation, and presentation. Rebuild shared contracts before
API/web tests.
