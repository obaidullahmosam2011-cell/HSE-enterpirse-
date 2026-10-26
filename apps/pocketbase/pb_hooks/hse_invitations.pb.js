/// <reference path="../pb_data/types.d.ts" />

// SYNVOSA HSE Portal — secure multi-company invitation system.
//
// Custom routes (all under /hse-invitations/*):
//   POST /hse-invitations/create-company  — Super Admin: create company + invite its Company Admin
//   POST /hse-invitations/invite-user    — Super Admin / Company Admin: invite a user to a company
//   POST /hse-invitations/accept          — Public: validate token + set password + activate account
//   POST /hse-invitations/resend          — Super Admin / Company Admin: new token + reset expiry + re-email
//   POST /hse-invitations/revoke          — Super Admin / Company Admin: revoke a pending invitation
//
// Security:
//   - Tokens are 48-char random strings, hashed with $security.sha256 when
//     available (raw otherwise). Single-use, 7-day expiry, bound to
//     email/company/intended_role. Validated server-side only.
//   - Account creation happens server-side ($app.save) and bypasses the public
//     createRule that locks public registration to the "employee" role, so only
//     the invitation flow can grant company_admin (and never super_admin).
//   - The token field is redacted from every API response via onRecordEnrich.
//   - Company Admins may only invite users to their own company, and only with
//     permitted (non-super_admin, non-company_admin) roles.
//
// Email delivery uses the platform relay ($app.newMailClient().send), which
// works out of the box. If a send fails, the route still returns the
// invitation id so the admin can share the link manually from the UI.

// Redact the token from all hse_invitations API responses.
onRecordEnrich((e) => {
  e.record.hide("token");
  e.next();
}, "hse_invitations");

