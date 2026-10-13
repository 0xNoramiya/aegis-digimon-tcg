## Problem and outcome

Describe the problem, the resulting behavior, and any related issue.

## Changes

- Describe the changes that matter to the reviewer.

## Validation

- List commands run and their results, including failures or checks not run.
- For UI changes, include screenshots or recordings and the viewports/themes checked.

## Risks and rollout

Describe compatibility, migrations, deployment needs, or known limitations. Use
"None" when applicable. Distinguish local validation from deployed behavior.

## Checklist

- [ ] The base branch is `develop`; this branch started from `develop`.
- [ ] The title and description are in English and describe the final changes.
- [ ] Relevant tests, `pnpm check`, and `git diff --check` passed, or failures are documented above.
- [ ] Documentation and regression coverage reflect the change where applicable.
- [ ] The PR will use a merge commit, preserving the commit history.
