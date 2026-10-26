/// <reference path="../pb_data/types.d.ts" />

// SYNVOSA HSE Portal — seed a default company for personal use.
// The bootstrap hook reuses this company if it already exists.
// Additive only; down removes the seeded row by code.

migrate(
  (app) => {
    const col = app.findCollectionByNameOrId("hse_companies");
    const existing = app.findRecordsByFilter(
      "hse_companies",
      "code != ''",
      "created",
      1,
      0,
      {},
    );
    if (existing.length === 0) {
      const c = new Record(col);
      c.set("name", "SYNVOSA");
      c.set("code", "SYN");
      c.set("status", "active");
      app.save(c);
    }
  },
  (app) => {
    try {
      const c = app.findFirstRecordByData("hse_companies", "code", "SYN");
      app.delete(c);
    } catch (e) {
      if (e.message && e.message.includes("no rows")) return;
      throw e;
    }
  },
);
