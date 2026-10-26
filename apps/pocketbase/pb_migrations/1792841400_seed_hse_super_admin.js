/// <reference path="../pb_data/types.d.ts" />

// SYNVOSA HSE PORTAL — provision the initial Super Admin via a server-side
// migration seed.
//
// Why a migration (not the /hse-bootstrap hook or public signup):
//  - Public self-registration on hse_users is locked to role = "employee"
//    by the collection createRule, so super_admin cannot be granted via the
//    public API. This is intentional and stays in place.
//  - The /hse-bootstrap hook requires a PocketBase superuser token, which is
//    Hostinger-managed infrastructure and was unavailable, blocking end-to-end
//    provisioning.
//  - Migrations run with app privileges (by PocketBase design) and bypass the
//    public createRule, exactly like the bootstrap hook's $app.save(user). This
//    is the documented, supported pattern for seeding an initial admin account
//    (pocketbase/references/SEED_DATA.md, CREATE_AUTH_COLLECTION.md). It does
//    NOT weaken any access rule for normal API traffic and does NOT touch the
//    Hostinger-managed _superusers collection.
//
// Idempotent: if any super_admin already exists, this migration is a no-op.
// The credential below is a server-side account seed (the only sanctioned
// place a credential may appear in code). The owner should change it after
// first login via the Profile page.

const ADMIN_EMAIL = "admin@synvosa.com";
const ADMIN_PASSWORD = "SynvosaHSE!Admin2026";
const ADMIN_FULL_NAME = "SYNVOSA Super Admin";
const DEFAULT_COMPANY_ID = "synvosadefault0";

migrate(
  (app) => {
    // Skip if a super_admin already exists (re-runs / publish are no-ops).
    const existing = app.findRecordsByFilter(
      "hse_users",
      "role = 'super_admin'",
      "",
      1,
      0,
      {},
    );
    if (existing.length > 0) {
      return;
    }

    // Resolve the default company (seeded by 1792840201). Fall back to the
    // first company if the fixed-id one is absent.
    let company;
    try {
      company = app.findRecordById("hse_companies", DEFAULT_COMPANY_ID);
    } catch (_) {
      const any = app.findRecordsByFilter(
        "hse_companies",
        "code != ''",
        "created",
        1,
        0,
        {},
      );
      company = any.length > 0 ? any[0] : null;
    }

    const usersCol = app.findCollectionByNameOrId("hse_users");
    const user = new Record(usersCol);
    user.setEmail(ADMIN_EMAIL);
    user.setPassword(ADMIN_PASSWORD);
    user.set("full_name", ADMIN_FULL_NAME);
    user.set("role", "super_admin");
    user.set("status", "active");
    user.set("verified", true);
    if (company) {
      user.set("company", company.id);
    }
    app.save(user);
  },
  (app) => {
    // Down: remove the seeded super_admin only (never other accounts).
    try {
      const seeded = app.findRecordsByFilter(
        "hse_users",
        "role = 'super_admin' && email = {:email}",
        "",
        100,
        0,
        { email: ADMIN_EMAIL },
      );
      for (const u of seeded) {
        app.delete(u);
      }
    } catch (e) {
      if (e.message && !e.message.includes("no rows")) throw e;
    }
  },
);
