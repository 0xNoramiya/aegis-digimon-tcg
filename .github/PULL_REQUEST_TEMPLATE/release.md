## Release

Version: `vX.Y.Z-BETA`

Base: `main`

Head: `develop`

## Player-facing changes

- Summarize the features and fixes included in this release.

## Validation

- List the release checks and test results, including failures or checks not run.

## Rollout and recovery

Describe deployment steps, migrations, compatibility concerns, and the recovery
procedure. Merging this PR does not publish or deploy the release.

## Before merge

- [ ] The base is `main` and the head is `develop`.
- [ ] Package versions, release notes, and required translations are synchronized.
- [ ] `pnpm release:check` and relevant CI checks passed; validation limits are documented above.
- [ ] The complete diff against `main` was reviewed.
- [ ] Merge using a merge commit and retain `develop`.

## After merge

- [ ] From clean, updated `main`, run `pnpm release:publish -- vX.Y.Z-BETA`.
- [ ] Record the published release link and deployment status.
- [ ] Synchronize `main` back into `develop` through a PR with a merge commit.
