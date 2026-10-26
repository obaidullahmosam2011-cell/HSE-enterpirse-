migrate((app) => {
  // Single-company mode: public registration is disabled.
  // Super Admin can create employee accounts from the authenticated admin UI.
  const users = app.findCollectionByNameOrId('hse_users');
  users.createRule = "@request.auth.role = 'super_admin'";
  app.save(users);
}, (app) => {
  // Rollback to the previous rule if this migration is reverted.
  const users = app.findCollectionByNameOrId('hse_users');
  users.createRule = "(@request.body.role:isset = false || @request.body.role = 'employee') && (@request.body.status:isset = false || @request.body.status = 'active')";
  app.save(users);
});
