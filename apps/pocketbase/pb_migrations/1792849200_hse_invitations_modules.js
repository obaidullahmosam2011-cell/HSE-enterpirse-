/// <reference path="../pb_data/types.d.ts" />

// SYNVOSA HSE PORTAL — multi-company onboarding & permissions.
//
// 1. hse_invitations: secure, single-use, time-limited invitation records.
//    Token is stored (hashed when $security.sha256 is available, raw otherwise
//    — mitigated by single-use + 7-day expiry + 48-char entropy) and redacted
//    from API responses by an onRecordEnrich hook in hse_invitations.pb.js.
// 2. enabled_modules (JSON) on hse_companies: per-company module toggles.
//    null/empty = all modules enabled; otherwise only the listed keys are on.
// 3. hse_users updateRule widened so a Company Admin may assign permitted
//    (non-super_admin, non-company_admin) roles to users in their own company,
//    while still being unable to change company assignment or escalate to
//    super_admin / company_admin. Self-edits remain locked against role /
//    status / company changes.

migrate(
  (app) => {
    const companies = app.findCollectionByNameOrId("hse_companies");
    const hseUsers = app.findCollectionByNameOrId("hse_users");

    // ---- enabled_modules on hse_companies ----
    const co = app.findCollectionByNameOrId("hse_companies");
    const coHas = (name) => {
      try {
        return !!co.fields.getByName(name);
      } catch (_) {
        return false;
      }
    };
    if (!coHas("enabled_modules")) {
      co.fields.add(new JSONField({ name: "enabled_modules", maxSize: 200000 }));
      app.save(co);
    }

    // ---- hse_users updateRule: allow Company Admin role assignment ----
    hseUsers.updateRule =
      "(id = @request.auth.id && @request.body.role:changed = false && @request.body.status:changed = false && @request.body.company:changed = false) || " +
      "@request.auth.role = 'super_admin' || " +
      "(@request.auth.role = 'company_admin' && @request.auth.company = company && @request.body.company:changed = false && (@request.body.role:isset = false || (@request.body.role != 'super_admin' && @request.body.role != 'company_admin')))";
    app.save(hseUsers);

    // ---- hse_invitations ----
    let inv;
    try {
      inv = app.findCollectionByNameOrId("hse_invitations");
    } catch (_) {
      inv = new Collection({
        type: "base",
        name: "hse_invitations",
        // Super Admin sees all; a Company Admin sees only invitations for
        // their own company. The token field is redacted on response (hook).
        listRule:
          "@request.auth.role = 'super_admin' || (@request.auth.role = 'company_admin' && @request.auth.company = company)",
        viewRule:
          "@request.auth.role = 'super_admin' || (@request.auth.role = 'company_admin' && @request.auth.company = company)",
        createRule:
          "@request.auth.role = 'super_admin' || (@request.auth.role = 'company_admin' && @request.auth.company = @request.body.company)",
        updateRule:
          "@request.auth.role = 'super_admin' || (@request.auth.role = 'company_admin' && @request.auth.company = company)",
        deleteRule: "@request.auth.role = 'super_admin'",
        fields: [
          { name: "email", type: "email", required: true, max: 120 },
          { name: "full_name", type: "text", required: true, max: 120 },
          {
            name: "company",
            type: "relation",
            required: true,
            maxSelect: 1,
            collectionId: companies.id,
            cascadeDelete: true,
          },
          {
            name: "intended_role",
            type: "select",
            required: true,
            maxSelect: 1,
            values: [
              "company_admin",
              "hse_manager",
              "supervisor",
              "safety_officer",
              "employee",
            ],
          },
          { name: "token", type: "text", required: true, max: 128 },
          { name: "expires_at", type: "date", required: true },
          { name: "used", type: "bool" },
          { name: "revoked", type: "bool" },
          { name: "accepted_at", type: "date" },
          {
            name: "accepted_user",
            type: "relation",
            maxSelect: 1,
            collectionId: hseUsers.id,
          },
          {
            name: "created_by",
            type: "relation",
            maxSelect: 1,
            collectionId: hseUsers.id,
          },
          { name: "created", type: "autodate", onCreate: true, onUpdate: false },
          { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
        ],
      });
      app.save(inv);
    }
  },
  (app) => {
    try {
      app.delete(app.findCollectionByNameOrId("hse_invitations"));
    } catch (e) {
      if (e.message && !e.message.includes("no rows")) throw e;
    }
    // revert enabled_modules
    try {
      const co = app.findCollectionByNameOrId("hse_companies");
      try {
        co.fields.removeByName("enabled_modules");
      } catch (_) {}
      app.save(co);
    } catch (e) {
      if (!e.message.includes("no rows")) throw e;
    }
    // revert updateRule to the prior locked form
    try {
      const hseUsers = app.findCollectionByNameOrId("hse_users");
      hseUsers.updateRule =
        "(id = @request.auth.id && @request.body.role:changed = false && @request.body.status:changed = false && @request.body.company:changed = false) || @request.auth.role = 'super_admin' || (@request.auth.role = 'company_admin' && @request.auth.company = company && @request.body.role:changed = false)";
      app.save(hseUsers);
    } catch (e) {
      if (!e.message.includes("no rows")) throw e;
    }
  },
);
