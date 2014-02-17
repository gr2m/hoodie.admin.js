// HoodieAdmin Account
// ===================

var hoodieEvents = require('../../node_modules/hoodie/src/hoodie/events');

function hoodieAccount (hoodieAdmin) {

  // public API
  var account = {};

  // add events API
  hoodieEvents(hoodieAdmin, { context: account, namespace: 'account'});

  
  // sign in with password
  // ----------------------------------

  // username is hardcoded to "admin"
  account.signIn = function signIn(/*password*/) {
    return hoodieAdmin.rejectWith('not yet implemented');
  };


  // sign out
  // ---------

  //
  account.signOut = function signOut() {
    return hoodieAdmin.rejectWith('not yet implemented');
  };

  hoodieAdmin.account = account;
}

module.exports = hoodieAccount;