// ---------------------------------------------------------------------------
// POST /hse-invitations/create-company  (Super Admin only)
// ---------------------------------------------------------------------------
routerAdd("POST", "/hse-invitations/create-company", (e) => {
  const info = e.requestInfo();
  const auth = info.auth;
  if (
    !auth ||
    auth.collection().name !== "hse_users" ||
    auth.getString("role") !== "super_admin"
  ) {
    throw new BadRequestError("Super Admin authentication is required.");
  }

  const body = info.body || {};
  const companyName = (body.company_name || "").toString().trim();
  const adminFullName = (body.admin_full_name || "").toString().trim();
  const adminEmail = (body.admin_email || "").toString().trim().toLowerCase();
  const code = (body.code || "").toString().trim();
  const crNumber = (body.cr_number || "").toString().trim();
  const phone = (body.phone || "").toString().trim();
  const coEmail = (body.email || "").toString().trim();
  const address = (body.address || "").toString().trim();
  const city = (body.city || "").toString().trim();
  const country = (body.country || "").toString().trim();

  if (!companyName || !adminFullName || !adminEmail) {
    throw new BadRequestError(
      "Company name, admin full name and admin email are required.",
    );
  }
  if (adminEmail.indexOf("@") === -1 || adminEmail.indexOf(".") === -1) {
    throw new BadRequestError("A valid admin email is required.");
  }

  // Reject if a user already exists for this email.
  const existingUsers = $app.findRecordsByFilter(
    "hse_users",
    "email = {:email}",
    "",
    1,
    0,
    { email: adminEmail },
  );
  if (existingUsers.length > 0) {
    throw new BadRequestError(
      "A user with this email already exists. Use User Management to manage it.",
    );
  }

  // Company code (auto-generated if absent), kept unique.
  let finalCode = code;
  if (!finalCode) {
    finalCode = companyName
      .replace(/[^a-zA-Z0-9]/g, "")
      .substring(0, 8)
      .toUpperCase();
    if (!finalCode) finalCode = "CO" + Date.now().toString().slice(-6);
  }
  const codeClash = $app.findRecordsByFilter(
    "hse_companies",
    "code = {:code}",
    "",
    1,
    0,
    { code: finalCode },
  );
  if (codeClash.length > 0) {
    finalCode = finalCode + Date.now().toString().slice(-3);
  }

  // Create the company.
  const companiesCol = $app.findCollectionByNameOrId("hse_companies");
  const company = new Record(companiesCol);
  company.set("name", companyName);
  company.set("code", finalCode);
  if (crNumber) company.set("cr_number", crNumber);
  if (phone) company.set("phone", phone);
  if (coEmail) company.set("email", coEmail);
  if (address) company.set("address", address);
  if (city) company.set("city", city);
  if (country) company.set("country", country);
  company.set("status", "active");
  $app.save(company);

  // Build the invitation.
  const genToken = () => {
    try {
      return $security.token(48);
    } catch (_) {}
    const alphabet =
      "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let s = "";
    for (let i = 0; i < 48; i++) {
      s += alphabet.charAt(Math.floor(Math.random() * alphabet.length));
    }
    return s;
  };
  const hashToken = (t) => {
    try {
      return $security.sha256(t);
    } catch (_) {
      return t;
    }
  };

  const rawToken = genToken();
  const storedToken = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + 168 * 3600 * 1000);

  const invCol = $app.findCollectionByNameOrId("hse_invitations");
  const inv = new Record(invCol);
  inv.set("email", adminEmail);
  inv.set("full_name", adminFullName);
  inv.set("company", company.id);
  inv.set("intended_role", "company_admin");
  inv.set("token", storedToken);
  inv.set("expires_at", expiresAt.toISOString());
  inv.set("used", false);
  inv.set("revoked", false);
  inv.set("created_by", auth.id);
  $app.save(inv);

  // Send the invitation email via the platform relay.
  // meta.appURL points at the PocketBase API base (origin + "/hcgi/platform").
  // The activation page is a React route on the website origin, so strip the
  // "/hcgi/platform" suffix to build a link that resolves to the site, not PB.
  const siteOrigin = ($app.settings().meta.appURL || "").replace(/\/hcgi\/platform\/?$/, "");
  const inviteLink = siteOrigin + "/hse/accept-invitation?token=" + rawToken;
  const message = new MailerMessage({
    from: { name: "SYNVOSA HSE Portal" },
    to: [{ address: adminEmail }],
    subject:
      "You're invited to join SYNVOSA HSE Portal as Company Admin",
    html:
      "<h2>You've been invited</h2>" +
      "<p>Hi " + adminFullName + ",</p>" +
      "<p>You have been invited to join the <strong>SYNVOSA HSE Enterprise Portal</strong> as the <strong>Company Admin</strong> for <strong>" + companyName + "</strong>.</p>" +
      "<p>As Company Admin you will manage your company's HSE records, users, projects, documents and settings.</p>" +
      "<p>To activate your account, set your own password using the link below. The link is valid for 7 days and can be used only once:</p>" +
      "<p><a href=\"" + inviteLink + "\">Activate my account</a></p>" +
      "<p>If the button doesn't work, copy and paste this link into your browser:</p>" +
      "<p style=\"word-break:break-all\">" + inviteLink + "</p>" +
      "<p>If you did not expect this invitation, you can safely ignore this email.</p>" +
      "<p>— SYNVOSA Integrated Company</p>",
  });

  let emailSent = true;
  let emailError = "";
  try {
    $app.newMailClient().send(message);
  } catch (err) {
    emailSent = false;
    emailError = String(err);
    $app.logger().error(
      "invitation email failed",
      "to",
      adminEmail,
      "err",
      emailError,
    );
  }

  e.json(200, {
    success: true,
    company_id: company.id,
    company_name: companyName,
    company_code: finalCode,
    invitation_id: inv.id,
    email_sent: emailSent,
    email_error: emailError,
    message: emailSent
      ? "Company created and invitation email sent to " + adminEmail + "."
      : "Company and invitation created, but the email could not be sent. Share the invitation link from the Invitations page.",
  });
});

