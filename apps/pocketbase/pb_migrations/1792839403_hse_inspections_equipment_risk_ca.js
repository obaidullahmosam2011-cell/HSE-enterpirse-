/// <reference path="../pb_data/types.d.ts" />

// SYNVOSA HSE PORTAL — part 4: inspections, equipment, risk assessments,
// corrective actions. Company-scoped isolation.

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

    make("hse_inspections", [
      rel(companies.id), proj, site,
      { name: "reference", type: "text", required: true, max: 60 },
      { name: "inspection_type", type: "select", maxSelect: 1, values: ["General HSE Inspection", "Workshop", "Heavy Equipment", "Lifting Equipment & Accessories", "Electrical Tools & Equipment", "Hand Tools", "Fire Fighting Equipment", "First Aid Box", "PPE", "Scaffolding", "Ladder", "Excavation & Trenching", "Work at Height", "Housekeeping", "Warehouse & Store", "Office Facilities", "Vehicle", "Environmental", "Emergency Preparedness", "Site Safety Audit", "Client-Specific HSE Audit", "Custom Inspection Checklist"] },
      { name: "inspector", type: "text", max: 120 },
      { name: "inspected_at", type: "date", required: true },
      { name: "frequency", type: "select", maxSelect: 1, values: ["daily", "weekly", "monthly", "quarterly", "annual", "custom"] },
      { name: "findings", type: "text", max: 3000 },
      { name: "checklist", type: "json", maxSize: 500000 },
      { name: "risk_level", type: "select", maxSelect: 1, values: ["low", "medium", "high", "critical"] },
      { name: "status", type: "select", required: true, maxSelect: 1, values: ["scheduled", "in_progress", "completed", "failed", "overdue"] },
      { name: "due_date", type: "date" },
      photos, created, updated,
    ], true);

    make("hse_equipment", [
      rel(companies.id), proj, site,
      { name: "equipment_id", type: "text", required: true, max: 60 },
      { name: "type", type: "text", max: 120 },
      { name: "name", type: "text", required: true, max: 200 },
      { name: "make_model", type: "text", max: 160 },
      { name: "serial_number", type: "text", max: 80 },
      { name: "responsible_person", type: "text", max: 120 },
      { name: "inspection_type", type: "text", max: 120 },
      { name: "last_inspection_date", type: "date" },
      { name: "next_inspection_date", type: "date" },
      { name: "inspection_frequency", type: "select", maxSelect: 1, values: ["daily", "weekly", "monthly", "annual", "custom"] },
      { name: "defects", type: "text", max: 1000 },
      { name: "risk", type: "select", maxSelect: 1, values: ["low", "medium", "high", "critical"] },
      { name: "status", type: "select", required: true, maxSelect: 1, values: ["pass", "pass_with_actions", "fail", "overdue", "out_of_service"] },
      { name: "sticker_expiry", type: "date" },
      { name: "remarks", type: "text", max: 1000 },
      photos,
      { name: "certificates", type: "file", maxSelect: 10, maxSize: 26214400, mimeTypes: ["application/pdf", "image/jpeg", "image/png"] },
      created, updated,
    ], false);
    // unique equipment_id per company (added separately to keep index name stable)
    try {
      const eq = app.findCollectionByNameOrId("hse_equipment");
      eq.indexes = eq.indexes || [];
      const has = (eq.indexes || []).some((i) => i.indexOf("idx_hse_equipment_id") !== -1);
      if (!has) {
        eq.indexes.push("CREATE UNIQUE INDEX idx_hse_equipment_id ON hse_equipment (company, equipment_id)");
        app.save(eq);
      }
    } catch (e) { if (!e.message.includes("no rows")) throw e; }

    make("hse_risk_assessments", [
      rel(companies.id), proj, site,
      { name: "reference", type: "text", required: true, max: 60 },
      { name: "task_activity", type: "text", required: true, max: 300 },
      { name: "assessment_type", type: "select", maxSelect: 1, values: ["Risk Assessment", "Job Safety Analysis (JSA)"] },
      { name: "assessment_date", type: "date", required: true },
      { name: "review_date", type: "date" },
      { name: "hazards", type: "text", max: 2000 },
      { name: "consequences", type: "text", max: 2000 },
      { name: "likelihood", type: "select", maxSelect: 1, values: ["L1", "L2", "L3", "L4", "L5"] },
      { name: "severity", type: "select", maxSelect: 1, values: ["C1", "C2", "C3", "C4", "C5"] },
      { name: "risk_rating", type: "select", maxSelect: 1, values: ["1 Significant", "2 Major", "3 Minor", "4 Insignificant"] },
      { name: "existing_controls", type: "text", max: 2000 },
      { name: "additional_controls", type: "text", max: 2000 },
      { name: "responsible_persons", type: "text", max: 300 },
      { name: "prepared_by", type: "text", max: 120 },
      { name: "reviewed_by", type: "text", max: 120 },
      { name: "approved_by", type: "text", max: 120 },
      { name: "status", type: "select", required: true, maxSelect: 1, values: ["draft", "pending_review", "approved", "rejected"] },
      { name: "attachments", type: "file", maxSelect: 10, maxSize: 26214400, mimeTypes: ["application/pdf", "image/jpeg", "image/png", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"] },
      created, updated,
    ], true);

    make("hse_corrective_actions", [
      rel(companies.id), proj, site,
      { name: "reference", type: "text", required: true, max: 60 },
      { name: "source_type", type: "select", maxSelect: 1, values: ["inspection", "observation", "incident", "accident", "near_miss", "risk_assessment", "other"] },
      { name: "source_reference", type: "text", max: 60 },
      { name: "hazard_risk", type: "text", max: 1000 },
      { name: "required_action", type: "text", required: true, max: 2000 },
      { name: "responsible_person", type: "text", max: 120 },
      { name: "deadline", type: "date" },
      { name: "priority", type: "select", maxSelect: 1, values: ["low", "medium", "high", "critical"] },
      { name: "progress", type: "text", max: 1000 },
      { name: "status", type: "select", required: true, maxSelect: 1, values: ["open", "in_progress", "submitted", "verified", "closed", "reopened"] },
      { name: "closure_evidence", type: "text", max: 1000 },
      { name: "verified_by", type: "text", max: 120 },
      { name: "attachments", type: "file", maxSelect: 10, maxSize: 26214400, mimeTypes: ["application/pdf", "image/jpeg", "image/png"] },
      created, updated,
    ], true);
  },
  (app) => {
    for (const name of ["hse_corrective_actions", "hse_risk_assessments", "hse_equipment", "hse_inspections"]) {
      try {
        app.delete(app.findCollectionByNameOrId(name));
      } catch (e) {
        if (e.message && e.message.includes("no rows in result set")) continue;
        throw e;
      }
    }
  },
);
