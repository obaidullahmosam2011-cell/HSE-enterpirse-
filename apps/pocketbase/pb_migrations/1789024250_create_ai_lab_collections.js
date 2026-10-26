/// <reference path="../pb_data/types.d.ts" />

// SYNVOSA AI LAB — isolated collections.
// These collections are completely separate from the main website's
// student/certificate/user systems. Unique names prevent any conflict.

migrate(
  (app) => {
    // ---- ai_users (auth collection, isolated from main `users`) ----
    let aiUsers;
    try {
      aiUsers = app.findCollectionByNameOrId("ai_users");
    } catch (_) {
      aiUsers = new Collection({
        type: "auth",
        name: "ai_users",
        // Public sign-up for the experimental lab, but role/status locked.
        listRule: "id = @request.auth.id || @request.auth.role = 'admin'",
        viewRule: "id = @request.auth.id || @request.auth.role = 'admin'",
        createRule:
          "(@request.body.role:isset = false || @request.body.role = 'user') && (@request.body.status:isset = false || @request.body.status = 'active')",
        updateRule:
          "(id = @request.auth.id && @request.body.role:changed = false && @request.body.status:changed = false) || @request.auth.role = 'admin'",
        deleteRule: "@request.auth.role = 'admin'",
        // Disabled users cannot authenticate.
        authRule: "status = 'active'",
        passwordAuth: { enabled: true, identityFields: ["email"] },
        authAlert: { enabled: false },
        fields: [
          { name: "full_name", type: "text", required: true, max: 120 },
          {
            name: "role",
            type: "select",
            required: true,
            maxSelect: 1,
            values: ["user", "admin"],
          },
          {
            name: "status",
            type: "select",
            required: true,
            maxSelect: 1,
            values: ["active", "disabled"],
          },
          { name: "last_login", type: "date" },
          { name: "usage_count", type: "number", onlyInt: true },
        ],
      });
      app.save(aiUsers);
    }

    // Ensure role/status exist + locked rules if collection pre-existed.
    if (!aiUsers.fields.getByName("role")) {
      aiUsers.fields.add(
        new SelectField({
          name: "role",
          required: true,
          maxSelect: 1,
          values: ["user", "admin"],
        }),
      );
    }
    if (!aiUsers.fields.getByName("status")) {
      aiUsers.fields.add(
        new SelectField({
          name: "status",
          required: true,
          maxSelect: 1,
          values: ["active", "disabled"],
        }),
      );
    }
    if (!aiUsers.fields.getByName("full_name")) {
      aiUsers.fields.add(new TextField({ name: "full_name", required: true, max: 120 }));
    }
    if (!aiUsers.fields.getByName("last_login")) {
      aiUsers.fields.add(new DateField({ name: "last_login" }));
    }
    if (!aiUsers.fields.getByName("usage_count")) {
      aiUsers.fields.add(new NumberField({ name: "usage_count", onlyInt: true }));
    }
    // Enforce password min length 10.
    const pw = aiUsers.fields.getByName("password");
    if (pw) pw.min = Math.max(pw.min || 0, 10);
    app.save(aiUsers);

    // ---- ai_login_logs ----
    let loginLogs;
    try {
      loginLogs = app.findCollectionByNameOrId("ai_login_logs");
    } catch (_) {
      loginLogs = new Collection({
        type: "base",
        name: "ai_login_logs",
        listRule:
          "@request.auth.id != '' && @request.auth.id = user || @request.auth.role = 'admin'",
        viewRule:
          "@request.auth.id != '' && @request.auth.id = user || @request.auth.role = 'admin'",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.role = 'admin'",
        deleteRule: "@request.auth.role = 'admin'",
        fields: [
          {
            name: "user",
            type: "relation",
            required: true,
            maxSelect: 1,
            collectionId: aiUsers.id,
            cascadeDelete: true,
          },
          { name: "ip", type: "text", max: 64 },
          { name: "success", type: "bool" },
          { name: "user_agent", type: "text", max: 300 },
          { name: "created", type: "autodate", onCreate: true, onUpdate: false },
        ],
      });
      app.save(loginLogs);
    }

    // ---- ai_lab_activity ----
    let activity;
    try {
      activity = app.findCollectionByNameOrId("ai_lab_activity");
    } catch (_) {
      activity = new Collection({
        type: "base",
        name: "ai_lab_activity",
        listRule:
          "@request.auth.id != '' && @request.auth.id = user || @request.auth.role = 'admin'",
        viewRule:
          "@request.auth.id != '' && @request.auth.id = user || @request.auth.role = 'admin'",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.role = 'admin'",
        deleteRule: "@request.auth.role = 'admin'",
        fields: [
          {
            name: "user",
            type: "relation",
            required: true,
            maxSelect: 1,
            collectionId: aiUsers.id,
            cascadeDelete: true,
          },
          { name: "activity_type", type: "text", required: true, max: 80 },
          { name: "details", type: "text", max: 500 },
          { name: "created", type: "autodate", onCreate: true, onUpdate: false },
        ],
      });
      app.save(activity);
    }
  },
  (app) => {
    for (const name of ["ai_lab_activity", "ai_login_logs", "ai_users"]) {
      try {
        const c = app.findCollectionByNameOrId(name);
        app.delete(c);
      } catch (e) {
        if (e.message && e.message.includes("no rows in result set")) continue;
        throw e;
      }
    }
  },
);
