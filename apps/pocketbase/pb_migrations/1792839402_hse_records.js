/// <reference path="../pb_data/types.d.ts" />

// SYNVOSA HSE PORTAL — part 3: daily reports + HSE records (observations,
// accidents, incidents, near misses). Company-scoped isolation.

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
    const photos = { name: "photos", type: "file", maxSelect: 10, maxSize: 26214400, mimeTypes: ["image/jpeg", "image/png", "image/webp"] };

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

    make("hse_daily_reports", [
      rel(companies.id), proj, site,
      { name: "reference", type: "text", required: true, max: 60 },
      { name: "report_date", type: "date", required: true },
      { name: "client", type: "text", max: 200 },
      { name: "shift", type: "select", maxSelect: 1, values: ["day", "night", "split"] },
      { name: "reporting_officer", type: "text", max: 120 },
      { name: "start_time", type: "text", max: 10 },
      { name: "finish_time", type: "text", max: 10 },
      { name: "manpower", type: "json", maxSize: 200000 },
      { name: "total_manhours", type: "number" },
      { name: "activities", type: "json", maxSize: 500000 },
      { name: "equipment_used", type: "json", maxSize: 500000 },
      { name: "ppe_compliance", type: "bool" },
      { name: "housekeeping", type: "select", maxSelect: 1, values: ["good", "fair", "poor"] },
      { name: "environmental_conditions", type: "text", max: 1000 },
      { name: "remarks", type: "text", max: 2000 },
      { name: "status", type: "select", required: true, maxSelect: 1, values: ["draft", "submitted", "under_review", "approved", "returned"] },
      created, updated,
    ], true);

    make("hse_observations", [
      rel(companies.id), proj, site,
      { name: "reference", type: "text", required: true, max: 60 },
      { name: "observed_at", type: "date", required: true },
      { name: "observer", type: "text", max: 120 },
      { name: "location", type: "text", max: 300 },
      { name: "observation_type", type: "select", maxSelect: 1, values: ["Unsafe Act", "Unsafe Condition", "LSR Violation", "Misbehavior", "Positive Observation", "Environmental Observation", "Unsafe Equipment", "Procedure Violation", "Other"] },
      { name: "category", type: "text", max: 120 },
      { name: "description", type: "text", required: true, max: 2000 },
      { name: "immediate_action", type: "text", max: 1000 },
      { name: "risk_level", type: "select", maxSelect: 1, values: ["low", "medium", "high", "critical"] },
      { name: "responsible_person", type: "text", max: 120 },
      { name: "target_date", type: "date" },
      { name: "status", type: "select", required: true, maxSelect: 1, values: ["open", "in_progress", "closed"] },
      { name: "closure_evidence", type: "text", max: 1000 },
      photos, created, updated,
    ], true);

    make("hse_accidents", [
      rel(companies.id), proj, site,
      { name: "reference", type: "text", required: true, max: 60 },
      { name: "occurred_at", type: "date", required: true },
      { name: "location", type: "text", max: 300 },
      { name: "reporter", type: "text", max: 120 },
      { name: "accident_type", type: "text", max: 120 },
      { name: "description", type: "text", required: true, max: 2000 },
      { name: "activity", type: "text", max: 300 },
      { name: "equipment_vehicle", type: "text", max: 200 },
      { name: "injured_person", type: "text", max: 160 },
      { name: "injury_type_body_part", type: "text", max: 300 },
      { name: "treatment", type: "text", max: 500 },
      { name: "medical_referral", type: "bool" },
      { name: "lost_days", type: "number", onlyInt: true },
      { name: "witnesses", type: "text", max: 500 },
      { name: "immediate_action", type: "text", max: 1000 },
      { name: "investigation", type: "text", max: 2000 },
      { name: "root_cause", type: "text", max: 1000 },
      { name: "corrective_actions", type: "text", max: 2000 },
      { name: "responsible_person", type: "text", max: 120 },
      { name: "deadline", type: "date" },
      { name: "status", type: "select", required: true, maxSelect: 1, values: ["open", "investigating", "closed"] },
      photos, created, updated,
    ], true);

    make("hse_incidents", [
      rel(companies.id), proj, site,
      { name: "reference", type: "text", required: true, max: 60 },
      { name: "occurred_at", type: "date", required: true },
      { name: "location", type: "text", max: 300 },
      { name: "category", type: "text", max: 120 },
      { name: "description", type: "text", required: true, max: 2000 },
      { name: "activity", type: "text", max: 300 },
      { name: "actual_consequence", type: "text", max: 1000 },
      { name: "potential_consequence", type: "text", max: 1000 },
      { name: "affected", type: "text", max: 500 },
      { name: "immediate_response", type: "text", max: 1000 },
      { name: "risk_severity", type: "select", maxSelect: 1, values: ["minor", "moderate", "major", "significant"] },
      { name: "witnesses", type: "text", max: 500 },
      { name: "investigation_findings", type: "text", max: 2000 },
      { name: "root_cause", type: "text", max: 1000 },
      { name: "corrective_actions", type: "text", max: 2000 },
      { name: "status", type: "select", required: true, maxSelect: 1, values: ["open", "investigating", "closed"] },
      photos, created, updated,
    ], true);

    make("hse_near_misses", [
      rel(companies.id), proj, site,
      { name: "reference", type: "text", required: true, max: 60 },
      { name: "occurred_at", type: "date", required: true },
      { name: "location", type: "text", max: 300 },
      { name: "reporter", type: "text", max: 120 },
      { name: "activity", type: "text", max: 300 },
      { name: "category", type: "select", maxSelect: 1, values: ["Falling Objects", "Vehicle Movement", "Lifting", "Electrical", "Slips/Trips/Falls", "Working at Height", "Other"] },
      { name: "what_happened", type: "text", required: true, max: 2000 },
      { name: "what_could_have_happened", type: "text", max: 2000 },
      { name: "potential_severity", type: "select", maxSelect: 1, values: ["minor", "moderate", "major", "significant"] },
      { name: "immediate_action", type: "text", max: 1000 },
      { name: "responsible_person", type: "text", max: 120 },
      { name: "due_date", type: "date" },
      { name: "corrective_action", type: "text", max: 2000 },
      { name: "status", type: "select", required: true, maxSelect: 1, values: ["open", "in_progress", "closed"] },
      photos, created, updated,
    ], true);
  },
  (app) => {
    for (const name of ["hse_near_misses", "hse_incidents", "hse_accidents", "hse_observations", "hse_daily_reports"]) {
      try {
        app.delete(app.findCollectionByNameOrId(name));
      } catch (e) {
        if (e.message && e.message.includes("no rows in result set")) continue;
        throw e;
      }
    }
  },
);
