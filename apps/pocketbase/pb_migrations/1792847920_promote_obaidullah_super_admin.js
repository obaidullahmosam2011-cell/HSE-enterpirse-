/// <reference path="../pb_data/types.d.ts" />

// SYNVOSA HSE PORTAL — promote the existing hse_users account
// obaidullahmosam2012@gmail.com to super_admin.
//
// Authorized backend administration process:
//  - The account already exists (created via public self-registration, which
//    only grants the "employee" role). This migration does NOT create a new
//    account, does NOT set any password, and does NOT weaken any access rule.
//  - Migrations run with app privileges (by PocketBase design) and bypass the
//    public updateRule that locks the `role` field against self-escalation
//    (`@request.body.role:changed = false`). This is the same documented,
//    supported pattern used by 1792841400_seed_hse_super_admin.js to provision
//    an initial admin account. It does not change any rule for normal API
//    traffic and does not touch the Hostinger-managed _superusers collection.
//  - Company assignment is left empty: a Super Admin has system-wide access
//    and is not scoped to a single company.
//
// Fail-loud: if the target account does not exist, the migration throws so the
// apply fails visibly instead of silently marking itself done.

const TARGET_EMAIL = "obaidullahmosam2012@gmail.com";

migrate(
  (app) => {
    const records = app.findRecordsByFilter(
      "hse_users",
      "email = {:email}",
      "",
      1,
      0,
      { email: TARGET_EMAIL },
    );

    if (records.length === 0) {
      throw new Error(
        "HSE account " +
          TARGET_EMAIL +
          " was not found. Register it at /hse/register before promoting it to super_admin.",
      );
    }

    const user = records[0];
    user.set("role", "super_admin");

    // Leave company assignment empty (Super Admin is system-wide, not
    // company-scoped). Only clear it if a value is currently set, to avoid
    // touching an already-empty field.
    const currentCompany = user.getString("company");
    if (currentCompany !== "") {
      user.set("company", "");
    }

    app.save(user);
  },
  (app) => {
    // Down: revert the role to "employee" (the role public registration grants).
    // Company is intentionally not restored — its prior value is not recoverable
    // here, and an empty company is the correct state for a demoted account.
    const records = app.findRecordsByFilter(
      "hse_users",
      "email = {:email}",
      "",
      1,
      0,
      { email: TARGET_EMAIL },
    );

    if (records.length > 0) {
      const user = records[0];
      user.set("role", "employee");
      app.save(user);
    }
  },
);
