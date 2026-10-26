/// <reference path="../pb_data/types.d.ts" />

// SYNVOSA HSE PORTAL — part 2: projects, sites, employees.
// Company-scoped isolation enforced via access rules.

migrate(
  (app) => {
    const companies = app.findCollectionByNameOrId("hse_companies");
    const coList =
      "@request.auth.role = 'super_admin' || (@request.auth.id != '' && @request.auth.company != '' && @request.auth.company = company)";
    const coCreate =
      "@request.auth.role = 'super_admin' || (@request.auth.id != '' && @request.auth.company != '' && @request.auth.company = @request.body.company)";
    const coWrite =
      "@request.auth.role = 'super_admin' || (@request.auth.id != '' && @request.auth.company != '' && @request.auth.company = company)";

    // ---- hse_projects ----
    let projects;
    try {
      projects = app.findCollectionByNameOrId("hse_projects");
    } catch (_) {
      projects = new Collection({
        type: "base",
        name: "hse_projects",
        listRule: coList,
        viewRule: coList,
        createRule: coCreate,
        updateRule: coWrite,
        deleteRule: coWrite,
        fields: [
          { name: "company", type: "relation", required: true, maxSelect: 1, collectionId: companies.id, cascadeDelete: true },
          { name: "name", type: "text", required: true, max: 200 },
          { name: "client", type: "text", max: 200 },
          { name: "location", type: "text", max: 300 },
          { name: "coordinates", type: "text", max: 80 },
          { name: "start_date", type: "date" },
          { name: "end_date", type: "date" },
          { name: "project_manager", type: "text", max: 120 },
          { name: "hse_manager", type: "text", max: 120 },
          { name: "status", type: "select", maxSelect: 1, values: ["planning", "active", "on_hold", "completed", "cancelled"] },
          { name: "remarks", type: "text", max: 1000 },
          { name: "created", type: "autodate", onCreate: true, onUpdate: false },
          { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
        ],
      });
      app.save(projects);
    }

    // ---- hse_sites ----
    let sites;
    try {
      sites = app.findCollectionByNameOrId("hse_sites");
    } catch (_) {
      sites = new Collection({
        type: "base",
        name: "hse_sites",
        listRule: coList,
        viewRule: coList,
        createRule: coCreate,
        updateRule: coWrite,
        deleteRule: coWrite,
        fields: [
          { name: "company", type: "relation", required: true, maxSelect: 1, collectionId: companies.id, cascadeDelete: true },
          { name: "project", type: "relation", required: true, maxSelect: 1, collectionId: projects.id, cascadeDelete: true },
          { name: "name", type: "text", required: true, max: 200 },
          { name: "location", type: "text", max: 300 },
          { name: "coordinates", type: "text", max: 80 },
          { name: "site_manager", type: "text", max: 120 },
          { name: "status", type: "select", maxSelect: 1, values: ["active", "inactive", "mobilization", "demobilization"] },
          { name: "remarks", type: "text", max: 1000 },
          { name: "created", type: "autodate", onCreate: true, onUpdate: false },
          { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
        ],
      });
      app.save(sites);
    }

    // ---- hse_employees ----
    let employees;
    try {
      employees = app.findCollectionByNameOrId("hse_employees");
    } catch (_) {
      employees = new Collection({
        type: "base",
        name: "hse_employees",
        listRule: coList,
        viewRule: coList,
        createRule: coCreate,
        updateRule: coWrite,
        deleteRule: coWrite,
        fields: [
          { name: "company", type: "relation", required: true, maxSelect: 1, collectionId: companies.id, cascadeDelete: true },
          { name: "project", type: "relation", maxSelect: 1, collectionId: projects.id },
          { name: "site", type: "relation", maxSelect: 1, collectionId: sites.id },
          { name: "name", type: "text", required: true, max: 160 },
          { name: "employee_id", type: "text", max: 60 },
          { name: "job_title", type: "text", max: 120 },
          { name: "phone", type: "text", max: 40 },
          { name: "email", type: "email", max: 120 },
          { name: "nationality", type: "text", max: 80 },
          { name: "qualifications", type: "text", max: 1000 },
          { name: "hse_experience", type: "text", max: 1000 },
          { name: "active", type: "bool" },
          { name: "created", type: "autodate", onCreate: true, onUpdate: false },
          { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
        ],
      });
      app.save(employees);
    }
  },
  (app) => {
    for (const name of ["hse_employees", "hse_sites", "hse_projects"]) {
      try {
        app.delete(app.findCollectionByNameOrId(name));
      } catch (e) {
        if (e.message && e.message.includes("no rows in result set")) continue;
        throw e;
      }
    }
  },
);
