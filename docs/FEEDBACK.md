# Public community feedback hub

The community hub lives at `/feedback`. Everyone can read public topics and share
their URLs. Signing in is required to publish, reply, support ideas, confirm that a
bug also affects them, report content, or follow updates.

## Topics and discussion

New topics use the existing Bug, Improvement and Other types. Reports support up
to 20,000 characters, safe Markdown formatting, a preview and five images of up to
5 MiB each. Images can be chosen, dragged or pasted. PNG, JPEG and WebP inputs are
decoded and normalized to WebP on the API, with a 16-million-pixel input limit and
a maximum output edge of 2,048 pixels. Metadata is removed; animated and unsupported
formats are refused.

Text drafts for new topics are saved on the device for the signed-in account and
expire after 24 hours. Reply text drafts survive reloads within the current browser
session. Images must be added again after leaving a draft. Navigation is guarded
while a draft is dirty or an upload/submission is running.

The author follows their topic automatically. Following is optional for other
readers, and everyone, including the author, can unfollow. Public replies and
visible triage changes notify followers through the existing account inbox.
Comments from administrators are marked as official responses.

Comments are loaded chronologically in pages of 20. New replies are displayed
immediately, and loading more comments preserves the rest of the discussion.
Support is idempotent per account and does not determine the team's priorities.

## Roadmap and delivered features

`/feedback/roadmap` presents four columns driven by public topic status:

| Column          | Existing serialized status | Scope              |
| --------------- | -------------------------- | ------------------ |
| Community ideas | `new`                      | Improvement topics |
| Under review    | `triaged`                  | Public topics      |
| In development  | `in_progress`              | Public topics      |
| Delivered       | `resolved`                 | Public topics      |

Each column shows the 20 most recent topics and provides a link to the complete
filtered discussion list. Ideas are proposals, not commitments or release-date
promises. Administrators maintain the statuses through the existing triage UI.
The “Already available” section reads actual feature entries from the committed
release catalog; complete release notes remain at `/whats-new`.

## Privacy and moderation

Migration 033 adds `is_public` with a default of false. Existing reports remain
private and accessible to their author at `/feedback/private`, or through their
old notification links after sign-in. The original private reporting API remains
compatible; it does not publish reports to the forum.

Public projections include only topic text, card IDs, author display names,
images, status history, visible replies and engagement counts. Browser strings,
internal notes, account IDs, opponent decks, match IDs and captured replay records
are not exposed. A triage closing reply remains private until the report is closed
or has been reopened. Official discussion comments are published immediately.
Private or hidden duplicate targets are not linked publicly.

Reporting from a match retains the existing private replay capture for the team.
There is no arbitrary replay-file upload or public download of captured input
records. Forum topic submissions use local storage rather than automatically
creating GitHub issues; private legacy submissions retain the configured mirror.

Administrators can inspect content flags, hide or restore a topic or reply, and
include hidden topics in the hub list. Hidden topics and images attached to hidden
topics/replies return 404 to ordinary readers. Private admin notes remain in triage.

Unattached images are readable only by their owner until they expire after 24
hours. Upload writes prune expired unattached images and enforce a per-account
budget of 50 images in a rolling day. Publishing binds images to the authenticated
owner's topic or reply in the same transaction. A previously attached or
foreign-owned image cannot be reused. API actions and uploads also have short-term
rate limits.

## Validation

Database authorization, attachment ownership, rollback, idempotency, notification
and privacy regressions run against an isolated PostgreSQL database:

```sh
POSTGRES_TESTS=1 POSTGRES_TEST_URL=postgresql://127.0.0.1:5441/aegis_forum \
  pnpm --filter @aegis/api exec vitest run src/db/postgres.atomicity.feedbackForum.test.ts
```

UI flow and layout regressions use the real product components with controlled
HTTP responses; persistence is covered independently by the PostgreSQL tests:

```sh
pnpm --filter @aegis/web test:browser public-feedback-forum.spec.ts
```

The initial forum copy is localized in English, Brazilian Portuguese and Spanish.
Other supported interface locales use the English forum strings.