// ---------------------------------------------------------------------------
// POST /hse-invitations/invite-user  (Super Admin or Company Admin)
// ---------------------------------------------------------------------------
routerAdd("POST", "/hse-invitations/invite-user", (e) => {
  const info = e.requestInfo();
  const auth = info.auth;
  if (!auth || auth.collection().name !== "hse_users") {
    throw new BadRequestError("Authentication is required.");
  }
  const role = auth.getString("role");

  const body = info.body || {};
  const fullName = (body.full_name || "").toString().trim();
  const email = (body.email || "").toString().trim().toLowerCase();
  const intendedRole = (body.intended_role || "").toString().trim();

  const permittedRoles = [
    "company_admin",
    "hse_manager",
    "supervisor",
    "safety_officer",
    "employee",
  ];
  if (permittedRoles.indexOf(intendedRole) === -1) {
    throw new BadRequestError("Invalid or unsupported role.");
  }
  if (!fullName || !email) {
    throw new BadRequestError("Full name and email are required.");
  }
  if (email.indexOf("@") === -1 || email.indexOf(".") === -1) {
    throw new BadRequestError("A valid email is required.");
  }

  // Determine the target company + enforce role scoping.
  let companyId;
  if (role === "super_admin") {
    companyId = (body.company || "").toString();
    if (!companyId) {
      throw new BadRequestError("A target company is required.");
    }
  } else if (role === "company_admin") {
    companyId = auth.getString("company");
    if (!companyId) {
      throw new BadRequestError("Your account is not assigned to a company.");
    }
    // Company Admins cannot grant company_admin (or super_admin).
    if (intendedRole === "company_admin") {
      throw new BadRequestError(
        "Only a Super Admin can assign the Company Admin role.",
      );
    }
  } else {
    throw new BadRequestError("You do not have permission to send invitations.");
  }

  // No duplicate user / pending invitation for the same email+company.
  const existingUsers = $app.findRecordsByFilter(
    "hse_users",
    "email = {:email}",
    "",
    1,
    0,
    { email: email },
  );
  if (existingUsers.length > 0) {
    throw new BadRequestError("A user with this email already exists.");
  }

  // Revoke any prior pending, unused invitation for this email+company.
  const prior = $app.findRecordsByFilter(
    "hse_invitations",
    "email = {:email} && company = {:company} && used = false",
    "-created",
    50,
    0,
    { email: email, company: companyId },
  );
  for (let i = 0; i < prior.length; i++) {
    const p = prior[i];
    p.set("revoked", true);
    $app.save(p);
  }

  const genToken = () => {
    try {
      return $security.token(48);
    } catch (_) {}
    const alphabet =
      "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let s = "";
    for (let i = 0; i < 48; i++) {
      s += alphabet.charAt(Math.floor(Math.random() * alphabet.length));
    }
    return s;
  };
  const hashToken = (t) => {
    try {
      return $security.sha256(t);
    } catch (_) {
      return t;
    }
  };

  const rawToken = genToken();
  const storedToken = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + 168 * 3600 * 1000);

  const invCol = $app.findCollectionByNameOrId("hse_invitations");
  const inv = new Record(invCol);
  inv.set("email", email);
  inv.set("full_name", fullName);
  inv.set("company", companyId);
  inv.set("intended_role", intendedRole);
  inv.set("token", storedToken);
  inv.set("expires_at", expiresAt.toISOString());
  inv.set("used", false);
  inv.set("revoked", false);
  inv.set("created_by", auth.id);
  $app.save(inv);

  // Resolve company name for the email body.
  let companyName = "your company";
  try {
    const company = $app.findRecordById("hse_companies", companyId);
    companyName = company.getString("name");
  } catch (_) {}

  const siteOrigin = ($app.settings().meta.appURL || "").replace(/\/hcgi\/platform\/?$/, "");
  const inviteLink = siteOrigin + "/hse/accept-invitation?token=" + rawToken;
  const roleLabel = intendedRole.replace(/_/g, " ");
  const message = new MailerMessage({
    from: { name: "SYNVOSA HSE Portal" },
    to: [{ address: email }],
    subject: "You're invited to join SYNVOSA HSE Portal",
    html:
      "<h2>You've been invited</h2>" +
      "<p>Hi " + fullName + ",</p>" +
      "<p>You have been invited to join the <strong>SYNVOSA HSE Enterprise Portal</strong> as <strong>" + roleLabel + "</strong> for <strong>" + companyName + "</strong>.</p>" +
      "<p>To activate your account, set your own password using the link below. The link is valid for 7 days and can be used only once:</p>" +
      "<p><a href=\"" + inviteLink + "\">Activate my account</a></p>" +
      "<p style=\"word-break:break-all\">" + inviteLink + "</p>" +
      "<p>If you did not expect this invitation, you can safely ignore this email.</p>" +
      "<p>— SYNVOSA Integrated Company</p>",
  });

  let emailSent = true;
  let emailError = "";
  try {
    $app.newMailClient().send(message);
  } catch (err) {
    emailSent = false;
    emailError = String(err);
    $app.logger().error("invitation email failed", "to", email, "err", emailError);
  }

  e.json(200, {
    success: true,
    invitation_id: inv.id,
    email_sent: emailSent,
    email_error: emailError,
    message: emailSent
      ? "Invitation sent to " + email + "."
      : "Invitation created, but the email could not be sent. Share the link from the Invitations page.",
  });
});

