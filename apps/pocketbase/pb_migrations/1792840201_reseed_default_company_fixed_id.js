/// <reference path="../pb_data/types.d.ts" />

// Reseed the default company with a fixed, known id so it can be referenced
// during verification (the hse_companies listRule blocks anonymous reads).
// Also removes the company-less test employee created during the first test
// pass. The fixed-id company is the personal-use default; the bootstrap hook
// reuses it if it already exists.

migrate(
  (app) => {
    // remove prior company-less test employee
    try {
      const u = app.findFirstRecordByData(
        "hse_users",
        "email",
        "testemp@synvosa.local",
      );
      app.delete(u);
    } catch (e) {
      if (!e.message || !e.message.includes("no rows")) throw e;
    }

    // remove any existing SYN company so we can recreate with a fixed id
    const cos = app.findRecordsByFilter(
      "hse_companies",
      "code = 'SYN'",
      "created",
      100,
      0,
      {},
    );
    for (const c of cos) {
      try {
        app.delete(c);
      } catch (e) {
        if (!e.message || !e.message.includes("no rows")) throw e;
      }
    }

    // create default company with a fixed id
    const col = app.findCollectionByNameOrId("hse_companies");
    const company = new Record(col);
    company.set("id", "synvosadefault0");
    company.set("name", "SYNVOSA");
    company.set("code", "SYN");
    company.set("status", "active");
    app.save(company);
  },
  (app) => {
    try {
      const c = app.findRecordById("hse_companies", "synvosadefault0");
      app.delete(c);
    } catch (e) {
      if (!e.message || !e.message.includes("no rows")) throw e;
    }
  },
);
