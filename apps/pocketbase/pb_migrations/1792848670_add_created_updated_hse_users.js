/// <reference path="../pb_data/types.d.ts" />

// SYNVOSA HSE PORTAL — fix: add missing `created`/`updated` autodate fields
// to the `hse_users` auth collection.
//
// Root cause of the User Management loading error:
//   `invalid sort field "created"` (HTTP 400) on
//   GET /api/collections/hse_users/records?sort=-created
//
// The original migration 1792839400_hse_companies_users.js created `hse_users`
// without `created`/`updated` autodate fields, unlike every other hse_*
// collection (which all declare them). The User Management page sorts by
// `-created` and displays a "Created" column, so the missing field broke the
// list query and prevented the page from loading.
//
// This forward delta adds the two autodate fields, making `hse_users`
// consistent with the rest of the HSE schema. Non-destructive: existing
// records are backfilled with the current timestamp by PocketBase.

migrate(
  (app) => {
    const hseUsers = app.findCollectionByNameOrId("hse_users");

    // Guard: only add if missing (idempotent).
    if (!hseUsers.fields.getByName("created")) {
      hseUsers.fields.add(
        new AutodateField({ name: "created", onCreate: true, onUpdate: false }),
      );
    }
    if (!hseUsers.fields.getByName("updated")) {
      hseUsers.fields.add(
        new AutodateField({ name: "updated", onCreate: true, onUpdate: true }),
      );
    }

    app.save(hseUsers);
  },
  (app) => {
    const hseUsers = app.findCollectionByNameOrId("hse_users");
    try {
      hseUsers.fields.removeByName("created");
    } catch (_) {}
    try {
      hseUsers.fields.removeByName("updated");
    } catch (_) {}
    app.save(hseUsers);
  },
);
