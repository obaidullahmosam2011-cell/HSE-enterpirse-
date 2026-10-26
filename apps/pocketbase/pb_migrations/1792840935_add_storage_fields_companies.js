/// <reference path="../pb_data/types.d.ts" />

// SYNVOSA HSE PORTAL — delta: add storage-readiness fields to hse_companies.
// The previous migration's addIfMissing relied on getByName() throwing on a
// miss, but it returns undefined instead, so the fields were never added.

migrate(
  (app) => {
    const co = app.findCollectionByNameOrId("hse_companies");
    const has = (name) => {
      try { return !!co.fields.getByName(name); } catch (_) { return false; }
    };
    if (!has("storage_provider")) co.fields.add(new TextField({ name: "storage_provider", max: 60 }));
    if (!has("storage_status")) co.fields.add(new SelectField({ name: "storage_status", maxSelect: 1, values: ["not_connected", "connected", "error", "disabled"] }));
    if (!has("storage_config")) co.fields.add(new JSONField({ name: "storage_config", maxSize: 200000 }));
    if (!has("storage_last_sync")) co.fields.add(new DateField({ name: "storage_last_sync" }));
    app.save(co);
  },
  (app) => {
    const co = app.findCollectionByNameOrId("hse_companies");
    for (const fn of ["storage_last_sync", "storage_config", "storage_status", "storage_provider"]) {
      try { co.fields.removeByName(fn); } catch (_) {}
    }
    app.save(co);
  },
);
