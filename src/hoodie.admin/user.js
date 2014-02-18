function hoodieAdminUser( hoodieAdmin ) {
  hoodieAdmin.user = hoodieAdmin.open('_users');
}

module.exports = hoodieAdminUser;