// ---------------------------------------------------------------------------
// POST /hse-invitations/accept  (Public)
// ---------------------------------------------------------------------------
routerAdd("POST", "/hse-invitations/accept", (e) => {
  const info = e.requestInfo();
  const body = info.body || {};
  const token = (body.token || "").toString();
  const password = (body.password || "").toString();
  const passwordConfirm = (body.passwordConfirm || "").toString();

  if (!token || !password) {
    throw new BadRequestError("Token and password are required.");
  }
  if (password.length < 10) {
    throw new BadRequestError("Password must be at least 10 characters.");
  }
  if (
    !/[a-z]/.test(password) ||
    !/[A-Z]/.test(password) ||
    !/[0-9]/.test(password) ||
    !/[^A-Za-z0-9]/.test(password)
  ) {
    throw new BadRequestError(
      "Password needs upper- and lower-case letters, a number, and a symbol.",
    );
  }
  if (password !== passwordConfirm) {
    throw new BadRequestError("Passwords do not match.");
  }

  const hashToken = (t) => {
    try {
      return $security.sha256(t);
    } catch (_) {
      return t;
    }
  };

  const storedToken = hashToken(token);
  const invs = $app.findRecordsByFilter(
    "hse_invitations",
    "token = {:token}",
    "",
    1,
    0,
    { token: storedToken },
  );
  if (invs.length === 0) {
    throw new BadRequestError("Invalid or unknown invitation token.");
  }
  const inv = invs[0];

  if (inv.getBool("used")) {
    throw new BadRequestError("This invitation has already been used.");
  }
  if (inv.getBool("revoked")) {
    throw new BadRequestError("This invitation has been revoked.");
  }
  const expiresAtStr = inv.getString("expires_at");
  if (expiresAtStr) {
    const exp = new Date(expiresAtStr);
    if (!isNaN(exp.getTime()) && exp.getTime() < Date.now()) {
      throw new BadRequestError(
        "This invitation has expired. Please request a new invitation.",
      );
    }
  }

  const email = inv.getString("email");
  const fullName = inv.getString("full_name");
  const companyId = inv.getString("company");
  const intendedRole = inv.getString("intended_role");

  // Guard against a race: no existing user with this email.
  const existing = $app.findRecordsByFilter(
    "hse_users",
    "email = {:email}",
    "",
    1,
    0,
    { email: email },
  );
  if (existing.length > 0) {
    throw new BadRequestError("A user with this email already exists.");
  }

  // Create the account server-side (bypasses the public employee-only
  // createRule). Never grants super_admin.
  const usersCol = $app.findCollectionByNameOrId("hse_users");
  const user = new Record(usersCol);
  user.setEmail(email);
  user.setPassword(password);
  user.set("full_name", fullName);
  user.set("role", intendedRole);
  user.set("status", "active");
  user.set("company", companyId);
  user.set("verified", true);
  $app.save(user);

  // Mark the invitation consumed.
  inv.set("used", true);
  inv.set("accepted_at", new Date().toISOString());
  inv.set("accepted_user", user.id);
  $app.save(inv);

  e.json(200, {
    success: true,
    message: "Account activated. You can now sign in.",
    email: email,
    role: intendedRole,
  });
});

