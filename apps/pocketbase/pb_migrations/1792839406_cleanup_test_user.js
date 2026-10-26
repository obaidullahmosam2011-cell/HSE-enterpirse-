/// <reference path="../pb_data/types.d.ts" />

// Idempotent cleanup: remove the throwaway test employee account created
// during backend verification (hse.test@synvosa.test). Safe on every
// environment — no-op when the account does not exist.

migrate(
  (app) => {
    try {
      const rows = app.findRecordsByFilter(
        "hse_users",
        "email = 'hse.test@synvosa.test'",
      );
      for (const r of rows) {
        app.delete(r);
      }
    } catch (e) {
      if (e.message && e.message.includes("no rows in result set")) return;
      throw e;
    }
  },
  (app) => {
    // nothing to revert
  },
);
