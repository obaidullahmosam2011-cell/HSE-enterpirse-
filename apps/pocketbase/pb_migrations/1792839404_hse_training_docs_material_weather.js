/// <reference path="../pb_data/types.d.ts" />

// SYNVOSA HSE PORTAL — part 5: training, toolbox talks, documents, material
// requests, weather/environment. Company-scoped isolation.

migrate(
  (app) => {
    const companies = app.findCollectionByNameOrId("hse_companies");
    const projects = app.findCollectionByNameOrId("hse_projects");
    const sites = app.findCollectionByNameOrId("hse_sites");
    const coList =
      "@request.auth.role = 'super_admin' || (@request.auth.id != '' && @request.auth.company != '' && @request.auth.company = company)";
    const coCreate =
      "@request.auth.role = 'super_admin' || (@request.auth.id != '' && @request.auth.company != '' && @request.auth.company = @request.body.company)";
    const coWrite =
      "@request.auth.role = 'super_admin' || (@request.auth.id != '' && @request.auth.company != '' && @request.auth.company = company)";
    const rel = (col) => ({ name: "company", type: "relation", required: true, maxSelect: 1, collectionId: col, cascadeDelete: true });
    const proj = { name: "project", type: "relation", maxSelect: 1, collectionId: projects.id };
    const site = { name: "site", type: "relation", maxSelect: 1, collectionId: sites.id };
    const created = { name: "created", type: "autodate", onCreate: true, onUpdate: false };
    const updated = { name: "updated", type: "autodate", onCreate: true, onUpdate: true };

    function make(name, fields, uniqueRef) {
      let c;
      try {
        c = app.findCollectionByNameOrId(name);
      } catch (_) {
        c = new Collection({
          type: "base",
          name,
          listRule: coList,
          viewRule: coList,
          createRule: coCreate,
          updateRule: coWrite,
          deleteRule: coWrite,
          fields,
          indexes: uniqueRef
            ? ["CREATE UNIQUE INDEX idx_" + name + "_ref ON " + name + " (company, reference)"]
            : [],
        });
        app.save(c);
      }
      return c;
    }

    make("hse_training", [
      rel(companies.id), proj, site,
      { name: "reference", type: "text", required: true, max: 60 },
      { name: "title", type: "text", required: true, max: 200 },
      { name: "scheduled_at", type: "date", required: true },
      { name: "end_at", type: "date" },
      { name: "location", type: "text", max: 200 },
      { name: "trainer", type: "text", max: 120 },
      { name: "participants", type: "json", maxSize: 200000 },
      { name: "attendance_state", type: "select", maxSelect: 1, values: ["scheduled", "attended", "absent", "completed", "missed"] },
      { name: "frequency", type: "select", maxSelect: 1, values: ["one_time", "daily", "weekly", "monthly", "yearly", "custom"] },
      { name: "materials", type: "file", maxSelect: 10, maxSize: 26214400, mimeTypes: ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/vnd.openxmlformats-officedocument.presentationml.presentation"] },
      { name: "certificates", type: "file", maxSelect: 10, maxSize: 26214400, mimeTypes: ["application/pdf", "image/jpeg", "image/png"] },
      { name: "remarks", type: "text", max: 1000 },
      { name: "status", type: "select", required: true, maxSelect: 1, values: ["scheduled", "completed", "missed", "overdue"] },
      created, updated,
    ], true);

    make("hse_toolbox_talks", [
      rel(companies.id), proj, site,
      { name: "reference", type: "text", required: true, max: 60 },
      { name: "topic", type: "text", required: true, max: 200 },
      { name: "presenter", type: "text", max: 120 },
      { name: "held_at", type: "date", required: true },
      { name: "location", type: "text", max: 200 },
      { name: "recipients", type: "json", maxSize: 200000 },
      { name: "attendance", type: "json", maxSize: 200000 },
      { name: "is_emergency_notice", type: "bool" },
      { name: "remarks", type: "text", max: 1000 },
      { name: "evidence", type: "file", maxSelect: 10, maxSize: 26214400, mimeTypes: ["image/jpeg", "image/png", "application/pdf"] },
      { name: "status", type: "select", required: true, maxSelect: 1, values: ["planned", "completed", "missed", "overdue"] },
      created, updated,
    ], true);

    make("hse_documents", [
      rel(companies.id), proj, site,
      { name: "reference", type: "text", required: true, max: 60 },
      { name: "title", type: "text", required: true, max: 200 },
      { name: "category", type: "select", maxSelect: 1, values: ["HSE Inspections & Audit Checklists", "Incident, Accident & Near-Miss Reports", "Toolbox Talks & Safety Meetings", "Equipment & Machinery Inspection Records", "Training, Certificates & Competency Records", "Risk Assessments & JSA", "Material, Store & Issue/Return Records", "Emergency Drills & Fire Safety Records", "Custom HSE Forms & Checklists", "Corrective Actions & Findings Tracking"] },
      { name: "version", type: "text", max: 20 },
      { name: "classification", type: "select", maxSelect: 1, values: ["CONFIDENTIAL", "INTERNAL USE ONLY", "BUSINESS USE"] },
      { name: "review_date", type: "date" },
      { name: "expiry_date", type: "date" },
      { name: "change_notes", type: "text", max: 1000 },
      { name: "file", type: "file", maxSelect: 1, maxSize: 26214400, mimeTypes: ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "application/vnd.openxmlformats-officedocument.presentationml.presentation", "image/jpeg", "image/png", "image/svg+xml"] },
      { name: "status", type: "select", required: true, maxSelect: 1, values: ["draft", "pending_review", "approved", "published", "returned", "rejected", "expired", "obsolete"] },
      created, updated,
    ], true);

    make("hse_material_requests", [
      rel(companies.id), proj, site,
      { name: "reference", type: "text", required: true, max: 60 },
      { name: "request_type", type: "select", maxSelect: 1, values: ["PPE", "Drinking Water", "Safety Equipment", "Tools & Equipment", "Materials & Consumables", "First Aid", "Housekeeping Supplies", "Welfare Facilities", "Maintenance", "Other"] },
      { name: "item", type: "text", required: true, max: 200 },
      { name: "quantity", type: "number" },
      { name: "unit", type: "text", max: 40 },
      { name: "requester", type: "text", max: 120 },
      { name: "required_date", type: "date" },
      { name: "priority", type: "select", maxSelect: 1, values: ["low", "medium", "high", "critical"] },
      { name: "reason", type: "text", max: 1000 },
      { name: "requested_for", type: "text", max: 200 },
      { name: "status", type: "select", required: true, maxSelect: 1, values: ["pending", "under_review", "approved", "rejected", "ordered", "issued", "closed"] },
      { name: "attachments", type: "file", maxSelect: 10, maxSize: 26214400, mimeTypes: ["image/jpeg", "image/png", "application/pdf"] },
      created, updated,
    ], true);

    make("hse_weather", [
      rel(companies.id), proj, site,
      { name: "recorded_at", type: "date", required: true },
      { name: "temperature", type: "number" },
      { name: "humidity", type: "number" },
      { name: "wind_speed", type: "number" },
      { name: "wind_direction", type: "text", max: 40 },
      { name: "wbgt", type: "number" },
      { name: "dust", type: "text", max: 80 },
      { name: "noise", type: "number" },
      { name: "instrument_source", type: "text", max: 160 },
      { name: "remarks", type: "text", max: 1000 },
      { name: "attachments", type: "file", maxSelect: 5, maxSize: 26214400, mimeTypes: ["image/jpeg", "image/png", "application/pdf"] },
      created, updated,
    ], false);
  },
  (app) => {
    for (const name of ["hse_weather", "hse_material_requests", "hse_documents", "hse_toolbox_talks", "hse_training"]) {
      try {
        app.delete(app.findCollectionByNameOrId(name));
      } catch (e) {
        if (e.message && e.message.includes("no rows in result set")) continue;
        throw e;
      }
    }
  },
);
