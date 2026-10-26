/// <reference path="../pb_data/types.d.ts" />

// SYNVOSA HSE PORTAL — part 1: companies + users (auth).
// Multi-company isolation: super_admin sees all; company users see own company only.

migrate(
  (app) => {
    // ---- hse_companies ----
    let companies;
    try {
      companies = app.findCollectionByNameOrId("hse_companies");
    } catch (_) {
      companies = new Collection({
        type: "base",
        name: "hse_companies",
        listRule:
          "@request.auth.role = 'super_admin' || (@request.auth.id != '' && @request.auth.company = id)",
        viewRule:
          "@request.auth.role = 'super_admin' || (@request.auth.id != '' && @request.auth.company = id)",
        createRule: "@request.auth.role = 'super_admin'",
        updateRule:
          "@request.auth.role = 'super_admin' || (@request.auth.id != '' && @request.auth.company = id && @request.auth.role = 'company_admin')",
        deleteRule: "@request.auth.role = 'super_admin'",
        fields: [
          { name: "name", type: "text", required: true, max: 200 },
          { name: "name_ar", type: "text", max: 200 },
          { name: "code", type: "text", required: true, max: 20 },
          { name: "cr_number", type: "text", max: 60 },
          { name: "cr_expiry", type: "date" },
          { name: "address", type: "text", max: 400 },
          { name: "city", type: "text", max: 100 },
          { name: "country", type: "text", max: 100 },
          { name: "postal_code", type: "text", max: 20 },
          { name: "phone", type: "text", max: 40 },
          { name: "email", type: "email", max: 120 },
          { name: "website", type: "url", max: 200 },
          { name: "authorized_representative", type: "text", max: 120 },
          { name: "rep_position", type: "text", max: 120 },
          { name: "logo", type: "file", maxSelect: 1, maxSize: 5242880, mimeTypes: ["image/jpeg", "image/png", "image/svg+xml", "image/webp"] },
          { name: "status", type: "select", required: true, maxSelect: 1, values: ["active", "suspended", "inactive"] },
          { name: "storage_quota_mb", type: "number", onlyInt: true },
          { name: "created", type: "autodate", onCreate: true, onUpdate: false },
          { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
        ],
        indexes: [
          "CREATE UNIQUE INDEX idx_hse_companies_code ON hse_companies (code) WHERE code != ''",
        ],
      });
      app.save(companies);
    }

    // ---- hse_users (auth) ----
    let hseUsers;
    try {
      hseUsers = app.findCollectionByNameOrId("hse_users");
    } catch (_) {
      hseUsers = new Collection({
        type: "auth",
        name: "hse_users",
        listRule:
          "@request.auth.role = 'super_admin' || id = @request.auth.id || (@request.auth.role = 'company_admin' && @request.auth.company = company)",
        viewRule:
          "@request.auth.role = 'super_admin' || id = @request.auth.id || (@request.auth.role = 'company_admin' && @request.auth.company = company)",
        createRule:
          "(@request.body.role:isset = false || @request.body.role = 'employee') && (@request.body.status:isset = false || @request.body.status = 'active')",
        updateRule:
          "(id = @request.auth.id && @request.body.role:changed = false && @request.body.status:changed = false && @request.body.company:changed = false) || @request.auth.role = 'super_admin' || (@request.auth.role = 'company_admin' && @request.auth.company = company && @request.body.role:changed = false)",
        deleteRule:
          "@request.auth.role = 'super_admin' || (@request.auth.role = 'company_admin' && @request.auth.company = company)",
        authRule: "status = 'active'",
        passwordAuth: { enabled: true, identityFields: ["email"] },
        authAlert: { enabled: false },
        fields: [
          { name: "full_name", type: "text", required: true, max: 120 },
          { name: "job_title", type: "text", max: 120 },
          { name: "employee_id", type: "text", max: 60 },
          { name: "phone", type: "text", max: 40 },
          { name: "role", type: "select", required: true, maxSelect: 1, values: ["super_admin", "company_admin", "hse_manager", "supervisor", "safety_officer", "employee"] },
          { name: "status", type: "select", required: true, maxSelect: 1, values: ["active", "disabled"] },
          { name: "company", type: "relation", maxSelect: 1, collectionId: companies.id, cascadeDelete: false },
          { name: "last_login", type: "date" },
          { name: "avatar", type: "file", maxSelect: 1, maxSize: 5242880, mimeTypes: ["image/jpeg", "image/png", "image/webp"] },
        ],
      });
      app.save(hseUsers);
    }
    const hsePw = hseUsers.fields.getByName("password");
    if (hsePw) hsePw.min = Math.max(hsePw.min || 0, 10);
    app.save(hseUsers);
  },
  (app) => {
    for (const name of ["hse_users", "hse_companies"]) {
      try {
        app.delete(app.findCollectionByNameOrId(name));
      } catch (e) {
        if (e.message && e.message.includes("no rows in result set")) continue;
        throw e;
      }
    }
  },
);
