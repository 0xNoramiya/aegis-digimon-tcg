# Coding preferences

- Avoid nested ternary expressions. For multiple branches, use a small named helper with explicit `if` statements. Keep the helper private to its owning module when it has no other callers.
- Define a named `Params` type for an object parameter instead of declaring the object type inline in the function signature. Keep private parameter types beside their owning helper.
- Start every function name with a verb that says what it does, such as `get`, `find`, `build`, `resolve`, `count`, `is`, `has`, or `should`. Write `getForcedAttackCandidateIds`, not `forcedAttackCandidateIds`. Name the file after the function. Values, types, and constants keep noun names.
- Always use braces for `if`, `else`, and loop bodies, with the body on its own line. Write `if (done) {` / `return;` / `}`, not `if (done) return;`.
