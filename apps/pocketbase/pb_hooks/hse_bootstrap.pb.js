/// <reference path="../pb_data/types.d.ts" />

// SYNVOSA HSE Portal — secure Super Admin provisioning endpoint.
//
// Non-public: this route is gated by a PocketBase superuser (dashboard admin)
// auth token. It is NOT reachable by anonymous users or by regular hse_users.
//
// It provisions an hse_users record with role = "super_admin" in one step:
//   - creates (or reuses) a default company so the admin can save records
//     (every HSE record collection requires a `company` relation),
//   - creates the super_admin with the caller-supplied email + password,
//     verified + active, assigned to that company.
//
// No credentials are hardcoded in source. The caller supplies email + password.
// Public self-registration on hse_users remains locked to the "employee" role
// via the collection createRule, so this endpoint is the only way to grant
// super_admin (besides the PocketBase admin dashboard, which also bypasses rules).

routerAdd("POST", "/hse-bootstrap", (e) => {
  const info = e.requestInfo();
  const auth = info.auth;
  const isSuperuser = !!(auth && auth.collection().name === "_superusers");
  if (!isSuperuser) {
    throw new BadRequestError(
      "Superuser authentication is required to provision an HSE Super Admin.",
    );
  }

  const body = info.body || {};
  const email = (body.email || "").toString().trim().toLowerCase();
  const password = (body.password || "").toString();
  const fullName = (body.full_name || "").toString().trim();
  const companyName = (body.company_name || "SYNVOSA").toString().trim();
  const companyCode = (body.company_code || "SYN").toString().trim();

  if (!email || !password || !fullName) {
    throw new BadRequestError("email, password and full_name are required.");
  }
  if (password.length < 10) {
    throw new BadRequestError("Password must be at least 10 characters.");
  }

  // Ensure at least one company exists (the default company for personal use).
  let company;
  const existing = $app.findRecordsByFilter(
    "hse_companies",
    "code != ''",
    "created",
    1,
    0,
    {},
  );
  if (existing.length > 0) {
    company = existing[0];
  } else {
    const companiesCol = $app.findCollectionByNameOrId("hse_companies");
    company = new Record(companiesCol);
    company.set("name", companyName);
    company.set("code", companyCode);
    company.set("status", "active");
    $app.save(company);
  }

  // Create the super_admin (server-side save bypasses the public createRule).
  const usersCol = $app.findCollectionByNameOrId("hse_users");
  const user = new Record(usersCol);
  user.setEmail(email);
  user.setPassword(password);
  user.set("full_name", fullName);
  user.set("role", "super_admin");
  user.set("status", "active");
  user.set("company", company.id);
  user.set("verified", true);
  $app.save(user);

  e.json(200, {
    success: true,
    id: user.id,
    email: email,
    full_name: fullName,
    role: "super_admin",
    company: company.id,
    company_name: company.getString("name"),
  });
});
