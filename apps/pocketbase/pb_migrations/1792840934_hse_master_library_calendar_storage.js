/// <reference path="../pb_data/types.d.ts" />

// SYNVOSA HSE PORTAL — part 7:
//  - hse_master_library: Super Admin global template library (read-only review
//    for company users; managed only by super_admin). Kept EMPTY — structure only.
//  - hse_calendar: company-scoped manual calendar & schedule entries.
//  - storage readiness fields added to hse_companies (no external connection).

migrate(
  (app) => {
    // ---- hse_master_library (Super Admin global library) ----
    let master;
    try {
      master = app.findCollectionByNameOrId("hse_master_library");
    } catch (_) {
      master = new Collection({
        type: "base",
        name: "hse_master_library",
        // Any signed-in HSE user may review master items; only super_admin may manage.
        listRule: "@request.auth.role = 'super_admin' || @request.auth.id != ''",
        viewRule: "@request.auth.role = 'super_admin' || @request.auth.id != ''",
        createRule: "@request.auth.role = 'super_admin'",
        updateRule: "@request.auth.role = 'super_admin'",
        deleteRule: "@request.auth.role = 'super_admin'",
        fields: [
          { name: "reference", type: "text", required: true, max: 60 },
          { name: "title", type: "text", required: true, max: 200 },
          { name: "category", type: "select", maxSelect: 1, values: ["HSE Inspections & Audit Checklists", "Incident, Accident & Near-Miss Reports", "Toolbox Talks & Safety Meetings", "Equipment & Machinery Inspection Records", "Training, Certificates & Competency Records", "Risk Assessments & JSA", "Material, Store & Issue/Return Records", "Emergency Drills & Fire Safety Records", "Custom HSE Forms & Checklists", "Corrective Actions & Findings Tracking"] },
          { name: "folder", type: "text", max: 120 },
          { name: "version", type: "text", max: 20 },
          { name: "classification", type: "select", maxSelect: 1, values: ["CONFIDENTIAL", "INTERNAL USE ONLY", "BUSINESS USE"] },
          { name: "description", type: "text", max: 2000 },
          { name: "tags", type: "text", max: 300 },
          { name: "review_date", type: "date" },
          { name: "expiry_date", type: "date" },
          { name: "change_notes", type: "text", max: 1000 },
          { name: "status", type: "select", required: true, maxSelect: 1, values: ["draft", "pending_review", "approved", "published", "returned", "rejected", "expired", "obsolete"] },
          { name: "file", type: "file", maxSelect: 1, maxSize: 26214400, mimeTypes: ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "application/vnd.openxmlformats-officedocument.presentationml.presentation", "image/jpeg", "image/png", "image/svg+xml"] },
          { name: "created", type: "autodate", onCreate: true, onUpdate: false },
          { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
        ],
        indexes: [
          "CREATE UNIQUE INDEX idx_hse_master_library_ref ON hse_master_library (reference)",
        ],
      });
      app.save(master);
    }

    // ---- hse_calendar (company-scoped manual schedule) ----
    const companies = app.findCollectionByNameOrId("hse_companies");
    const projects = app.findCollectionByNameOrId("hse_projects");
    const sites = app.findCollectionByNameOrId("hse_sites");
    const coList =
      "@request.auth.role = 'super_admin' || (@request.auth.id != '' && @request.auth.company != '' && @request.auth.company = company)";
    const coCreate =
      "@request.auth.role = 'super_admin' || (@request.auth.id != '' && @request.auth.company != '' && @request.auth.company = @request.body.company)";
    const coWrite =
      "@request.auth.role = 'super_admin' || (@request.auth.id != '' && @request.auth.company != '' && @request.auth.company = company)";

    let calendar;
    try {
      calendar = app.findCollectionByNameOrId("hse_calendar");
    } catch (_) {
      calendar = new Collection({
        type: "base",
        name: "hse_calendar",
        listRule: coList,
        viewRule: coList,
        createRule: coCreate,
        updateRule: coWrite,
        deleteRule: coWrite,
        fields: [
          { name: "company", type: "relation", required: true, maxSelect: 1, collectionId: companies.id, cascadeDelete: true },
          { name: "project", type: "relation", maxSelect: 1, collectionId: projects.id },
          { name: "site", type: "relation", maxSelect: 1, collectionId: sites.id },
          { name: "reference", type: "text", required: true, max: 60 },
          { name: "title", type: "text", required: true, max: 200 },
          { name: "event_type", type: "select", maxSelect: 1, values: ["meeting", "training", "inspection", "toolbox_talk", "audit", "drill", "maintenance", "material_request", "other"] },
          { name: "start_date", type: "date", required: true },
          { name: "end_date", type: "date" },
          { name: "location", type: "text", max: 200 },
          { name: "assigned_to", type: "text", max: 200 },
          { name: "priority", type: "select", maxSelect: 1, values: ["low", "medium", "high", "critical"] },
          { name: "status", type: "select", required: true, maxSelect: 1, values: ["scheduled", "completed", "cancelled", "postponed"] },
          { name: "remarks", type: "text", max: 1000 },
          { name: "created", type: "autodate", onCreate: true, onUpdate: false },
          { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
        ],
        indexes: [
          "CREATE UNIQUE INDEX idx_hse_calendar_ref ON hse_calendar (company, reference)",
        ],
      });
      app.save(calendar);
    }

    // ---- storage readiness fields on hse_companies ----
    const co = app.findCollectionByNameOrId("hse_companies");
    const addIfMissing = (field) => {
      try {
        co.fields.getByName(field.name);
      } catch (_) {
        co.fields.add(field);
      }
    };
    addIfMissing(new TextField({ name: "storage_provider", max: 60 }));
    addIfMissing(new SelectField({ name: "storage_status", maxSelect: 1, values: ["not_connected", "connected", "error", "disabled"] }));
    addIfMissing(new JSONField({ name: "storage_config", maxSize: 200000 }));
    addIfMissing(new DateField({ name: "storage_last_sync" }));
    app.save(co);
  },
  (app) => {
    for (const name of ["hse_calendar", "hse_master_library"]) {
      try {
        app.delete(app.findCollectionByNameOrId(name));
      } catch (e) {
        if (e.message && e.message.includes("no rows in result set")) continue;
        throw e;
      }
    }
    // remove storage fields from hse_companies
    try {
      const co = app.findCollectionByNameOrId("hse_companies");
      for (const fn of ["storage_last_sync", "storage_config", "storage_status", "storage_provider"]) {
        try { co.fields.removeByName(fn); } catch (_) {}
      }
      app.save(co);
    } catch (e) {
      if (!e.message.includes("no rows")) throw e;
    }
  },
);