// ---------------------------------------------------------------------------
// POST /hse-invitations/resend  (Super Admin or Company Admin)
// ---------------------------------------------------------------------------
routerAdd("POST", "/hse-invitations/resend", (e) => {
  const info = e.requestInfo();
  const auth = info.auth;
  if (!auth || auth.collection().name !== "hse_users") {
    throw new BadRequestError("Authentication is required.");
  }
  const role = auth.getString("role");
  const body = info.body || {};
  const invitationId = (body.invitation_id || "").toString();
  if (!invitationId) {
    throw new BadRequestError("invitation_id is required.");
  }

  let inv;
  try {
    inv = $app.findRecordById("hse_invitations", invitationId);
  } catch (_) {
    throw new BadRequestError("Invitation not found.");
  }

  const invCompany = inv.getString("company");
  if (role !== "super_admin") {
    if (role !== "company_admin" || auth.getString("company") !== invCompany) {
      throw new BadRequestError(
        "You do not have permission to resend this invitation.",
      );
    }
  }
  if (inv.getBool("used")) {
    throw new BadRequestError("This invitation has already been used.");
  }

  const genToken = () => {
    try {
      return $security.token(48);
    } catch (_) {}
    const alphabet =
      "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let s = "";
    for (let i = 0; i < 48; i++) {
      s += alphabet.charAt(Math.floor(Math.random() * alphabet.length));
    }
    return s;
  };
  const hashToken = (t) => {
    try {
      return $security.sha256(t);
    } catch (_) {
      return t;
    }
  };

  const rawToken = genToken();
  const storedToken = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + 168 * 3600 * 1000);
  inv.set("token", storedToken);
  inv.set("expires_at", expiresAt.toISOString());
  inv.set("revoked", false);
  $app.save(inv);

  let companyName = "your company";
  try {
    const company = $app.findRecordById("hse_companies", invCompany);
    companyName = company.getString("name");
  } catch (_) {}

  const siteOrigin = ($app.settings().meta.appURL || "").replace(/\/hcgi\/platform\/?$/, "");
  const inviteLink = siteOrigin + "/hse/accept-invitation?token=" + rawToken;
  const fullName = inv.getString("full_name");
  const email = inv.getString("email");
  const message = new MailerMessage({
    from: { name: "SYNVOSA HSE Portal" },
    to: [{ address: email }],
    subject: "Reminder: activate your SYNVOSA HSE Portal account",
    html:
      "<h2>Your invitation was re-sent</h2>" +
      "<p>Hi " + fullName + ",</p>" +
      "<p>This is a reminder to activate your account on the <strong>SYNVOSA HSE Enterprise Portal</strong> for <strong>" + companyName + "</strong>.</p>" +
      "<p>Set your own password using the link below (valid 7 days, single use):</p>" +
      "<p><a href=\"" + inviteLink + "\">Activate my account</a></p>" +
      "<p style=\"word-break:break-all\">" + inviteLink + "</p>" +
      "<p>— SYNVOSA Integrated Company</p>",
  });

  let emailSent = true;
  let emailError = "";
  try {
    $app.newMailClient().send(message);
  } catch (err) {
    emailSent = false;
    emailError = String(err);
    $app.logger().error("invitation resend failed", "to", email, "err", emailError);
  }

  e.json(200, {
    success: true,
    email_sent: emailSent,
    email_error: emailError,
    message: emailSent
      ? "Invitation re-sent to " + email + "."
      : "Token refreshed, but the email could not be sent. Share the link from the Invitations page.",
  });
});

