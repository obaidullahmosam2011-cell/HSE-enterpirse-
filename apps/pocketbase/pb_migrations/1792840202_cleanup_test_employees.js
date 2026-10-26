/// <reference path="../pb_data/types.d.ts" />

// Remove the temporary test employee accounts created during verification.
// The default company (synvosadefault0) is intentionally kept as the
// personal-use default. Safe no-op on databases where the accounts don't exist.

migrate(
  (app) => {
    const emails = [
      "testemp@synvosa.local",
      "testemp2@synvosa.local",
      "testemp3@synvosa.local",
    ];
    for (const email of emails) {
      try {
        const u = app.findFirstRecordByData("hse_users", "email", email);
        app.delete(u);
      } catch (e) {
        if (!e.message || !e.message.includes("no rows")) throw e;
      }
    }
    // remove any leftover test observations
    const obs = app.findRecordsByFilter(
      "hse_observations",
      "reference ~ 'SYN-HSE-OBS-00'",
      "created",
      100,
      0,
      {},
    );
    for (const o of obs) {
      try {
        app.delete(o);
      } catch (e) {
        if (!e.message || !e.message.includes("no rows")) throw e;
      }
    }
  },
  (app) => {
    // intentional no-op: test data should not be restored
  },
);
