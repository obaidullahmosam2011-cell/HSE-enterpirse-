/// <reference path="../pb_data/types.d.ts" />

// SYNVOSA HSE PORTAL — part 6: in-portal notifications + audit log.

migrate(
  (app) => {
    const companies = app.findCollectionByNameOrId("hse_companies");
    const hseUsers = app.findCollectionByNameOrId("hse_users");
    const created = { name: "created", type: "autodate", onCreate: true, onUpdate: false };
    const updated = { name: "updated", type: "autodate", onCreate: true, onUpdate: true };

    // ---- hse_notifications ----
    let notifications;
    try {
      notifications = app.findCollectionByNameOrId("hse_notifications");
    } catch (_) {
      notifications = new Collection({
        type: "base",
        name: "hse_notifications",
        listRule:
          "@request.auth.role = 'super_admin' || (@request.auth.id != '' && recipient = @request.auth.id)",
        viewRule:
          "@request.auth.role = 'super_admin' || (@request.auth.id != '' && recipient = @request.auth.id)",
        createRule: "@request.auth.id != ''",
        updateRule:
          "@request.auth.role = 'super_admin' || (@request.auth.id != '' && recipient = @request.auth.id)",
        deleteRule: "@request.auth.role = 'super_admin'",
        fields: [
          { name: "recipient", type: "relation", required: true, maxSelect: 1, collectionId: hseUsers.id, cascadeDelete: true },
          { name: "company", type: "relation", maxSelect: 1, collectionId: companies.id },
          { name: "title", type: "text", required: true, max: 200 },
          { name: "body", type: "text", max: 1000 },
          { name: "module", type: "text", max: 80 },
          { name: "record_ref", type: "text", max: 60 },
          { name: "priority", type: "select", maxSelect: 1, values: ["low", "medium", "high", "critical"] },
          { name: "read", type: "bool" },
          created, updated,
        ],
      });
      app.save(notifications);
    }

    // ---- hse_audit_log ----
    let auditLog;
    try {
      auditLog = app.findCollectionByNameOrId("hse_audit_log");
    } catch (_) {
      auditLog = new Collection({
        type: "base",
        name: "hse_audit_log",
        listRule:
          "@request.auth.role = 'super_admin' || (@request.auth.role = 'company_admin' && @request.auth.company = company) || (@request.auth.id != '' && actor = @request.auth.id)",
        viewRule:
          "@request.auth.role = 'super_admin' || (@request.auth.role = 'company_admin' && @request.auth.company = company) || (@request.auth.id != '' && actor = @request.auth.id)",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.role = 'super_admin'",
        deleteRule: "@request.auth.role = 'super_admin'",
        fields: [
          { name: "actor", type: "relation", required: true, maxSelect: 1, collectionId: hseUsers.id, cascadeDelete: false },
          { name: "company", type: "relation", maxSelect: 1, collectionId: companies.id },
          { name: "action", type: "text", required: true, max: 80 },
          { name: "module", type: "text", max: 80 },
          { name: "record_ref", type: "text", max: 60 },
          { name: "details", type: "text", max: 2000 },
          { name: "ip", type: "text", max: 64 },
          created,
        ],
      });
      app.save(auditLog);
    }
  },
  (app) => {
    for (const name of ["hse_audit_log", "hse_notifications"]) {
      try {
        app.delete(app.findCollectionByNameOrId(name));
      } catch (e) {
        if (e.message && e.message.includes("no rows in result set")) continue;
        throw e;
      }
    }
  },
);