// ---------------------------------------------------------------------------
// POST /hse-invitations/revoke  (Super Admin or Company Admin)
// ---------------------------------------------------------------------------
routerAdd("POST", "/hse-invitations/revoke", (e) => {
  const info = e.requestInfo();
  const auth = info.auth;
  if (!auth || auth.collection().name !== "hse_users") {
    throw new BadRequestError("Authentication is required.");
  }
  const role = auth.getString("role");
  const body = info.body || {};
  const invitationId = (body.invitation_id || "").toString();
  if (!invitationId) {
    throw new BadRequestError("invitation_id is required.");
  }

  let inv;
  try {
    inv = $app.findRecordById("hse_invitations", invitationId);
  } catch (_) {
    throw new BadRequestError("Invitation not found.");
  }

  const invCompany = inv.getString("company");
  if (role !== "super_admin") {
    if (role !== "company_admin" || auth.getString("company") !== invCompany) {
      throw new BadRequestError(
        "You do not have permission to revoke this invitation.",
      );
    }
  }
  if (inv.getBool("used")) {
    throw new BadRequestError("This invitation has already been used.");
  }

  inv.set("revoked", true);
  $app.save(inv);

  e.json(200, { success: true, message: "Invitation revoked." });
});

// ---------------------------------------------------------------------------
// Module-toggle enforcement.
// When a Company Admin / user creates a record in a module collection, the
// owning company's enabled_modules (JSON array) is consulted; if the module is
// disabled, the create is rejected. Super Admin bypasses. null/empty array =
// all modules enabled. Only the *Request variant fires for API calls.
// ---------------------------------------------------------------------------
onRecordCreateRequest((e) => {
  const MODULE_BY_COLLECTION = {
    hse_daily_reports: "daily-reports",
    hse_observations: "observations",
    hse_accidents: "accidents",
    hse_incidents: "incidents",
    hse_near_misses: "near-misses",
    hse_inspections: "inspections",
    hse_equipment: "equipment",
    hse_risk_assessments: "risk-assessments",
    hse_corrective_actions: "corrective-actions",
    hse_training: "training",
    hse_toolbox_talks: "toolbox-talks",
    hse_documents: "documents",
    hse_material_requests: "material-requests",
    hse_weather: "weather",
    hse_calendar: "calendar",
    hse_projects: "projects",
    hse_employees: "employees",
  };
  const auth = e.requestInfo().auth;
  if (!auth || auth.collection().name !== "hse_users") {
    e.next();
    return;
  }
  if (auth.getString("role") === "super_admin") {
    e.next();
    return;
  }
  const moduleKey = MODULE_BY_COLLECTION[e.record.collection().name];
  if (!moduleKey) {
    e.next();
    return;
  }
  const companyId = auth.getString("company");
  if (!companyId) {
    e.next();
    return;
  }
  let company;
  try {
    company = $app.findRecordById("hse_companies", companyId);
  } catch (_) {
    e.next();
    return;
  }
  let enabled = company.get("enabled_modules");
  if (!enabled) {
    e.next();
    return;
  }
  let arr = null;
  try {
    arr = JSON.parse(JSON.stringify(enabled));
  } catch (_) {
    arr = null;
  }
  if (Array.isArray(arr) && arr.length > 0 && arr.indexOf(moduleKey) === -1) {
    throw new BadRequestError(
      "This module is not enabled for your company. Contact your Company Admin.",
    );
  }
  e.next();
}, "hse_daily_reports", "hse_observations", "hse_accidents", "hse_incidents", "hse_near_misses", "hse_inspections", "hse_equipment", "hse_risk_assessments", "hse_corrective_actions", "hse_training", "hse_toolbox_talks", "hse_documents", "hse_material_requests", "hse_weather", "hse_calendar", "hse_projects", "hse_employees");
