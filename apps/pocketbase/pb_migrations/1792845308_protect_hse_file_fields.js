/// <reference path="../pb_data/types.d.ts" />

// SYNVOSA HSE PORTAL — security fix: protect HSE file fields.
//
// Previously every file field on the HSE record/document collections was
// PUBLIC: a direct, unauthenticated GET to
//   /api/files/<collection>/<recordId>/<filename>
// returned the file regardless of who the caller was. That exposed
// confidential HSE documents, accident/incident photos, certificates,
// risk-assessment attachments, etc. to anyone with the URL.
//
// Setting `protected: true` on a file field makes PocketBase authorize the
// file download against the collection's `viewRule`. Every HSE record
// collection's viewRule already enforces company-scoped access:
//   super_admin OR (authenticated && caller.company = record.company)
// so protected files are now only delivered to authenticated users who are
// permitted to view the owning record — exactly the same authorization as
// the record data itself.
//
// Scope: only HSE record/document file fields are protected. The user avatar
// (hse_users.avatar) and company logo (hse_companies.logo) are intentionally
// left public because they are rendered as <img src> in the portal UI without
// an auth token and are not confidential HSE documents. No data, schema, or
// other access rules are changed.

migrate(
  (app) => {
    // collection -> [file field names]
    const targets = {
      hse_documents: ["file"],
      hse_master_library: ["file"],
      hse_accidents: ["photos"],
      hse_incidents: ["photos"],
      hse_near_misses: ["photos"],
      hse_observations: ["photos"],
      hse_inspections: ["photos"],
      hse_equipment: ["photos", "certificates"],
      hse_corrective_actions: ["attachments"],
      hse_risk_assessments: ["attachments"],
      hse_training: ["materials", "certificates"],
      hse_toolbox_talks: ["evidence"],
      hse_material_requests: ["attachments"],
      hse_weather: ["attachments"],
    };

    for (const [collectionName, fieldNames] of Object.entries(targets)) {
      let collection;
      try {
        collection = app.findCollectionByNameOrId(collectionName);
      } catch (_) {
        // Collection may not exist on this environment — skip safely.
        continue;
      }
      let changed = false;
      for (const fieldName of fieldNames) {
        let field;
        try {
          field = collection.fields.getByName(fieldName);
        } catch (_) {
          continue;
        }
        if (field && !field.protected) {
          field.protected = true;
          changed = true;
        }
      }
      if (changed) {
        app.save(collection);
      }
    }
  },
  (app) => {
    // Revert: set protected back to false on every targeted field.
    const targets = {
      hse_documents: ["file"],
      hse_master_library: ["file"],
      hse_accidents: ["photos"],
      hse_incidents: ["photos"],
      hse_near_misses: ["photos"],
      hse_observations: ["photos"],
      hse_inspections: ["photos"],
      hse_equipment: ["photos", "certificates"],
      hse_corrective_actions: ["attachments"],
      hse_risk_assessments: ["attachments"],
      hse_training: ["materials", "certificates"],
      hse_toolbox_talks: ["evidence"],
      hse_material_requests: ["attachments"],
      hse_weather: ["attachments"],
    };

    for (const [collectionName, fieldNames] of Object.entries(targets)) {
      let collection;
      try {
        collection = app.findCollectionByNameOrId(collectionName);
      } catch (_) {
        continue;
      }
      let changed = false;
      for (const fieldName of fieldNames) {
        let field;
        try {
          field = collection.fields.getByName(fieldName);
        } catch (_) {
          continue;
        }
        if (field && field.protected) {
          field.protected = false;
          changed = true;
        }
      }
      if (changed) {
        app.save(collection);
      }
    }
  },
);
