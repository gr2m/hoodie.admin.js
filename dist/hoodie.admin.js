!function(e){"object"==typeof exports?module.exports=e():"function"==typeof define&&define.amd?define(e):"undefined"!=typeof window?window.HoodieAdmin=e():"undefined"!=typeof global?global.HoodieAdmin=e():"undefined"!=typeof self&&(self.HoodieAdmin=e())}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
// Hoodie Error
// -------------

// With the custom hoodie error function
// we normalize all errors the get returned
// when using hoodie.rejectWith
//
// The native JavaScript error method has
// a name & a message property. HoodieError
// requires these, but on top allows for
// unlimited custom properties.
//
// Instead of being initialized with just
// the message, HoodieError expects an
// object with properites. The `message`
// property is required. The name will
// fallback to `error`.
//
// `message` can also contain placeholders
// in the form of `{{propertyName}}`` which
// will get replaced automatically with passed
// extra properties.
//
// ### Error Conventions
//
// We follow JavaScript's native error conventions,
// meaning that error names are camelCase with the
// first letter uppercase as well, and the message
// starting with an uppercase letter.
//
var errorMessageReplacePattern = /\{\{\s*\w+\s*\}\}/g;
var errorMessageFindPropertyPattern = /\w+/;
function HoodieError(properties) {

  // normalize arguments
  if (typeof properties === 'string') {
    properties = {
      message: properties
    };
  }

  if (! properties.message) {
    throw new Error('FATAL: error.message must be set');
  }

  // must check for properties, as this.name is always set.
  if (! properties.name) {
    properties.name = 'HoodieError';
  }

  properties.message = properties.message.replace(errorMessageReplacePattern, function(match) {
    var property = match.match(errorMessageFindPropertyPattern)[0];
    return properties[property];
  });

  $.extend(this, properties);
}
HoodieError.prototype = new Error();
HoodieError.prototype.constructor = HoodieError;

module.exports = HoodieError;

},{}],2:[function(require,module,exports){
// Hoodie Invalid Type Or Id Error
// -------------------------------

// only lowercase letters, numbers and dashes
// are allowed for object IDs.
//
var HoodieError = require('../error');

//
function HoodieObjectIdError(properties) {
  properties.name = 'HoodieObjectIdError';
  properties.message = '"{{id}}" is invalid object id. {{rules}}.';

  return new HoodieError(properties);
}
var validIdPattern = /^[a-z0-9\-]+$/;
HoodieObjectIdError.isInvalid = function(id, customPattern) {
  return ! (customPattern || validIdPattern).test(id || '');
};
HoodieObjectIdError.isValid = function(id, customPattern) {
  return (customPattern || validIdPattern).test(id || '');
};
HoodieObjectIdError.prototype.rules = 'Lowercase letters, numbers and dashes allowed only. Must start with a letter';

module.exports = HoodieObjectIdError;

},{"../error":1}],3:[function(require,module,exports){
// Hoodie Invalid Type Or Id Error
// -------------------------------

// only lowercase letters, numbers and dashes
// are allowed for object types, plus must start
// with a letter.
//
var HoodieError = require('../error');

//
function HoodieObjectTypeError(properties) {
  properties.name = 'HoodieObjectTypeError';
  properties.message = '"{{type}}" is invalid object type. {{rules}}.';

  return new HoodieError(properties);
}
var validTypePattern = /^[a-z$][a-z0-9]+$/;
HoodieObjectTypeError.isInvalid = function(type, customPattern) {
  return ! (customPattern || validTypePattern).test(type || '');
};
HoodieObjectTypeError.isValid = function(type, customPattern) {
  return (customPattern || validTypePattern).test(type || '');
};
HoodieObjectTypeError.prototype.rules = 'lowercase letters, numbers and dashes allowed only. Must start with a letter';

module.exports = HoodieObjectTypeError;

},{"../error":1}],4:[function(require,module,exports){
// Events
// ========
//
// extend any Class with support for
//
// * `object.bind('event', cb)`
// * `object.unbind('event', cb)`
// * `object.trigger('event', args...)`
// * `object.one('ev', cb)`
//
// based on [Events implementations from Spine](https://github.com/maccman/spine/blob/master/src/spine.coffee#L1)
//

// callbacks are global, while the events API is used at several places,
// like hoodie.on / hoodie.store.on / hoodie.task.on etc.
//

function hoodieEvents(hoodie, options) {
  var context = hoodie;
  var namespace = '';

  // normalize options hash
  options = options || {};

  // make sure callbacks hash exists
  if (!hoodie.eventsCallbacks) {
    hoodie.eventsCallbacks = {};
  }

  if (options.context) {
    context = options.context;
    namespace = options.namespace + ':';
  }

  // Bind
  // ------
  //
  // bind a callback to an event triggerd by the object
  //
  //     object.bind 'cheat', blame
  //
  function bind(ev, callback) {
    var evs, name, _i, _len;

    evs = ev.split(' ');

    for (_i = 0, _len = evs.length; _i < _len; _i++) {
      name = namespace + evs[_i];
      hoodie.eventsCallbacks[name] = hoodie.eventsCallbacks[name] || [];
      hoodie.eventsCallbacks[name].push(callback);
    }
  }

  // one
  // -----
  //
  // same as `bind`, but does get executed only once
  //
  //     object.one 'groundTouch', gameOver
  //
  function one(ev, callback) {
    ev = namespace + ev;
    var wrapper = function() {
      hoodie.unbind(ev, wrapper);
      callback.apply(null, arguments);
    };
    hoodie.bind(ev, wrapper);
  }

  // trigger
  // ---------
  //
  // trigger an event and pass optional parameters for binding.
  //     object.trigger 'win', score: 1230
  //
  function trigger() {
    var args, callback, ev, list, _i, _len;

    args = 1 <= arguments.length ? Array.prototype.slice.call(arguments, 0) : [];
    ev = args.shift();
    ev = namespace + ev;
    list = hoodie.eventsCallbacks[ev];

    if (!list) {
      return;
    }

    for (_i = 0, _len = list.length; _i < _len; _i++) {
      callback = list[_i];
      callback.apply(null, args);
    }

    return true;
  }

  // unbind
  // --------
  //
  // unbind to from all bindings, from all bindings of a specific event
  // or from a specific binding.
  //
  //     object.unbind()
  //     object.unbind 'move'
  //     object.unbind 'move', follow
  //
  function unbind(ev, callback) {
    var cb, i, list, _i, _len, evNames;

    if (!ev) {
      if (!namespace) {
        hoodie.eventsCallbacks = {};
      }

      evNames = Object.keys(hoodie.eventsCallbacks);
      evNames = evNames.filter(function(key) {
        return key.indexOf(namespace) === 0;
      });
      evNames.forEach(function(key) {
        delete hoodie.eventsCallbacks[key];
      });

      return;
    }

    ev = namespace + ev;

    list = hoodie.eventsCallbacks[ev];

    if (!list) {
      return;
    }

    if (!callback) {
      delete hoodie.eventsCallbacks[ev];
      return;
    }

    for (i = _i = 0, _len = list.length; _i < _len; i = ++_i) {
      cb = list[i];


      if (cb !== callback) {
        continue;
      }

      list = list.slice();
      list.splice(i, 1);
      hoodie.eventsCallbacks[ev] = list;
      break;
    }

    return;
  }

  context.bind = bind;
  context.on = bind;
  context.one = one;
  context.trigger = trigger;
  context.unbind = unbind;
  context.off = unbind;
}

module.exports = hoodieEvents;

},{}],5:[function(require,module,exports){
// Open stores
// -------------

var hoodieRemoteStore = require('./remote_store');

function hoodieOpen(hoodie) {

  // generic method to open a store. Used by
  //
  // * hoodie.remote
  // * hoodie.user("joe")
  // * hoodie.global
  // * ... and more
  //
  //     hoodie.open("some_store_name").findAll()
  //
  function open(storeName, options) {
    options = options || {};

    $.extend(options, {
      name: storeName
    });

    return hoodieRemoteStore(hoodie, options);
  }

  //
  // Public API
  //
  hoodie.open = open;
}

module.exports = hoodieOpen;

},{"./remote_store":7}],6:[function(require,module,exports){
// Hoodie Defers / Promises
// ------------------------

// returns a defer object for custom promise handlings.
// Promises are heavely used throughout the code of hoodie.
// We currently borrow jQuery's implementation:
// http://api.jquery.com/category/deferred-object/
//
//     defer = hoodie.defer()
//     if (good) {
//       defer.resolve('good.')
//     } else {
//       defer.reject('not good.')
//     }
//     return defer.promise()
//
var HoodieError = require('./error');

//
function hoodiePromises (hoodie) {
  var $defer = window.jQuery.Deferred;

  // returns true if passed object is a promise (but not a deferred),
  // otherwise false.
  function isPromise(object) {
    return !! (object &&
               typeof object.done === 'function' &&
               typeof object.resolve !== 'function');
  }

  //
  function resolve() {
    return $defer().resolve().promise();
  }


  //
  function reject() {
    return $defer().reject().promise();
  }


  //
  function resolveWith() {
    var _defer = $defer();
    return _defer.resolve.apply(_defer, arguments).promise();
  }

  //
  function rejectWith(errorProperties) {
    var _defer = $defer();
    var error = new HoodieError(errorProperties);
    return _defer.reject(error).promise();
  }

  //
  // Public API
  //
  hoodie.defer = $defer;
  hoodie.isPromise = isPromise;
  hoodie.resolve = resolve;
  hoodie.reject = reject;
  hoodie.resolveWith = resolveWith;
  hoodie.rejectWith = rejectWith;
}

module.exports = hoodiePromises;

},{"./error":1}],7:[function(require,module,exports){
// Remote
// ========

// Connection to a remote Couch Database.
//
// store API
// ----------------
//
// object loading / updating / deleting
//
// * find(type, id)
// * findAll(type )
// * add(type, object)
// * save(type, id, object)
// * update(type, id, new_properties )
// * updateAll( type, new_properties)
// * remove(type, id)
// * removeAll(type)
//
// custom requests
//
// * request(view, params)
// * get(view, params)
// * post(view, params)
//
// synchronization
//
// * connect()
// * disconnect()
// * pull()
// * push()
// * sync()
//
// event binding
//
// * on(event, callback)
//
var hoodieStoreApi = require('./store');

//
function hoodieRemoteStore (hoodie, options) {

  var remoteStore = {};


  // Remote Store Persistance methods
  // ----------------------------------

  // find
  // ------

  // find one object
  //
  remoteStore.find = function find(type, id) {
    var path;

    path = type + '/' + id;

    if (remote.prefix) {
      path = remote.prefix + path;
    }

    path = '/' + encodeURIComponent(path);

    return remote.request('GET', path).then(parseFromRemote);
  };


  // findAll
  // ---------

  // find all objects, can be filetered by a type
  //
  remoteStore.findAll = function findAll(type) {
    var endkey, path, startkey;

    path = '/_all_docs?include_docs=true';

    switch (true) {
    case (type !== undefined) && remote.prefix !== '':
      startkey = remote.prefix + type + '/';
      break;
    case type !== undefined:
      startkey = type + '/';
      break;
    case remote.prefix !== '':
      startkey = remote.prefix;
      break;
    default:
      startkey = '';
    }

    if (startkey) {

      // make sure that only objects starting with
      // `startkey` will be returned
      endkey = startkey.replace(/.$/, function(chars) {
        var charCode;
        charCode = chars.charCodeAt(0);
        return String.fromCharCode(charCode + 1);
      });
      path = '' + path + '&startkey="' + (encodeURIComponent(startkey)) + '"&endkey="' + (encodeURIComponent(endkey)) + '"';
    }

    return remote.request('GET', path).then(mapDocsFromFindAll).then(parseAllFromRemote);
  };


  // save
  // ------

  // save a new object. If it existed before, all properties
  // will be overwritten
  //
  remoteStore.save = function save(object) {
    var path;

    if (!object.id) {
      object.id = hoodie.generateId();
    }

    object = parseForRemote(object);
    path = '/' + encodeURIComponent(object._id);
    return remote.request('PUT', path, {
      data: object
    });
  };


  // remove
  // ---------

  // remove one object
  //
  remoteStore.remove = function remove(type, id) {
    return remote.update(type, id, {
      _deleted: true
    });
  };


  // removeAll
  // ------------

  // remove all objects, can be filtered by type
  //
  remoteStore.removeAll = function removeAll(type) {
    return remote.updateAll(type, {
      _deleted: true
    });
  };


  var remote = hoodieStoreApi(hoodie, {

    name: options.name,

    backend: {
      save: remoteStore.save,
      find: remoteStore.find,
      findAll: remoteStore.findAll,
      remove: remoteStore.remove,
      removeAll: remoteStore.removeAll
    }
  });





  // properties
  // ------------

  // name

  // the name of the Remote is the name of the
  // CouchDB database and is also used to prefix
  // triggered events
  //
  var remoteName = null;


  // sync

  // if set to true, updates will be continuously pulled
  // and pushed. Alternatively, `sync` can be set to
  // `pull: true` or `push: true`.
  //
  remote.connected = false;


  // prefix

  // prefix for docs in a CouchDB database, e.g. all docs
  // in public user stores are prefixed by '$public/'
  //
  remote.prefix = '';
  var remotePrefixPattern = new RegExp('^');


  // defaults
  // ----------------

  //
  if (options.name !== undefined) {
    remoteName = options.name;
  }

  if (options.prefix !== undefined) {
    remote.prefix = options.prefix;
    remotePrefixPattern = new RegExp('^' + remote.prefix);
  }

  if (options.baseUrl !== null) {
    remote.baseUrl = options.baseUrl;
  }


  // request
  // ---------

  // wrapper for hoodie.request, with some store specific defaults
  // and a prefixed path
  //
  remote.request = function request(type, path, options) {
    options = options || {};

    if (remoteName) {
      path = '/' + (encodeURIComponent(remoteName)) + path;
    }

    if (remote.baseUrl) {
      path = '' + remote.baseUrl + path;
    }

    options.contentType = options.contentType || 'application/json';

    if (type === 'POST' || type === 'PUT') {
      options.dataType = options.dataType || 'json';
      options.processData = options.processData || false;
      options.data = JSON.stringify(options.data);
    }
    return hoodie.request(type, path, options);
  };


  // isKnownObject
  // ---------------

  // determine between a known and a new object
  //
  remote.isKnownObject = function isKnownObject(object) {
    var key = '' + object.type + '/' + object.id;

    if (knownObjects[key] !== undefined) {
      return knownObjects[key];
    }
  };


  // markAsKnownObject
  // -------------------

  // determine between a known and a new object
  //
  remote.markAsKnownObject = function markAsKnownObject(object) {
    var key = '' + object.type + '/' + object.id;
    knownObjects[key] = 1;
    return knownObjects[key];
  };


  // synchronization
  // -----------------

  // Connect
  // ---------

  // start syncing. `remote.bootstrap()` will automatically start
  // pulling when `remote.connected` remains true.
  //
  remote.connect = function connect(name) {
    if (name) {
      remoteName = name;
    }
    remote.connected = true;
    remote.trigger('connect');
    return remote.bootstrap().then( function() { remote.push(); } );
  };


  // Disconnect
  // ------------

  // stop syncing changes from remote store
  //
  remote.disconnect = function disconnect() {
    remote.connected = false;
    remote.trigger('disconnect'); // TODO: spec that

    if (pullRequest) {
      pullRequest.abort();
    }

    if (pushRequest) {
      pushRequest.abort();
    }

  };


  // isConnected
  // -------------

  //
  remote.isConnected = function isConnected() {
    return remote.connected;
  };


  // getSinceNr
  // ------------

  // returns the sequence number from wich to start to find changes in pull
  //
  var since = options.since || 0; // TODO: spec that!
  remote.getSinceNr = function getSinceNr() {
    if (typeof since === 'function') {
      return since();
    }

    return since;
  };


  // bootstrap
  // -----------

  // inital pull of data of the remote store. By default, we pull all
  // changes since the beginning, but this behavior might be adjusted,
  // e.g for a filtered bootstrap.
  //
  var isBootstrapping = false;
  remote.bootstrap = function bootstrap() {
    isBootstrapping = true;
    remote.trigger('bootstrap:start');
    return remote.pull().done( handleBootstrapSuccess );
  };


  // pull changes
  // --------------

  // a.k.a. make a GET request to CouchDB's `_changes` feed.
  // We currently make long poll requests, that we manually abort
  // and restart each 25 seconds.
  //
  var pullRequest, pullRequestTimeout;
  remote.pull = function pull() {
    pullRequest = remote.request('GET', pullUrl());

    if (remote.isConnected()) {
      window.clearTimeout(pullRequestTimeout);
      pullRequestTimeout = window.setTimeout(restartPullRequest, 25000);
    }

    return pullRequest.done(handlePullSuccess).fail(handlePullError);
  };


  // push changes
  // --------------

  // Push objects to remote store using the `_bulk_docs` API.
  //
  var pushRequest;
  remote.push = function push(objects) {
    var object, objectsForRemote, _i, _len;

    if (!$.isArray(objects)) {
      objects = defaultObjectsToPush();
    }

    if (objects.length === 0) {
      return hoodie.resolveWith([]);
    }

    objectsForRemote = [];

    for (_i = 0, _len = objects.length; _i < _len; _i++) {

      // don't mess with original objects
      object = $.extend(true, {}, objects[_i]);
      addRevisionTo(object);
      object = parseForRemote(object);
      objectsForRemote.push(object);
    }
    pushRequest = remote.request('POST', '/_bulk_docs', {
      data: {
        docs: objectsForRemote,
        new_edits: false
      }
    });

    pushRequest.done(function() {
      for (var i = 0; i < objects.length; i++) {
        remote.trigger('push', objects[i]);
      }
    });
    return pushRequest;
  };

  // sync changes
  // --------------

  // push objects, then pull updates.
  //
  remote.sync = function sync(objects) {
    return remote.push(objects).then(remote.pull);
  };

  //
  // Private
  // ---------
  //

  // in order to differentiate whether an object from remote should trigger a 'new'
  // or an 'update' event, we store a hash of known objects
  var knownObjects = {};


  // valid CouchDB doc attributes starting with an underscore
  //
  var validSpecialAttributes = ['_id', '_rev', '_deleted', '_revisions', '_attachments'];


  // default objects to push
  // --------------------------

  // when pushed without passing any objects, the objects returned from
  // this method will be passed. It can be overwritten by passing an
  // array of objects or a function as `options.objects`
  //
  var defaultObjectsToPush = function defaultObjectsToPush() {
    return [];
  };
  if (options.defaultObjectsToPush) {
    if ($.isArray(options.defaultObjectsToPush)) {
      defaultObjectsToPush = function defaultObjectsToPush() {
        return options.defaultObjectsToPush;
      };
    } else {
      defaultObjectsToPush = options.defaultObjectsToPush;
    }
  }


  // setSinceNr
  // ------------

  // sets the sequence number from wich to start to find changes in pull.
  // If remote store was initialized with since : function(nr) { ... },
  // call the function with the seq passed. Otherwise simply set the seq
  // number and return it.
  //
  function setSinceNr(seq) {
    if (typeof since === 'function') {
      return since(seq);
    }

    since = seq;
    return since;
  }


  // Parse for remote
  // ------------------

  // parse object for remote storage. All properties starting with an
  // `underscore` do not get synchronized despite the special properties
  // `_id`, `_rev` and `_deleted` (see above)
  //
  // Also `id` gets replaced with `_id` which consists of type & id
  //
  function parseForRemote(object) {
    var attr, properties;
    properties = $.extend({}, object);

    for (attr in properties) {
      if (properties.hasOwnProperty(attr)) {
        if (validSpecialAttributes.indexOf(attr) !== -1) {
          continue;
        }
        if (!/^_/.test(attr)) {
          continue;
        }
        delete properties[attr];
      }
    }

    // prepare CouchDB id
    properties._id = '' + properties.type + '/' + properties.id;
    if (remote.prefix) {
      properties._id = '' + remote.prefix + properties._id;
    }
    delete properties.id;
    return properties;
  }


  // ### _parseFromRemote

  // normalize objects coming from remote
  //
  // renames `_id` attribute to `id` and removes the type from the id,
  // e.g. `type/123` -> `123`
  //
  function parseFromRemote(object) {
    var id, ignore, _ref;

    // handle id and type
    id = object._id || object.id;
    delete object._id;

    if (remote.prefix) {
      id = id.replace(remotePrefixPattern, '');
      // id = id.replace(new RegExp('^' + remote.prefix), '');
    }

    // turn doc/123 into type = doc & id = 123
    // NOTE: we don't use a simple id.split(/\//) here,
    // as in some cases IDs might contain '/', too
    //
    _ref = id.match(/([^\/]+)\/(.*)/),
    ignore = _ref[0],
    object.type = _ref[1],
    object.id = _ref[2];

    return object;
  }

  function parseAllFromRemote(objects) {
    var object, _i, _len, _results;
    _results = [];
    for (_i = 0, _len = objects.length; _i < _len; _i++) {
      object = objects[_i];
      _results.push(parseFromRemote(object));
    }
    return _results;
  }


  // ### _addRevisionTo

  // extends passed object with a _rev property
  //
  function addRevisionTo(attributes) {
    var currentRevId, currentRevNr, newRevisionId, _ref;
    try {
      _ref = attributes._rev.split(/-/),
      currentRevNr = _ref[0],
      currentRevId = _ref[1];
    } catch (_error) {}
    currentRevNr = parseInt(currentRevNr, 10) || 0;
    newRevisionId = generateNewRevisionId();

    // local changes are not meant to be replicated outside of the
    // users database, therefore the `-local` suffix.
    if (attributes._$local) {
      newRevisionId += '-local';
    }

    attributes._rev = '' + (currentRevNr + 1) + '-' + newRevisionId;
    attributes._revisions = {
      start: 1,
      ids: [newRevisionId]
    };

    if (currentRevId) {
      attributes._revisions.start += currentRevNr;
      return attributes._revisions.ids.push(currentRevId);
    }
  }


  // ### generate new revision id

  //
  function generateNewRevisionId() {
    return hoodie.generateId(9);
  }


  // ### map docs from findAll

  //
  function mapDocsFromFindAll(response) {
    return response.rows.map(function(row) {
      return row.doc;
    });
  }


  // ### pull url

  // Depending on whether remote is connected (= pulling changes continuously)
  // return a longpoll URL or not. If it is a beginning bootstrap request, do
  // not return a longpoll URL, as we want it to finish right away, even if there
  // are no changes on remote.
  //
  function pullUrl() {
    var since;
    since = remote.getSinceNr();
    if (remote.isConnected() && !isBootstrapping) {
      return '/_changes?include_docs=true&since=' + since + '&heartbeat=10000&feed=longpoll';
    } else {
      return '/_changes?include_docs=true&since=' + since;
    }
  }


  // ### restart pull request

  // request gets restarted automaticcally
  // when aborted (see handlePullError)
  function restartPullRequest() {
    if (pullRequest) {
      pullRequest.abort();
    }
  }


  // ### pull success handler

  // request gets restarted automaticcally
  // when aborted (see handlePullError)
  //
  function handlePullSuccess(response) {
    setSinceNr(response.last_seq);
    handlePullResults(response.results);
    if (remote.isConnected()) {
      return remote.pull();
    }
  }


  // ### pull error handler

  // when there is a change, trigger event,
  // then check for another change
  //
  function handlePullError(xhr, error) {
    if (!remote.isConnected()) {
      return;
    }

    switch (xhr.status) {
      // Session is invalid. User is still login, but needs to reauthenticate
      // before sync can be continued
    case 401:
      remote.trigger('error:unauthenticated', error);
      return remote.disconnect();

     // the 404 comes, when the requested DB has been removed
     // or does not exist yet.
     //
     // BUT: it might also happen that the background workers did
     //      not create a pending database yet. Therefore,
     //      we try it again in 3 seconds
     //
     // TODO: review / rethink that.
     //

    case 404:
      return window.setTimeout(remote.pull, 3000);

    case 500:
      //
      // Please server, don't give us these. At least not persistently
      //
      remote.trigger('error:server', error);
      window.setTimeout(remote.pull, 3000);
      return hoodie.checkConnection();
    default:
      // usually a 0, which stands for timeout or server not reachable.
      if (xhr.statusText === 'abort') {
        // manual abort after 25sec. restart pulling changes directly when connected
        return remote.pull();
      } else {

        // oops. This might be caused by an unreachable server.
        // Or the server cancelled it for what ever reason, e.g.
        // heroku kills the request after ~30s.
        // we'll try again after a 3s timeout
        //
        window.setTimeout(remote.pull, 3000);
        return hoodie.checkConnection();
      }
    }
  }


  // ### handle changes from remote
  //
  function handleBootstrapSuccess() {
    isBootstrapping = false;
    remote.trigger('bootstrap:end');
  }

  // ### handle changes from remote
  //
  function handlePullResults(changes) {
    var doc, event, object, _i, _len;

    for (_i = 0, _len = changes.length; _i < _len; _i++) {
      doc = changes[_i].doc;

      if (remote.prefix && doc._id.indexOf(remote.prefix) !== 0) {
        continue;
      }

      object = parseFromRemote(doc);

      if (object._deleted) {
        if (!remote.isKnownObject(object)) {
          continue;
        }
        event = 'remove';
        remote.isKnownObject(object);
      } else {
        if (remote.isKnownObject(object)) {
          event = 'update';
        } else {
          event = 'add';
          remote.markAsKnownObject(object);
        }
      }

      remote.trigger(event, object);
      remote.trigger(event + ':' + object.type, object);
      remote.trigger(event + ':' + object.type + ':' + object.id, object);
      remote.trigger('change', event, object);
      remote.trigger('change:' + object.type, event, object);
      remote.trigger('change:' + object.type + ':' + object.id, event, object);
    }
  }


  // bootstrap known objects
  //
  if (options.knownObjects) {
    for (var i = 0; i < options.knownObjects.length; i++) {
      remote.markAsKnownObject({
        type: options.knownObjects[i].type,
        id: options.knownObjects[i].id
      });
    }
  }


  // expose public API
  return remote;
}

module.exports = hoodieRemoteStore;

},{"./store":9}],8:[function(require,module,exports){
// scoped Store
// ============

// same as store, but with type preset to an initially
// passed value.
//
var hoodieEvents = require('./events');

//
function hoodieScopedStoreApi(hoodie, storeApi, options) {

  // name
  var storeName = options.name || 'store';
  var type = options.type;
  var id = options.id;

  var api = {};

  // scoped by type only
  if (!id) {

    // add events
    hoodieEvents(hoodie, {
      context: api,
      namespace: storeName + ':' + type
    });

    //
    api.save = function save(id, properties, options) {
      return storeApi.save(type, id, properties, options);
    };

    //
    api.add = function add(properties, options) {
      return storeApi.add(type, properties, options);
    };

    //
    api.find = function find(id) {
      return storeApi.find(type, id);
    };

    //
    api.findOrAdd = function findOrAdd(id, properties) {
      return storeApi.findOrAdd(type, id, properties);
    };

    //
    api.findAll = function findAll(options) {
      return storeApi.findAll(type, options);
    };

    //
    api.update = function update(id, objectUpdate, options) {
      return storeApi.update(type, id, objectUpdate, options);
    };

    //
    api.updateAll = function updateAll(objectUpdate, options) {
      return storeApi.updateAll(type, objectUpdate, options);
    };

    //
    api.remove = function remove(id, options) {
      return storeApi.remove(type, id, options);
    };

    //
    api.removeAll = function removeAll(options) {
      return storeApi.removeAll(type, options);
    };
  }

  // scoped by both: type & id
  if (id) {

    // add events
    hoodieEvents(hoodie, {
      context: api,
      namespace: storeName + ':' + type + ':' + id
    });

    //
    api.save = function save(properties, options) {
      return storeApi.save(type, id, properties, options);
    };

    //
    api.find = function find() {
      return storeApi.find(type, id);
    };

    //
    api.update = function update(objectUpdate, options) {
      return storeApi.update(type, id, objectUpdate, options);
    };

    //
    api.remove = function remove(options) {
      return storeApi.remove(type, id, options);
    };
  }

  //
  api.decoratePromises = storeApi.decoratePromises;
  api.validate = storeApi.validate;

  return api;
}

module.exports = hoodieScopedStoreApi;

},{"./events":4}],9:[function(require,module,exports){
// Store
// ============

// This class defines the API that hoodie.store (local store) and hoodie.open
// (remote store) implement to assure a coherent API. It also implements some
// basic validations.
//
// The returned API provides the following methods:
//
// * validate
// * save
// * add
// * find
// * findOrAdd
// * findAll
// * update
// * updateAll
// * remove
// * removeAll
// * decoratePromises
// * trigger
// * on
// * unbind
//
// At the same time, the returned API can be called as function returning a
// store scoped by the passed type, for example
//
//     var taskStore = hoodie.store('task');
//     taskStore.findAll().then( showAllTasks );
//     taskStore.update('id123', {done: true});
//

//
var hoodieScopedStoreApi = require('./scoped_store');
var hoodieEvents = require('./events');
var HoodieError = require('./error');
var HoodieObjectTypeError = require('./error/object_type');
var HoodieObjectIdError = require('./error/object_id');

//
function hoodieStoreApi(hoodie, options) {

  // persistance logic
  var backend = {};

  // extend this property with extra functions that will be available
  // on all promises returned by hoodie.store API. It has a reference
  // to current hoodie instance by default
  var promiseApi = {
    hoodie: hoodie
  };

  // name
  var storeName = options.name || 'store';

  // public API
  var api = function api(type, id) {
    var scopedOptions = $.extend(true, {type: type, id: id}, options);
    return hoodieScopedStoreApi(hoodie, api, scopedOptions);
  };

  // add event API
  hoodieEvents(hoodie, { context: api, namespace: storeName });


  // Validate
  // --------------

  // by default, we only check for a valid type & id.
  // the validate method can be overwriten by passing
  // options.validate
  //
  // if `validate` returns nothing, the passed object is
  // valid. Otherwise it returns an error
  //
  api.validate = options.validate;

  if (!options.validate) {
    api.validate = function(object /*, options */) {

      if (!object) {
        return new HoodieError({
          name: 'InvalidObjectError',
          message: 'No object passed.'
        });
      }
      if (HoodieObjectTypeError.isInvalid(object.type, validIdOrTypePattern)) {
        return new HoodieObjectTypeError({
          type: object.type,
          rules: validIdOrTypeRules
        });
      }

      if (!object.id) {
        return;
      }

      if (HoodieObjectIdError.isInvalid(object.id, validIdOrTypePattern)) {
        return new HoodieObjectIdError({
          id: object.id,
          rules: validIdOrTypeRules
        });
      }
    };
  }

  // Save
  // --------------

  // creates or replaces an an eventually existing object in the store
  // with same type & id.
  //
  // When id is undefined, it gets generated and a new object gets saved
  //
  // example usage:
  //
  //     store.save('car', undefined, {color: 'red'})
  //     store.save('car', 'abc4567', {color: 'red'})
  //
  api.save = function save(type, id, properties, options) {

    if ( options ) {
      options = $.extend(true, {}, options);
    } else {
      options = {};
    }

    // don't mess with passed object
    var object = $.extend(true, {}, properties, {type: type, id: id});

    // validations
    var error = api.validate(object, options || {});
    if(error) { return hoodie.rejectWith(error); }

    return decoratePromise( backend.save(object, options || {}) );
  };


  // Add
  // -------------------

  // `.add` is an alias for `.save`, with the difference that there is no id argument.
  // Internally it simply calls `.save(type, undefined, object).
  //
  api.add = function add(type, properties, options) {

    if (properties === undefined) {
      properties = {};
    }

    options = options || {};
    return api.save(type, properties.id, properties, options);
  };


  // find
  // ------

  //
  api.find = function find(type, id) {

    return decoratePromise( backend.find(type, id) );
  };


  // find or add
  // -------------

  // 1. Try to find a share by given id
  // 2. If share could be found, return it
  // 3. If not, add one and return it.
  //
  api.findOrAdd = function findOrAdd(type, id, properties) {

    if (properties === null) {
      properties = {};
    }

    function handleNotFound() {
      var newProperties;
      newProperties = $.extend(true, {
        id: id
      }, properties);
      return api.add(type, newProperties);
    }

    // promise decorations get lost when piped through `then`,
    // that's why we need to decorate the find's promise again.
    var promise = api.find(type, id).then(null, handleNotFound);
    return decoratePromise( promise );
  };


  // findAll
  // ------------

  // returns all objects from store.
  // Can be optionally filtered by a type or a function
  //
  api.findAll = function findAll(type, options) {

    return decoratePromise( backend.findAll(type, options) );
  };


  // Update
  // -------------------

  // In contrast to `.save`, the `.update` method does not replace the stored object,
  // but only changes the passed attributes of an exsting object, if it exists
  //
  // both a hash of key/values or a function that applies the update to the passed
  // object can be passed.
  //
  // example usage
  //
  // hoodie.store.update('car', 'abc4567', {sold: true})
  // hoodie.store.update('car', 'abc4567', function(obj) { obj.sold = true })
  //
  api.update = function update(type, id, objectUpdate, options) {

    function handleFound(currentObject) {
      var changedProperties, newObj, value;

      // normalize input
      newObj = $.extend(true, {}, currentObject);

      if (typeof objectUpdate === 'function') {
        objectUpdate = objectUpdate(newObj);
      }

      if (!objectUpdate) {
        return hoodie.resolveWith(currentObject);
      }

      // check if something changed
      changedProperties = (function() {
        var _results = [];

        for (var key in objectUpdate) {
          if (objectUpdate.hasOwnProperty(key)) {
            value = objectUpdate[key];
            if ((currentObject[key] !== value) === false) {
              continue;
            }
            // workaround for undefined values, as $.extend ignores these
            newObj[key] = value;
            _results.push(key);
          }
        }
        return _results;
      })();

      if (!(changedProperties.length || options)) {
        return hoodie.resolveWith(newObj);
      }

      //apply update
      return api.save(type, id, newObj, options);
    }

    // promise decorations get lost when piped through `then`,
    // that's why we need to decorate the find's promise again.
    var promise = api.find(type, id).then(handleFound);
    return decoratePromise( promise );
  };


  // updateOrAdd
  // -------------

  // same as `.update()`, but in case the object cannot be found,
  // it gets created
  //
  api.updateOrAdd = function updateOrAdd(type, id, objectUpdate, options) {
    function handleNotFound() {
      var properties = $.extend(true, {}, objectUpdate, {id: id});
      return api.add(type, properties, options);
    }

    var promise = api.update(type, id, objectUpdate, options).then(null, handleNotFound);
    return decoratePromise( promise );
  };


  // updateAll
  // -----------------

  // update all objects in the store, can be optionally filtered by a function
  // As an alternative, an array of objects can be passed
  //
  // example usage
  //
  // hoodie.store.updateAll()
  //
  api.updateAll = function updateAll(filterOrObjects, objectUpdate, options) {
    var promise;

    options = options || {};

    // normalize the input: make sure we have all objects
    switch (true) {
    case typeof filterOrObjects === 'string':
      promise = api.findAll(filterOrObjects);
      break;
    case hoodie.isPromise(filterOrObjects):
      promise = filterOrObjects;
      break;
    case $.isArray(filterOrObjects):
      promise = hoodie.defer().resolve(filterOrObjects).promise();
      break;
    default: // e.g. null, update all
      promise = api.findAll();
    }

    promise = promise.then(function(objects) {
      // now we update all objects one by one and return a promise
      // that will be resolved once all updates have been finished
      var object, _updatePromises;

      if (!$.isArray(objects)) {
        objects = [objects];
      }

      _updatePromises = (function() {
        var _i, _len, _results;
        _results = [];
        for (_i = 0, _len = objects.length; _i < _len; _i++) {
          object = objects[_i];
          _results.push(api.update(object.type, object.id, objectUpdate, options));
        }
        return _results;
      })();

      return $.when.apply(null, _updatePromises);
    });

    return decoratePromise( promise );
  };


  // Remove
  // ------------

  // Removes one object specified by `type` and `id`.
  //
  // when object has been synced before, mark it as deleted.
  // Otherwise remove it from Store.
  //
  api.remove = function remove(type, id, options) {
    return decoratePromise( backend.remove(type, id, options || {}) );
  };


  // removeAll
  // -----------

  // Destroye all objects. Can be filtered by a type
  //
  api.removeAll = function removeAll(type, options) {
    return decoratePromise( backend.removeAll(type, options || {}) );
  };


  // decorate promises
  // -------------------

  // extend promises returned by store.api
  api.decoratePromises = function decoratePromises(methods) {
    return $.extend(promiseApi, methods);
  };



  // required backend methods
  // -------------------------
  if (!options.backend ) {
    throw new Error('options.backend must be passed');
  }

  var required = 'save find findAll remove removeAll'.split(' ');

  required.forEach( function(methodName) {

    if (!options.backend[methodName]) {
      throw new Error('options.backend.'+methodName+' must be passed.');
    }

    backend[methodName] = options.backend[methodName];
  });


  // Private
  // ---------

  // / not allowed for id
  var validIdOrTypePattern = /^[^\/]+$/;
  var validIdOrTypeRules = '/ not allowed';

  //
  function decoratePromise(promise) {
    return $.extend(promise, promiseApi);
  }

  return api;
}

module.exports = hoodieStoreApi;

},{"./error":1,"./error/object_id":2,"./error/object_type":3,"./events":4,"./scoped_store":8}],10:[function(require,module,exports){
// Hoodie Admin
// -------------
//
// your friendly library for pocket,
// the Hoodie Admin UI
//
var hoodieEvents = require('../node_modules/hoodie/src/hoodie/events');
var hoodiePromises = require('../node_modules/hoodie/src/hoodie/promises');
var hoodieOpen = require('../node_modules/hoodie/src/hoodie/open');

// Constructor
// -------------

// When initializing a hoodie instance, an optional URL
// can be passed. That's the URL of the hoodie backend.
// If no URL passed it defaults to the current domain.
//
//     // init a new hoodie instance
//     hoodie = new Hoodie
//
function HoodieAdmin(baseUrl) {
  var hoodieAdmin = this;

  // enforce initialization with `new`
  if (!(hoodieAdmin instanceof HoodieAdmin)) {
    throw new Error('usage: new HoodieAdmin(url);');
  }

  if (baseUrl) {
    // remove trailing slashes
    hoodieAdmin.baseUrl = baseUrl.replace(/\/+$/, '');
  }


  // hoodieAdmin.extend
  // ---------------

  // extend hoodieAdmin instance:
  //
  //     hoodieAdmin.extend(function(hoodieAdmin) {} )
  //
  hoodieAdmin.extend = function extend(extension) {
    extension(hoodieAdmin);
  };

  //
  // Extending hoodie admin core
  //

  // * hoodieAdmin.bind
  // * hoodieAdmin.on
  // * hoodieAdmin.one
  // * hoodieAdmin.trigger
  // * hoodieAdmin.unbind
  // * hoodieAdmin.off
  hoodieAdmin.extend(hoodieEvents);


  // * hoodieAdmin.defer
  // * hoodieAdmin.isPromise
  // * hoodieAdmin.resolve
  // * hoodieAdmin.reject
  // * hoodieAdmin.resolveWith
  // * hoodieAdmin.rejectWith
  hoodieAdmin.extend(hoodiePromises );

  // * hoodie.open
  hoodieAdmin.extend(hoodieOpen);

  //
  // loading user extensions
  //
  applyExtensions(HoodieAdmin);
}

// Extending HoodieAdmin
// ----------------------

// You can extend the Hoodie class like so:
//
// Hoodie.extend(funcion(HoodieAdmin) { HoodieAdmin.myMagic = function() {} })
//

var extensions = [];

HoodieAdmin.extend = function(extension) {
  extensions.push(extension);
};

//
// detect available extensions and attach to Hoodie Object.
//
function applyExtensions(hoodie) {
  for (var i = 0; i < extensions.length; i++) {
    extensions[i](hoodie);
  }
}

module.exports = HoodieAdmin;

},{"../node_modules/hoodie/src/hoodie/events":4,"../node_modules/hoodie/src/hoodie/open":5,"../node_modules/hoodie/src/hoodie/promises":6}]},{},[10])
//@ sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlcyI6WyIvVXNlcnMvZ3JlZ29yL0phdmFTY3JpcHRzL2hvb2QuaWUvaG9vZGllLmFkbWluLmpzL25vZGVfbW9kdWxlcy9ob29kaWUvc3JjL2hvb2RpZS9lcnJvci5qcyIsIi9Vc2Vycy9ncmVnb3IvSmF2YVNjcmlwdHMvaG9vZC5pZS9ob29kaWUuYWRtaW4uanMvbm9kZV9tb2R1bGVzL2hvb2RpZS9zcmMvaG9vZGllL2Vycm9yL29iamVjdF9pZC5qcyIsIi9Vc2Vycy9ncmVnb3IvSmF2YVNjcmlwdHMvaG9vZC5pZS9ob29kaWUuYWRtaW4uanMvbm9kZV9tb2R1bGVzL2hvb2RpZS9zcmMvaG9vZGllL2Vycm9yL29iamVjdF90eXBlLmpzIiwiL1VzZXJzL2dyZWdvci9KYXZhU2NyaXB0cy9ob29kLmllL2hvb2RpZS5hZG1pbi5qcy9ub2RlX21vZHVsZXMvaG9vZGllL3NyYy9ob29kaWUvZXZlbnRzLmpzIiwiL1VzZXJzL2dyZWdvci9KYXZhU2NyaXB0cy9ob29kLmllL2hvb2RpZS5hZG1pbi5qcy9ub2RlX21vZHVsZXMvaG9vZGllL3NyYy9ob29kaWUvb3Blbi5qcyIsIi9Vc2Vycy9ncmVnb3IvSmF2YVNjcmlwdHMvaG9vZC5pZS9ob29kaWUuYWRtaW4uanMvbm9kZV9tb2R1bGVzL2hvb2RpZS9zcmMvaG9vZGllL3Byb21pc2VzLmpzIiwiL1VzZXJzL2dyZWdvci9KYXZhU2NyaXB0cy9ob29kLmllL2hvb2RpZS5hZG1pbi5qcy9ub2RlX21vZHVsZXMvaG9vZGllL3NyYy9ob29kaWUvcmVtb3RlX3N0b3JlLmpzIiwiL1VzZXJzL2dyZWdvci9KYXZhU2NyaXB0cy9ob29kLmllL2hvb2RpZS5hZG1pbi5qcy9ub2RlX21vZHVsZXMvaG9vZGllL3NyYy9ob29kaWUvc2NvcGVkX3N0b3JlLmpzIiwiL1VzZXJzL2dyZWdvci9KYXZhU2NyaXB0cy9ob29kLmllL2hvb2RpZS5hZG1pbi5qcy9ub2RlX21vZHVsZXMvaG9vZGllL3NyYy9ob29kaWUvc3RvcmUuanMiLCIvVXNlcnMvZ3JlZ29yL0phdmFTY3JpcHRzL2hvb2QuaWUvaG9vZGllLmFkbWluLmpzL3NyYy9ob29kaWUuYWRtaW4uanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDekJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuS0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzd2QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL0dBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3haQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsInNvdXJjZXNDb250ZW50IjpbIi8vIEhvb2RpZSBFcnJvclxuLy8gLS0tLS0tLS0tLS0tLVxuXG4vLyBXaXRoIHRoZSBjdXN0b20gaG9vZGllIGVycm9yIGZ1bmN0aW9uXG4vLyB3ZSBub3JtYWxpemUgYWxsIGVycm9ycyB0aGUgZ2V0IHJldHVybmVkXG4vLyB3aGVuIHVzaW5nIGhvb2RpZS5yZWplY3RXaXRoXG4vL1xuLy8gVGhlIG5hdGl2ZSBKYXZhU2NyaXB0IGVycm9yIG1ldGhvZCBoYXNcbi8vIGEgbmFtZSAmIGEgbWVzc2FnZSBwcm9wZXJ0eS4gSG9vZGllRXJyb3Jcbi8vIHJlcXVpcmVzIHRoZXNlLCBidXQgb24gdG9wIGFsbG93cyBmb3Jcbi8vIHVubGltaXRlZCBjdXN0b20gcHJvcGVydGllcy5cbi8vXG4vLyBJbnN0ZWFkIG9mIGJlaW5nIGluaXRpYWxpemVkIHdpdGgganVzdFxuLy8gdGhlIG1lc3NhZ2UsIEhvb2RpZUVycm9yIGV4cGVjdHMgYW5cbi8vIG9iamVjdCB3aXRoIHByb3Blcml0ZXMuIFRoZSBgbWVzc2FnZWBcbi8vIHByb3BlcnR5IGlzIHJlcXVpcmVkLiBUaGUgbmFtZSB3aWxsXG4vLyBmYWxsYmFjayB0byBgZXJyb3JgLlxuLy9cbi8vIGBtZXNzYWdlYCBjYW4gYWxzbyBjb250YWluIHBsYWNlaG9sZGVyc1xuLy8gaW4gdGhlIGZvcm0gb2YgYHt7cHJvcGVydHlOYW1lfX1gYCB3aGljaFxuLy8gd2lsbCBnZXQgcmVwbGFjZWQgYXV0b21hdGljYWxseSB3aXRoIHBhc3NlZFxuLy8gZXh0cmEgcHJvcGVydGllcy5cbi8vXG4vLyAjIyMgRXJyb3IgQ29udmVudGlvbnNcbi8vXG4vLyBXZSBmb2xsb3cgSmF2YVNjcmlwdCdzIG5hdGl2ZSBlcnJvciBjb252ZW50aW9ucyxcbi8vIG1lYW5pbmcgdGhhdCBlcnJvciBuYW1lcyBhcmUgY2FtZWxDYXNlIHdpdGggdGhlXG4vLyBmaXJzdCBsZXR0ZXIgdXBwZXJjYXNlIGFzIHdlbGwsIGFuZCB0aGUgbWVzc2FnZVxuLy8gc3RhcnRpbmcgd2l0aCBhbiB1cHBlcmNhc2UgbGV0dGVyLlxuLy9cbnZhciBlcnJvck1lc3NhZ2VSZXBsYWNlUGF0dGVybiA9IC9cXHtcXHtcXHMqXFx3K1xccypcXH1cXH0vZztcbnZhciBlcnJvck1lc3NhZ2VGaW5kUHJvcGVydHlQYXR0ZXJuID0gL1xcdysvO1xuZnVuY3Rpb24gSG9vZGllRXJyb3IocHJvcGVydGllcykge1xuXG4gIC8vIG5vcm1hbGl6ZSBhcmd1bWVudHNcbiAgaWYgKHR5cGVvZiBwcm9wZXJ0aWVzID09PSAnc3RyaW5nJykge1xuICAgIHByb3BlcnRpZXMgPSB7XG4gICAgICBtZXNzYWdlOiBwcm9wZXJ0aWVzXG4gICAgfTtcbiAgfVxuXG4gIGlmICghIHByb3BlcnRpZXMubWVzc2FnZSkge1xuICAgIHRocm93IG5ldyBFcnJvcignRkFUQUw6IGVycm9yLm1lc3NhZ2UgbXVzdCBiZSBzZXQnKTtcbiAgfVxuXG4gIC8vIG11c3QgY2hlY2sgZm9yIHByb3BlcnRpZXMsIGFzIHRoaXMubmFtZSBpcyBhbHdheXMgc2V0LlxuICBpZiAoISBwcm9wZXJ0aWVzLm5hbWUpIHtcbiAgICBwcm9wZXJ0aWVzLm5hbWUgPSAnSG9vZGllRXJyb3InO1xuICB9XG5cbiAgcHJvcGVydGllcy5tZXNzYWdlID0gcHJvcGVydGllcy5tZXNzYWdlLnJlcGxhY2UoZXJyb3JNZXNzYWdlUmVwbGFjZVBhdHRlcm4sIGZ1bmN0aW9uKG1hdGNoKSB7XG4gICAgdmFyIHByb3BlcnR5ID0gbWF0Y2gubWF0Y2goZXJyb3JNZXNzYWdlRmluZFByb3BlcnR5UGF0dGVybilbMF07XG4gICAgcmV0dXJuIHByb3BlcnRpZXNbcHJvcGVydHldO1xuICB9KTtcblxuICAkLmV4dGVuZCh0aGlzLCBwcm9wZXJ0aWVzKTtcbn1cbkhvb2RpZUVycm9yLnByb3RvdHlwZSA9IG5ldyBFcnJvcigpO1xuSG9vZGllRXJyb3IucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gSG9vZGllRXJyb3I7XG5cbm1vZHVsZS5leHBvcnRzID0gSG9vZGllRXJyb3I7XG4iLCIvLyBIb29kaWUgSW52YWxpZCBUeXBlIE9yIElkIEVycm9yXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbi8vIG9ubHkgbG93ZXJjYXNlIGxldHRlcnMsIG51bWJlcnMgYW5kIGRhc2hlc1xuLy8gYXJlIGFsbG93ZWQgZm9yIG9iamVjdCBJRHMuXG4vL1xudmFyIEhvb2RpZUVycm9yID0gcmVxdWlyZSgnLi4vZXJyb3InKTtcblxuLy9cbmZ1bmN0aW9uIEhvb2RpZU9iamVjdElkRXJyb3IocHJvcGVydGllcykge1xuICBwcm9wZXJ0aWVzLm5hbWUgPSAnSG9vZGllT2JqZWN0SWRFcnJvcic7XG4gIHByb3BlcnRpZXMubWVzc2FnZSA9ICdcInt7aWR9fVwiIGlzIGludmFsaWQgb2JqZWN0IGlkLiB7e3J1bGVzfX0uJztcblxuICByZXR1cm4gbmV3IEhvb2RpZUVycm9yKHByb3BlcnRpZXMpO1xufVxudmFyIHZhbGlkSWRQYXR0ZXJuID0gL15bYS16MC05XFwtXSskLztcbkhvb2RpZU9iamVjdElkRXJyb3IuaXNJbnZhbGlkID0gZnVuY3Rpb24oaWQsIGN1c3RvbVBhdHRlcm4pIHtcbiAgcmV0dXJuICEgKGN1c3RvbVBhdHRlcm4gfHwgdmFsaWRJZFBhdHRlcm4pLnRlc3QoaWQgfHwgJycpO1xufTtcbkhvb2RpZU9iamVjdElkRXJyb3IuaXNWYWxpZCA9IGZ1bmN0aW9uKGlkLCBjdXN0b21QYXR0ZXJuKSB7XG4gIHJldHVybiAoY3VzdG9tUGF0dGVybiB8fCB2YWxpZElkUGF0dGVybikudGVzdChpZCB8fCAnJyk7XG59O1xuSG9vZGllT2JqZWN0SWRFcnJvci5wcm90b3R5cGUucnVsZXMgPSAnTG93ZXJjYXNlIGxldHRlcnMsIG51bWJlcnMgYW5kIGRhc2hlcyBhbGxvd2VkIG9ubHkuIE11c3Qgc3RhcnQgd2l0aCBhIGxldHRlcic7XG5cbm1vZHVsZS5leHBvcnRzID0gSG9vZGllT2JqZWN0SWRFcnJvcjtcbiIsIi8vIEhvb2RpZSBJbnZhbGlkIFR5cGUgT3IgSWQgRXJyb3Jcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuLy8gb25seSBsb3dlcmNhc2UgbGV0dGVycywgbnVtYmVycyBhbmQgZGFzaGVzXG4vLyBhcmUgYWxsb3dlZCBmb3Igb2JqZWN0IHR5cGVzLCBwbHVzIG11c3Qgc3RhcnRcbi8vIHdpdGggYSBsZXR0ZXIuXG4vL1xudmFyIEhvb2RpZUVycm9yID0gcmVxdWlyZSgnLi4vZXJyb3InKTtcblxuLy9cbmZ1bmN0aW9uIEhvb2RpZU9iamVjdFR5cGVFcnJvcihwcm9wZXJ0aWVzKSB7XG4gIHByb3BlcnRpZXMubmFtZSA9ICdIb29kaWVPYmplY3RUeXBlRXJyb3InO1xuICBwcm9wZXJ0aWVzLm1lc3NhZ2UgPSAnXCJ7e3R5cGV9fVwiIGlzIGludmFsaWQgb2JqZWN0IHR5cGUuIHt7cnVsZXN9fS4nO1xuXG4gIHJldHVybiBuZXcgSG9vZGllRXJyb3IocHJvcGVydGllcyk7XG59XG52YXIgdmFsaWRUeXBlUGF0dGVybiA9IC9eW2EteiRdW2EtejAtOV0rJC87XG5Ib29kaWVPYmplY3RUeXBlRXJyb3IuaXNJbnZhbGlkID0gZnVuY3Rpb24odHlwZSwgY3VzdG9tUGF0dGVybikge1xuICByZXR1cm4gISAoY3VzdG9tUGF0dGVybiB8fCB2YWxpZFR5cGVQYXR0ZXJuKS50ZXN0KHR5cGUgfHwgJycpO1xufTtcbkhvb2RpZU9iamVjdFR5cGVFcnJvci5pc1ZhbGlkID0gZnVuY3Rpb24odHlwZSwgY3VzdG9tUGF0dGVybikge1xuICByZXR1cm4gKGN1c3RvbVBhdHRlcm4gfHwgdmFsaWRUeXBlUGF0dGVybikudGVzdCh0eXBlIHx8ICcnKTtcbn07XG5Ib29kaWVPYmplY3RUeXBlRXJyb3IucHJvdG90eXBlLnJ1bGVzID0gJ2xvd2VyY2FzZSBsZXR0ZXJzLCBudW1iZXJzIGFuZCBkYXNoZXMgYWxsb3dlZCBvbmx5LiBNdXN0IHN0YXJ0IHdpdGggYSBsZXR0ZXInO1xuXG5tb2R1bGUuZXhwb3J0cyA9IEhvb2RpZU9iamVjdFR5cGVFcnJvcjtcbiIsIi8vIEV2ZW50c1xuLy8gPT09PT09PT1cbi8vXG4vLyBleHRlbmQgYW55IENsYXNzIHdpdGggc3VwcG9ydCBmb3Jcbi8vXG4vLyAqIGBvYmplY3QuYmluZCgnZXZlbnQnLCBjYilgXG4vLyAqIGBvYmplY3QudW5iaW5kKCdldmVudCcsIGNiKWBcbi8vICogYG9iamVjdC50cmlnZ2VyKCdldmVudCcsIGFyZ3MuLi4pYFxuLy8gKiBgb2JqZWN0Lm9uZSgnZXYnLCBjYilgXG4vL1xuLy8gYmFzZWQgb24gW0V2ZW50cyBpbXBsZW1lbnRhdGlvbnMgZnJvbSBTcGluZV0oaHR0cHM6Ly9naXRodWIuY29tL21hY2NtYW4vc3BpbmUvYmxvYi9tYXN0ZXIvc3JjL3NwaW5lLmNvZmZlZSNMMSlcbi8vXG5cbi8vIGNhbGxiYWNrcyBhcmUgZ2xvYmFsLCB3aGlsZSB0aGUgZXZlbnRzIEFQSSBpcyB1c2VkIGF0IHNldmVyYWwgcGxhY2VzLFxuLy8gbGlrZSBob29kaWUub24gLyBob29kaWUuc3RvcmUub24gLyBob29kaWUudGFzay5vbiBldGMuXG4vL1xuXG5mdW5jdGlvbiBob29kaWVFdmVudHMoaG9vZGllLCBvcHRpb25zKSB7XG4gIHZhciBjb250ZXh0ID0gaG9vZGllO1xuICB2YXIgbmFtZXNwYWNlID0gJyc7XG5cbiAgLy8gbm9ybWFsaXplIG9wdGlvbnMgaGFzaFxuICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcblxuICAvLyBtYWtlIHN1cmUgY2FsbGJhY2tzIGhhc2ggZXhpc3RzXG4gIGlmICghaG9vZGllLmV2ZW50c0NhbGxiYWNrcykge1xuICAgIGhvb2RpZS5ldmVudHNDYWxsYmFja3MgPSB7fTtcbiAgfVxuXG4gIGlmIChvcHRpb25zLmNvbnRleHQpIHtcbiAgICBjb250ZXh0ID0gb3B0aW9ucy5jb250ZXh0O1xuICAgIG5hbWVzcGFjZSA9IG9wdGlvbnMubmFtZXNwYWNlICsgJzonO1xuICB9XG5cbiAgLy8gQmluZFxuICAvLyAtLS0tLS1cbiAgLy9cbiAgLy8gYmluZCBhIGNhbGxiYWNrIHRvIGFuIGV2ZW50IHRyaWdnZXJkIGJ5IHRoZSBvYmplY3RcbiAgLy9cbiAgLy8gICAgIG9iamVjdC5iaW5kICdjaGVhdCcsIGJsYW1lXG4gIC8vXG4gIGZ1bmN0aW9uIGJpbmQoZXYsIGNhbGxiYWNrKSB7XG4gICAgdmFyIGV2cywgbmFtZSwgX2ksIF9sZW47XG5cbiAgICBldnMgPSBldi5zcGxpdCgnICcpO1xuXG4gICAgZm9yIChfaSA9IDAsIF9sZW4gPSBldnMubGVuZ3RoOyBfaSA8IF9sZW47IF9pKyspIHtcbiAgICAgIG5hbWUgPSBuYW1lc3BhY2UgKyBldnNbX2ldO1xuICAgICAgaG9vZGllLmV2ZW50c0NhbGxiYWNrc1tuYW1lXSA9IGhvb2RpZS5ldmVudHNDYWxsYmFja3NbbmFtZV0gfHwgW107XG4gICAgICBob29kaWUuZXZlbnRzQ2FsbGJhY2tzW25hbWVdLnB1c2goY2FsbGJhY2spO1xuICAgIH1cbiAgfVxuXG4gIC8vIG9uZVxuICAvLyAtLS0tLVxuICAvL1xuICAvLyBzYW1lIGFzIGBiaW5kYCwgYnV0IGRvZXMgZ2V0IGV4ZWN1dGVkIG9ubHkgb25jZVxuICAvL1xuICAvLyAgICAgb2JqZWN0Lm9uZSAnZ3JvdW5kVG91Y2gnLCBnYW1lT3ZlclxuICAvL1xuICBmdW5jdGlvbiBvbmUoZXYsIGNhbGxiYWNrKSB7XG4gICAgZXYgPSBuYW1lc3BhY2UgKyBldjtcbiAgICB2YXIgd3JhcHBlciA9IGZ1bmN0aW9uKCkge1xuICAgICAgaG9vZGllLnVuYmluZChldiwgd3JhcHBlcik7XG4gICAgICBjYWxsYmFjay5hcHBseShudWxsLCBhcmd1bWVudHMpO1xuICAgIH07XG4gICAgaG9vZGllLmJpbmQoZXYsIHdyYXBwZXIpO1xuICB9XG5cbiAgLy8gdHJpZ2dlclxuICAvLyAtLS0tLS0tLS1cbiAgLy9cbiAgLy8gdHJpZ2dlciBhbiBldmVudCBhbmQgcGFzcyBvcHRpb25hbCBwYXJhbWV0ZXJzIGZvciBiaW5kaW5nLlxuICAvLyAgICAgb2JqZWN0LnRyaWdnZXIgJ3dpbicsIHNjb3JlOiAxMjMwXG4gIC8vXG4gIGZ1bmN0aW9uIHRyaWdnZXIoKSB7XG4gICAgdmFyIGFyZ3MsIGNhbGxiYWNrLCBldiwgbGlzdCwgX2ksIF9sZW47XG5cbiAgICBhcmdzID0gMSA8PSBhcmd1bWVudHMubGVuZ3RoID8gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAwKSA6IFtdO1xuICAgIGV2ID0gYXJncy5zaGlmdCgpO1xuICAgIGV2ID0gbmFtZXNwYWNlICsgZXY7XG4gICAgbGlzdCA9IGhvb2RpZS5ldmVudHNDYWxsYmFja3NbZXZdO1xuXG4gICAgaWYgKCFsaXN0KSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgZm9yIChfaSA9IDAsIF9sZW4gPSBsaXN0Lmxlbmd0aDsgX2kgPCBfbGVuOyBfaSsrKSB7XG4gICAgICBjYWxsYmFjayA9IGxpc3RbX2ldO1xuICAgICAgY2FsbGJhY2suYXBwbHkobnVsbCwgYXJncyk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRydWU7XG4gIH1cblxuICAvLyB1bmJpbmRcbiAgLy8gLS0tLS0tLS1cbiAgLy9cbiAgLy8gdW5iaW5kIHRvIGZyb20gYWxsIGJpbmRpbmdzLCBmcm9tIGFsbCBiaW5kaW5ncyBvZiBhIHNwZWNpZmljIGV2ZW50XG4gIC8vIG9yIGZyb20gYSBzcGVjaWZpYyBiaW5kaW5nLlxuICAvL1xuICAvLyAgICAgb2JqZWN0LnVuYmluZCgpXG4gIC8vICAgICBvYmplY3QudW5iaW5kICdtb3ZlJ1xuICAvLyAgICAgb2JqZWN0LnVuYmluZCAnbW92ZScsIGZvbGxvd1xuICAvL1xuICBmdW5jdGlvbiB1bmJpbmQoZXYsIGNhbGxiYWNrKSB7XG4gICAgdmFyIGNiLCBpLCBsaXN0LCBfaSwgX2xlbiwgZXZOYW1lcztcblxuICAgIGlmICghZXYpIHtcbiAgICAgIGlmICghbmFtZXNwYWNlKSB7XG4gICAgICAgIGhvb2RpZS5ldmVudHNDYWxsYmFja3MgPSB7fTtcbiAgICAgIH1cblxuICAgICAgZXZOYW1lcyA9IE9iamVjdC5rZXlzKGhvb2RpZS5ldmVudHNDYWxsYmFja3MpO1xuICAgICAgZXZOYW1lcyA9IGV2TmFtZXMuZmlsdGVyKGZ1bmN0aW9uKGtleSkge1xuICAgICAgICByZXR1cm4ga2V5LmluZGV4T2YobmFtZXNwYWNlKSA9PT0gMDtcbiAgICAgIH0pO1xuICAgICAgZXZOYW1lcy5mb3JFYWNoKGZ1bmN0aW9uKGtleSkge1xuICAgICAgICBkZWxldGUgaG9vZGllLmV2ZW50c0NhbGxiYWNrc1trZXldO1xuICAgICAgfSk7XG5cbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBldiA9IG5hbWVzcGFjZSArIGV2O1xuXG4gICAgbGlzdCA9IGhvb2RpZS5ldmVudHNDYWxsYmFja3NbZXZdO1xuXG4gICAgaWYgKCFsaXN0KSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgaWYgKCFjYWxsYmFjaykge1xuICAgICAgZGVsZXRlIGhvb2RpZS5ldmVudHNDYWxsYmFja3NbZXZdO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGZvciAoaSA9IF9pID0gMCwgX2xlbiA9IGxpc3QubGVuZ3RoOyBfaSA8IF9sZW47IGkgPSArK19pKSB7XG4gICAgICBjYiA9IGxpc3RbaV07XG5cblxuICAgICAgaWYgKGNiICE9PSBjYWxsYmFjaykge1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cblxuICAgICAgbGlzdCA9IGxpc3Quc2xpY2UoKTtcbiAgICAgIGxpc3Quc3BsaWNlKGksIDEpO1xuICAgICAgaG9vZGllLmV2ZW50c0NhbGxiYWNrc1tldl0gPSBsaXN0O1xuICAgICAgYnJlYWs7XG4gICAgfVxuXG4gICAgcmV0dXJuO1xuICB9XG5cbiAgY29udGV4dC5iaW5kID0gYmluZDtcbiAgY29udGV4dC5vbiA9IGJpbmQ7XG4gIGNvbnRleHQub25lID0gb25lO1xuICBjb250ZXh0LnRyaWdnZXIgPSB0cmlnZ2VyO1xuICBjb250ZXh0LnVuYmluZCA9IHVuYmluZDtcbiAgY29udGV4dC5vZmYgPSB1bmJpbmQ7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gaG9vZGllRXZlbnRzO1xuIiwiLy8gT3BlbiBzdG9yZXNcbi8vIC0tLS0tLS0tLS0tLS1cblxudmFyIGhvb2RpZVJlbW90ZVN0b3JlID0gcmVxdWlyZSgnLi9yZW1vdGVfc3RvcmUnKTtcblxuZnVuY3Rpb24gaG9vZGllT3Blbihob29kaWUpIHtcblxuICAvLyBnZW5lcmljIG1ldGhvZCB0byBvcGVuIGEgc3RvcmUuIFVzZWQgYnlcbiAgLy9cbiAgLy8gKiBob29kaWUucmVtb3RlXG4gIC8vICogaG9vZGllLnVzZXIoXCJqb2VcIilcbiAgLy8gKiBob29kaWUuZ2xvYmFsXG4gIC8vICogLi4uIGFuZCBtb3JlXG4gIC8vXG4gIC8vICAgICBob29kaWUub3BlbihcInNvbWVfc3RvcmVfbmFtZVwiKS5maW5kQWxsKClcbiAgLy9cbiAgZnVuY3Rpb24gb3BlbihzdG9yZU5hbWUsIG9wdGlvbnMpIHtcbiAgICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcblxuICAgICQuZXh0ZW5kKG9wdGlvbnMsIHtcbiAgICAgIG5hbWU6IHN0b3JlTmFtZVxuICAgIH0pO1xuXG4gICAgcmV0dXJuIGhvb2RpZVJlbW90ZVN0b3JlKGhvb2RpZSwgb3B0aW9ucyk7XG4gIH1cblxuICAvL1xuICAvLyBQdWJsaWMgQVBJXG4gIC8vXG4gIGhvb2RpZS5vcGVuID0gb3Blbjtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBob29kaWVPcGVuO1xuIiwiLy8gSG9vZGllIERlZmVycyAvIFByb21pc2VzXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuLy8gcmV0dXJucyBhIGRlZmVyIG9iamVjdCBmb3IgY3VzdG9tIHByb21pc2UgaGFuZGxpbmdzLlxuLy8gUHJvbWlzZXMgYXJlIGhlYXZlbHkgdXNlZCB0aHJvdWdob3V0IHRoZSBjb2RlIG9mIGhvb2RpZS5cbi8vIFdlIGN1cnJlbnRseSBib3Jyb3cgalF1ZXJ5J3MgaW1wbGVtZW50YXRpb246XG4vLyBodHRwOi8vYXBpLmpxdWVyeS5jb20vY2F0ZWdvcnkvZGVmZXJyZWQtb2JqZWN0L1xuLy9cbi8vICAgICBkZWZlciA9IGhvb2RpZS5kZWZlcigpXG4vLyAgICAgaWYgKGdvb2QpIHtcbi8vICAgICAgIGRlZmVyLnJlc29sdmUoJ2dvb2QuJylcbi8vICAgICB9IGVsc2Uge1xuLy8gICAgICAgZGVmZXIucmVqZWN0KCdub3QgZ29vZC4nKVxuLy8gICAgIH1cbi8vICAgICByZXR1cm4gZGVmZXIucHJvbWlzZSgpXG4vL1xudmFyIEhvb2RpZUVycm9yID0gcmVxdWlyZSgnLi9lcnJvcicpO1xuXG4vL1xuZnVuY3Rpb24gaG9vZGllUHJvbWlzZXMgKGhvb2RpZSkge1xuICB2YXIgJGRlZmVyID0gd2luZG93LmpRdWVyeS5EZWZlcnJlZDtcblxuICAvLyByZXR1cm5zIHRydWUgaWYgcGFzc2VkIG9iamVjdCBpcyBhIHByb21pc2UgKGJ1dCBub3QgYSBkZWZlcnJlZCksXG4gIC8vIG90aGVyd2lzZSBmYWxzZS5cbiAgZnVuY3Rpb24gaXNQcm9taXNlKG9iamVjdCkge1xuICAgIHJldHVybiAhISAob2JqZWN0ICYmXG4gICAgICAgICAgICAgICB0eXBlb2Ygb2JqZWN0LmRvbmUgPT09ICdmdW5jdGlvbicgJiZcbiAgICAgICAgICAgICAgIHR5cGVvZiBvYmplY3QucmVzb2x2ZSAhPT0gJ2Z1bmN0aW9uJyk7XG4gIH1cblxuICAvL1xuICBmdW5jdGlvbiByZXNvbHZlKCkge1xuICAgIHJldHVybiAkZGVmZXIoKS5yZXNvbHZlKCkucHJvbWlzZSgpO1xuICB9XG5cblxuICAvL1xuICBmdW5jdGlvbiByZWplY3QoKSB7XG4gICAgcmV0dXJuICRkZWZlcigpLnJlamVjdCgpLnByb21pc2UoKTtcbiAgfVxuXG5cbiAgLy9cbiAgZnVuY3Rpb24gcmVzb2x2ZVdpdGgoKSB7XG4gICAgdmFyIF9kZWZlciA9ICRkZWZlcigpO1xuICAgIHJldHVybiBfZGVmZXIucmVzb2x2ZS5hcHBseShfZGVmZXIsIGFyZ3VtZW50cykucHJvbWlzZSgpO1xuICB9XG5cbiAgLy9cbiAgZnVuY3Rpb24gcmVqZWN0V2l0aChlcnJvclByb3BlcnRpZXMpIHtcbiAgICB2YXIgX2RlZmVyID0gJGRlZmVyKCk7XG4gICAgdmFyIGVycm9yID0gbmV3IEhvb2RpZUVycm9yKGVycm9yUHJvcGVydGllcyk7XG4gICAgcmV0dXJuIF9kZWZlci5yZWplY3QoZXJyb3IpLnByb21pc2UoKTtcbiAgfVxuXG4gIC8vXG4gIC8vIFB1YmxpYyBBUElcbiAgLy9cbiAgaG9vZGllLmRlZmVyID0gJGRlZmVyO1xuICBob29kaWUuaXNQcm9taXNlID0gaXNQcm9taXNlO1xuICBob29kaWUucmVzb2x2ZSA9IHJlc29sdmU7XG4gIGhvb2RpZS5yZWplY3QgPSByZWplY3Q7XG4gIGhvb2RpZS5yZXNvbHZlV2l0aCA9IHJlc29sdmVXaXRoO1xuICBob29kaWUucmVqZWN0V2l0aCA9IHJlamVjdFdpdGg7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gaG9vZGllUHJvbWlzZXM7XG4iLCIvLyBSZW1vdGVcbi8vID09PT09PT09XG5cbi8vIENvbm5lY3Rpb24gdG8gYSByZW1vdGUgQ291Y2ggRGF0YWJhc2UuXG4vL1xuLy8gc3RvcmUgQVBJXG4vLyAtLS0tLS0tLS0tLS0tLS0tXG4vL1xuLy8gb2JqZWN0IGxvYWRpbmcgLyB1cGRhdGluZyAvIGRlbGV0aW5nXG4vL1xuLy8gKiBmaW5kKHR5cGUsIGlkKVxuLy8gKiBmaW5kQWxsKHR5cGUgKVxuLy8gKiBhZGQodHlwZSwgb2JqZWN0KVxuLy8gKiBzYXZlKHR5cGUsIGlkLCBvYmplY3QpXG4vLyAqIHVwZGF0ZSh0eXBlLCBpZCwgbmV3X3Byb3BlcnRpZXMgKVxuLy8gKiB1cGRhdGVBbGwoIHR5cGUsIG5ld19wcm9wZXJ0aWVzKVxuLy8gKiByZW1vdmUodHlwZSwgaWQpXG4vLyAqIHJlbW92ZUFsbCh0eXBlKVxuLy9cbi8vIGN1c3RvbSByZXF1ZXN0c1xuLy9cbi8vICogcmVxdWVzdCh2aWV3LCBwYXJhbXMpXG4vLyAqIGdldCh2aWV3LCBwYXJhbXMpXG4vLyAqIHBvc3QodmlldywgcGFyYW1zKVxuLy9cbi8vIHN5bmNocm9uaXphdGlvblxuLy9cbi8vICogY29ubmVjdCgpXG4vLyAqIGRpc2Nvbm5lY3QoKVxuLy8gKiBwdWxsKClcbi8vICogcHVzaCgpXG4vLyAqIHN5bmMoKVxuLy9cbi8vIGV2ZW50IGJpbmRpbmdcbi8vXG4vLyAqIG9uKGV2ZW50LCBjYWxsYmFjaylcbi8vXG52YXIgaG9vZGllU3RvcmVBcGkgPSByZXF1aXJlKCcuL3N0b3JlJyk7XG5cbi8vXG5mdW5jdGlvbiBob29kaWVSZW1vdGVTdG9yZSAoaG9vZGllLCBvcHRpb25zKSB7XG5cbiAgdmFyIHJlbW90ZVN0b3JlID0ge307XG5cblxuICAvLyBSZW1vdGUgU3RvcmUgUGVyc2lzdGFuY2UgbWV0aG9kc1xuICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbiAgLy8gZmluZFxuICAvLyAtLS0tLS1cblxuICAvLyBmaW5kIG9uZSBvYmplY3RcbiAgLy9cbiAgcmVtb3RlU3RvcmUuZmluZCA9IGZ1bmN0aW9uIGZpbmQodHlwZSwgaWQpIHtcbiAgICB2YXIgcGF0aDtcblxuICAgIHBhdGggPSB0eXBlICsgJy8nICsgaWQ7XG5cbiAgICBpZiAocmVtb3RlLnByZWZpeCkge1xuICAgICAgcGF0aCA9IHJlbW90ZS5wcmVmaXggKyBwYXRoO1xuICAgIH1cblxuICAgIHBhdGggPSAnLycgKyBlbmNvZGVVUklDb21wb25lbnQocGF0aCk7XG5cbiAgICByZXR1cm4gcmVtb3RlLnJlcXVlc3QoJ0dFVCcsIHBhdGgpLnRoZW4ocGFyc2VGcm9tUmVtb3RlKTtcbiAgfTtcblxuXG4gIC8vIGZpbmRBbGxcbiAgLy8gLS0tLS0tLS0tXG5cbiAgLy8gZmluZCBhbGwgb2JqZWN0cywgY2FuIGJlIGZpbGV0ZXJlZCBieSBhIHR5cGVcbiAgLy9cbiAgcmVtb3RlU3RvcmUuZmluZEFsbCA9IGZ1bmN0aW9uIGZpbmRBbGwodHlwZSkge1xuICAgIHZhciBlbmRrZXksIHBhdGgsIHN0YXJ0a2V5O1xuXG4gICAgcGF0aCA9ICcvX2FsbF9kb2NzP2luY2x1ZGVfZG9jcz10cnVlJztcblxuICAgIHN3aXRjaCAodHJ1ZSkge1xuICAgIGNhc2UgKHR5cGUgIT09IHVuZGVmaW5lZCkgJiYgcmVtb3RlLnByZWZpeCAhPT0gJyc6XG4gICAgICBzdGFydGtleSA9IHJlbW90ZS5wcmVmaXggKyB0eXBlICsgJy8nO1xuICAgICAgYnJlYWs7XG4gICAgY2FzZSB0eXBlICE9PSB1bmRlZmluZWQ6XG4gICAgICBzdGFydGtleSA9IHR5cGUgKyAnLyc7XG4gICAgICBicmVhaztcbiAgICBjYXNlIHJlbW90ZS5wcmVmaXggIT09ICcnOlxuICAgICAgc3RhcnRrZXkgPSByZW1vdGUucHJlZml4O1xuICAgICAgYnJlYWs7XG4gICAgZGVmYXVsdDpcbiAgICAgIHN0YXJ0a2V5ID0gJyc7XG4gICAgfVxuXG4gICAgaWYgKHN0YXJ0a2V5KSB7XG5cbiAgICAgIC8vIG1ha2Ugc3VyZSB0aGF0IG9ubHkgb2JqZWN0cyBzdGFydGluZyB3aXRoXG4gICAgICAvLyBgc3RhcnRrZXlgIHdpbGwgYmUgcmV0dXJuZWRcbiAgICAgIGVuZGtleSA9IHN0YXJ0a2V5LnJlcGxhY2UoLy4kLywgZnVuY3Rpb24oY2hhcnMpIHtcbiAgICAgICAgdmFyIGNoYXJDb2RlO1xuICAgICAgICBjaGFyQ29kZSA9IGNoYXJzLmNoYXJDb2RlQXQoMCk7XG4gICAgICAgIHJldHVybiBTdHJpbmcuZnJvbUNoYXJDb2RlKGNoYXJDb2RlICsgMSk7XG4gICAgICB9KTtcbiAgICAgIHBhdGggPSAnJyArIHBhdGggKyAnJnN0YXJ0a2V5PVwiJyArIChlbmNvZGVVUklDb21wb25lbnQoc3RhcnRrZXkpKSArICdcIiZlbmRrZXk9XCInICsgKGVuY29kZVVSSUNvbXBvbmVudChlbmRrZXkpKSArICdcIic7XG4gICAgfVxuXG4gICAgcmV0dXJuIHJlbW90ZS5yZXF1ZXN0KCdHRVQnLCBwYXRoKS50aGVuKG1hcERvY3NGcm9tRmluZEFsbCkudGhlbihwYXJzZUFsbEZyb21SZW1vdGUpO1xuICB9O1xuXG5cbiAgLy8gc2F2ZVxuICAvLyAtLS0tLS1cblxuICAvLyBzYXZlIGEgbmV3IG9iamVjdC4gSWYgaXQgZXhpc3RlZCBiZWZvcmUsIGFsbCBwcm9wZXJ0aWVzXG4gIC8vIHdpbGwgYmUgb3ZlcndyaXR0ZW5cbiAgLy9cbiAgcmVtb3RlU3RvcmUuc2F2ZSA9IGZ1bmN0aW9uIHNhdmUob2JqZWN0KSB7XG4gICAgdmFyIHBhdGg7XG5cbiAgICBpZiAoIW9iamVjdC5pZCkge1xuICAgICAgb2JqZWN0LmlkID0gaG9vZGllLmdlbmVyYXRlSWQoKTtcbiAgICB9XG5cbiAgICBvYmplY3QgPSBwYXJzZUZvclJlbW90ZShvYmplY3QpO1xuICAgIHBhdGggPSAnLycgKyBlbmNvZGVVUklDb21wb25lbnQob2JqZWN0Ll9pZCk7XG4gICAgcmV0dXJuIHJlbW90ZS5yZXF1ZXN0KCdQVVQnLCBwYXRoLCB7XG4gICAgICBkYXRhOiBvYmplY3RcbiAgICB9KTtcbiAgfTtcblxuXG4gIC8vIHJlbW92ZVxuICAvLyAtLS0tLS0tLS1cblxuICAvLyByZW1vdmUgb25lIG9iamVjdFxuICAvL1xuICByZW1vdGVTdG9yZS5yZW1vdmUgPSBmdW5jdGlvbiByZW1vdmUodHlwZSwgaWQpIHtcbiAgICByZXR1cm4gcmVtb3RlLnVwZGF0ZSh0eXBlLCBpZCwge1xuICAgICAgX2RlbGV0ZWQ6IHRydWVcbiAgICB9KTtcbiAgfTtcblxuXG4gIC8vIHJlbW92ZUFsbFxuICAvLyAtLS0tLS0tLS0tLS1cblxuICAvLyByZW1vdmUgYWxsIG9iamVjdHMsIGNhbiBiZSBmaWx0ZXJlZCBieSB0eXBlXG4gIC8vXG4gIHJlbW90ZVN0b3JlLnJlbW92ZUFsbCA9IGZ1bmN0aW9uIHJlbW92ZUFsbCh0eXBlKSB7XG4gICAgcmV0dXJuIHJlbW90ZS51cGRhdGVBbGwodHlwZSwge1xuICAgICAgX2RlbGV0ZWQ6IHRydWVcbiAgICB9KTtcbiAgfTtcblxuXG4gIHZhciByZW1vdGUgPSBob29kaWVTdG9yZUFwaShob29kaWUsIHtcblxuICAgIG5hbWU6IG9wdGlvbnMubmFtZSxcblxuICAgIGJhY2tlbmQ6IHtcbiAgICAgIHNhdmU6IHJlbW90ZVN0b3JlLnNhdmUsXG4gICAgICBmaW5kOiByZW1vdGVTdG9yZS5maW5kLFxuICAgICAgZmluZEFsbDogcmVtb3RlU3RvcmUuZmluZEFsbCxcbiAgICAgIHJlbW92ZTogcmVtb3RlU3RvcmUucmVtb3ZlLFxuICAgICAgcmVtb3ZlQWxsOiByZW1vdGVTdG9yZS5yZW1vdmVBbGxcbiAgICB9XG4gIH0pO1xuXG5cblxuXG5cbiAgLy8gcHJvcGVydGllc1xuICAvLyAtLS0tLS0tLS0tLS1cblxuICAvLyBuYW1lXG5cbiAgLy8gdGhlIG5hbWUgb2YgdGhlIFJlbW90ZSBpcyB0aGUgbmFtZSBvZiB0aGVcbiAgLy8gQ291Y2hEQiBkYXRhYmFzZSBhbmQgaXMgYWxzbyB1c2VkIHRvIHByZWZpeFxuICAvLyB0cmlnZ2VyZWQgZXZlbnRzXG4gIC8vXG4gIHZhciByZW1vdGVOYW1lID0gbnVsbDtcblxuXG4gIC8vIHN5bmNcblxuICAvLyBpZiBzZXQgdG8gdHJ1ZSwgdXBkYXRlcyB3aWxsIGJlIGNvbnRpbnVvdXNseSBwdWxsZWRcbiAgLy8gYW5kIHB1c2hlZC4gQWx0ZXJuYXRpdmVseSwgYHN5bmNgIGNhbiBiZSBzZXQgdG9cbiAgLy8gYHB1bGw6IHRydWVgIG9yIGBwdXNoOiB0cnVlYC5cbiAgLy9cbiAgcmVtb3RlLmNvbm5lY3RlZCA9IGZhbHNlO1xuXG5cbiAgLy8gcHJlZml4XG5cbiAgLy8gcHJlZml4IGZvciBkb2NzIGluIGEgQ291Y2hEQiBkYXRhYmFzZSwgZS5nLiBhbGwgZG9jc1xuICAvLyBpbiBwdWJsaWMgdXNlciBzdG9yZXMgYXJlIHByZWZpeGVkIGJ5ICckcHVibGljLydcbiAgLy9cbiAgcmVtb3RlLnByZWZpeCA9ICcnO1xuICB2YXIgcmVtb3RlUHJlZml4UGF0dGVybiA9IG5ldyBSZWdFeHAoJ14nKTtcblxuXG4gIC8vIGRlZmF1bHRzXG4gIC8vIC0tLS0tLS0tLS0tLS0tLS1cblxuICAvL1xuICBpZiAob3B0aW9ucy5uYW1lICE9PSB1bmRlZmluZWQpIHtcbiAgICByZW1vdGVOYW1lID0gb3B0aW9ucy5uYW1lO1xuICB9XG5cbiAgaWYgKG9wdGlvbnMucHJlZml4ICE9PSB1bmRlZmluZWQpIHtcbiAgICByZW1vdGUucHJlZml4ID0gb3B0aW9ucy5wcmVmaXg7XG4gICAgcmVtb3RlUHJlZml4UGF0dGVybiA9IG5ldyBSZWdFeHAoJ14nICsgcmVtb3RlLnByZWZpeCk7XG4gIH1cblxuICBpZiAob3B0aW9ucy5iYXNlVXJsICE9PSBudWxsKSB7XG4gICAgcmVtb3RlLmJhc2VVcmwgPSBvcHRpb25zLmJhc2VVcmw7XG4gIH1cblxuXG4gIC8vIHJlcXVlc3RcbiAgLy8gLS0tLS0tLS0tXG5cbiAgLy8gd3JhcHBlciBmb3IgaG9vZGllLnJlcXVlc3QsIHdpdGggc29tZSBzdG9yZSBzcGVjaWZpYyBkZWZhdWx0c1xuICAvLyBhbmQgYSBwcmVmaXhlZCBwYXRoXG4gIC8vXG4gIHJlbW90ZS5yZXF1ZXN0ID0gZnVuY3Rpb24gcmVxdWVzdCh0eXBlLCBwYXRoLCBvcHRpb25zKSB7XG4gICAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG5cbiAgICBpZiAocmVtb3RlTmFtZSkge1xuICAgICAgcGF0aCA9ICcvJyArIChlbmNvZGVVUklDb21wb25lbnQocmVtb3RlTmFtZSkpICsgcGF0aDtcbiAgICB9XG5cbiAgICBpZiAocmVtb3RlLmJhc2VVcmwpIHtcbiAgICAgIHBhdGggPSAnJyArIHJlbW90ZS5iYXNlVXJsICsgcGF0aDtcbiAgICB9XG5cbiAgICBvcHRpb25zLmNvbnRlbnRUeXBlID0gb3B0aW9ucy5jb250ZW50VHlwZSB8fCAnYXBwbGljYXRpb24vanNvbic7XG5cbiAgICBpZiAodHlwZSA9PT0gJ1BPU1QnIHx8IHR5cGUgPT09ICdQVVQnKSB7XG4gICAgICBvcHRpb25zLmRhdGFUeXBlID0gb3B0aW9ucy5kYXRhVHlwZSB8fCAnanNvbic7XG4gICAgICBvcHRpb25zLnByb2Nlc3NEYXRhID0gb3B0aW9ucy5wcm9jZXNzRGF0YSB8fCBmYWxzZTtcbiAgICAgIG9wdGlvbnMuZGF0YSA9IEpTT04uc3RyaW5naWZ5KG9wdGlvbnMuZGF0YSk7XG4gICAgfVxuICAgIHJldHVybiBob29kaWUucmVxdWVzdCh0eXBlLCBwYXRoLCBvcHRpb25zKTtcbiAgfTtcblxuXG4gIC8vIGlzS25vd25PYmplY3RcbiAgLy8gLS0tLS0tLS0tLS0tLS0tXG5cbiAgLy8gZGV0ZXJtaW5lIGJldHdlZW4gYSBrbm93biBhbmQgYSBuZXcgb2JqZWN0XG4gIC8vXG4gIHJlbW90ZS5pc0tub3duT2JqZWN0ID0gZnVuY3Rpb24gaXNLbm93bk9iamVjdChvYmplY3QpIHtcbiAgICB2YXIga2V5ID0gJycgKyBvYmplY3QudHlwZSArICcvJyArIG9iamVjdC5pZDtcblxuICAgIGlmIChrbm93bk9iamVjdHNba2V5XSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICByZXR1cm4ga25vd25PYmplY3RzW2tleV07XG4gICAgfVxuICB9O1xuXG5cbiAgLy8gbWFya0FzS25vd25PYmplY3RcbiAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG4gIC8vIGRldGVybWluZSBiZXR3ZWVuIGEga25vd24gYW5kIGEgbmV3IG9iamVjdFxuICAvL1xuICByZW1vdGUubWFya0FzS25vd25PYmplY3QgPSBmdW5jdGlvbiBtYXJrQXNLbm93bk9iamVjdChvYmplY3QpIHtcbiAgICB2YXIga2V5ID0gJycgKyBvYmplY3QudHlwZSArICcvJyArIG9iamVjdC5pZDtcbiAgICBrbm93bk9iamVjdHNba2V5XSA9IDE7XG4gICAgcmV0dXJuIGtub3duT2JqZWN0c1trZXldO1xuICB9O1xuXG5cbiAgLy8gc3luY2hyb25pemF0aW9uXG4gIC8vIC0tLS0tLS0tLS0tLS0tLS0tXG5cbiAgLy8gQ29ubmVjdFxuICAvLyAtLS0tLS0tLS1cblxuICAvLyBzdGFydCBzeW5jaW5nLiBgcmVtb3RlLmJvb3RzdHJhcCgpYCB3aWxsIGF1dG9tYXRpY2FsbHkgc3RhcnRcbiAgLy8gcHVsbGluZyB3aGVuIGByZW1vdGUuY29ubmVjdGVkYCByZW1haW5zIHRydWUuXG4gIC8vXG4gIHJlbW90ZS5jb25uZWN0ID0gZnVuY3Rpb24gY29ubmVjdChuYW1lKSB7XG4gICAgaWYgKG5hbWUpIHtcbiAgICAgIHJlbW90ZU5hbWUgPSBuYW1lO1xuICAgIH1cbiAgICByZW1vdGUuY29ubmVjdGVkID0gdHJ1ZTtcbiAgICByZW1vdGUudHJpZ2dlcignY29ubmVjdCcpO1xuICAgIHJldHVybiByZW1vdGUuYm9vdHN0cmFwKCkudGhlbiggZnVuY3Rpb24oKSB7IHJlbW90ZS5wdXNoKCk7IH0gKTtcbiAgfTtcblxuXG4gIC8vIERpc2Nvbm5lY3RcbiAgLy8gLS0tLS0tLS0tLS0tXG5cbiAgLy8gc3RvcCBzeW5jaW5nIGNoYW5nZXMgZnJvbSByZW1vdGUgc3RvcmVcbiAgLy9cbiAgcmVtb3RlLmRpc2Nvbm5lY3QgPSBmdW5jdGlvbiBkaXNjb25uZWN0KCkge1xuICAgIHJlbW90ZS5jb25uZWN0ZWQgPSBmYWxzZTtcbiAgICByZW1vdGUudHJpZ2dlcignZGlzY29ubmVjdCcpOyAvLyBUT0RPOiBzcGVjIHRoYXRcblxuICAgIGlmIChwdWxsUmVxdWVzdCkge1xuICAgICAgcHVsbFJlcXVlc3QuYWJvcnQoKTtcbiAgICB9XG5cbiAgICBpZiAocHVzaFJlcXVlc3QpIHtcbiAgICAgIHB1c2hSZXF1ZXN0LmFib3J0KCk7XG4gICAgfVxuXG4gIH07XG5cblxuICAvLyBpc0Nvbm5lY3RlZFxuICAvLyAtLS0tLS0tLS0tLS0tXG5cbiAgLy9cbiAgcmVtb3RlLmlzQ29ubmVjdGVkID0gZnVuY3Rpb24gaXNDb25uZWN0ZWQoKSB7XG4gICAgcmV0dXJuIHJlbW90ZS5jb25uZWN0ZWQ7XG4gIH07XG5cblxuICAvLyBnZXRTaW5jZU5yXG4gIC8vIC0tLS0tLS0tLS0tLVxuXG4gIC8vIHJldHVybnMgdGhlIHNlcXVlbmNlIG51bWJlciBmcm9tIHdpY2ggdG8gc3RhcnQgdG8gZmluZCBjaGFuZ2VzIGluIHB1bGxcbiAgLy9cbiAgdmFyIHNpbmNlID0gb3B0aW9ucy5zaW5jZSB8fCAwOyAvLyBUT0RPOiBzcGVjIHRoYXQhXG4gIHJlbW90ZS5nZXRTaW5jZU5yID0gZnVuY3Rpb24gZ2V0U2luY2VOcigpIHtcbiAgICBpZiAodHlwZW9mIHNpbmNlID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICByZXR1cm4gc2luY2UoKTtcbiAgICB9XG5cbiAgICByZXR1cm4gc2luY2U7XG4gIH07XG5cblxuICAvLyBib290c3RyYXBcbiAgLy8gLS0tLS0tLS0tLS1cblxuICAvLyBpbml0YWwgcHVsbCBvZiBkYXRhIG9mIHRoZSByZW1vdGUgc3RvcmUuIEJ5IGRlZmF1bHQsIHdlIHB1bGwgYWxsXG4gIC8vIGNoYW5nZXMgc2luY2UgdGhlIGJlZ2lubmluZywgYnV0IHRoaXMgYmVoYXZpb3IgbWlnaHQgYmUgYWRqdXN0ZWQsXG4gIC8vIGUuZyBmb3IgYSBmaWx0ZXJlZCBib290c3RyYXAuXG4gIC8vXG4gIHZhciBpc0Jvb3RzdHJhcHBpbmcgPSBmYWxzZTtcbiAgcmVtb3RlLmJvb3RzdHJhcCA9IGZ1bmN0aW9uIGJvb3RzdHJhcCgpIHtcbiAgICBpc0Jvb3RzdHJhcHBpbmcgPSB0cnVlO1xuICAgIHJlbW90ZS50cmlnZ2VyKCdib290c3RyYXA6c3RhcnQnKTtcbiAgICByZXR1cm4gcmVtb3RlLnB1bGwoKS5kb25lKCBoYW5kbGVCb290c3RyYXBTdWNjZXNzICk7XG4gIH07XG5cblxuICAvLyBwdWxsIGNoYW5nZXNcbiAgLy8gLS0tLS0tLS0tLS0tLS1cblxuICAvLyBhLmsuYS4gbWFrZSBhIEdFVCByZXF1ZXN0IHRvIENvdWNoREIncyBgX2NoYW5nZXNgIGZlZWQuXG4gIC8vIFdlIGN1cnJlbnRseSBtYWtlIGxvbmcgcG9sbCByZXF1ZXN0cywgdGhhdCB3ZSBtYW51YWxseSBhYm9ydFxuICAvLyBhbmQgcmVzdGFydCBlYWNoIDI1IHNlY29uZHMuXG4gIC8vXG4gIHZhciBwdWxsUmVxdWVzdCwgcHVsbFJlcXVlc3RUaW1lb3V0O1xuICByZW1vdGUucHVsbCA9IGZ1bmN0aW9uIHB1bGwoKSB7XG4gICAgcHVsbFJlcXVlc3QgPSByZW1vdGUucmVxdWVzdCgnR0VUJywgcHVsbFVybCgpKTtcblxuICAgIGlmIChyZW1vdGUuaXNDb25uZWN0ZWQoKSkge1xuICAgICAgd2luZG93LmNsZWFyVGltZW91dChwdWxsUmVxdWVzdFRpbWVvdXQpO1xuICAgICAgcHVsbFJlcXVlc3RUaW1lb3V0ID0gd2luZG93LnNldFRpbWVvdXQocmVzdGFydFB1bGxSZXF1ZXN0LCAyNTAwMCk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHB1bGxSZXF1ZXN0LmRvbmUoaGFuZGxlUHVsbFN1Y2Nlc3MpLmZhaWwoaGFuZGxlUHVsbEVycm9yKTtcbiAgfTtcblxuXG4gIC8vIHB1c2ggY2hhbmdlc1xuICAvLyAtLS0tLS0tLS0tLS0tLVxuXG4gIC8vIFB1c2ggb2JqZWN0cyB0byByZW1vdGUgc3RvcmUgdXNpbmcgdGhlIGBfYnVsa19kb2NzYCBBUEkuXG4gIC8vXG4gIHZhciBwdXNoUmVxdWVzdDtcbiAgcmVtb3RlLnB1c2ggPSBmdW5jdGlvbiBwdXNoKG9iamVjdHMpIHtcbiAgICB2YXIgb2JqZWN0LCBvYmplY3RzRm9yUmVtb3RlLCBfaSwgX2xlbjtcblxuICAgIGlmICghJC5pc0FycmF5KG9iamVjdHMpKSB7XG4gICAgICBvYmplY3RzID0gZGVmYXVsdE9iamVjdHNUb1B1c2goKTtcbiAgICB9XG5cbiAgICBpZiAob2JqZWN0cy5sZW5ndGggPT09IDApIHtcbiAgICAgIHJldHVybiBob29kaWUucmVzb2x2ZVdpdGgoW10pO1xuICAgIH1cblxuICAgIG9iamVjdHNGb3JSZW1vdGUgPSBbXTtcblxuICAgIGZvciAoX2kgPSAwLCBfbGVuID0gb2JqZWN0cy5sZW5ndGg7IF9pIDwgX2xlbjsgX2krKykge1xuXG4gICAgICAvLyBkb24ndCBtZXNzIHdpdGggb3JpZ2luYWwgb2JqZWN0c1xuICAgICAgb2JqZWN0ID0gJC5leHRlbmQodHJ1ZSwge30sIG9iamVjdHNbX2ldKTtcbiAgICAgIGFkZFJldmlzaW9uVG8ob2JqZWN0KTtcbiAgICAgIG9iamVjdCA9IHBhcnNlRm9yUmVtb3RlKG9iamVjdCk7XG4gICAgICBvYmplY3RzRm9yUmVtb3RlLnB1c2gob2JqZWN0KTtcbiAgICB9XG4gICAgcHVzaFJlcXVlc3QgPSByZW1vdGUucmVxdWVzdCgnUE9TVCcsICcvX2J1bGtfZG9jcycsIHtcbiAgICAgIGRhdGE6IHtcbiAgICAgICAgZG9jczogb2JqZWN0c0ZvclJlbW90ZSxcbiAgICAgICAgbmV3X2VkaXRzOiBmYWxzZVxuICAgICAgfVxuICAgIH0pO1xuXG4gICAgcHVzaFJlcXVlc3QuZG9uZShmdW5jdGlvbigpIHtcbiAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgb2JqZWN0cy5sZW5ndGg7IGkrKykge1xuICAgICAgICByZW1vdGUudHJpZ2dlcigncHVzaCcsIG9iamVjdHNbaV0pO1xuICAgICAgfVxuICAgIH0pO1xuICAgIHJldHVybiBwdXNoUmVxdWVzdDtcbiAgfTtcblxuICAvLyBzeW5jIGNoYW5nZXNcbiAgLy8gLS0tLS0tLS0tLS0tLS1cblxuICAvLyBwdXNoIG9iamVjdHMsIHRoZW4gcHVsbCB1cGRhdGVzLlxuICAvL1xuICByZW1vdGUuc3luYyA9IGZ1bmN0aW9uIHN5bmMob2JqZWN0cykge1xuICAgIHJldHVybiByZW1vdGUucHVzaChvYmplY3RzKS50aGVuKHJlbW90ZS5wdWxsKTtcbiAgfTtcblxuICAvL1xuICAvLyBQcml2YXRlXG4gIC8vIC0tLS0tLS0tLVxuICAvL1xuXG4gIC8vIGluIG9yZGVyIHRvIGRpZmZlcmVudGlhdGUgd2hldGhlciBhbiBvYmplY3QgZnJvbSByZW1vdGUgc2hvdWxkIHRyaWdnZXIgYSAnbmV3J1xuICAvLyBvciBhbiAndXBkYXRlJyBldmVudCwgd2Ugc3RvcmUgYSBoYXNoIG9mIGtub3duIG9iamVjdHNcbiAgdmFyIGtub3duT2JqZWN0cyA9IHt9O1xuXG5cbiAgLy8gdmFsaWQgQ291Y2hEQiBkb2MgYXR0cmlidXRlcyBzdGFydGluZyB3aXRoIGFuIHVuZGVyc2NvcmVcbiAgLy9cbiAgdmFyIHZhbGlkU3BlY2lhbEF0dHJpYnV0ZXMgPSBbJ19pZCcsICdfcmV2JywgJ19kZWxldGVkJywgJ19yZXZpc2lvbnMnLCAnX2F0dGFjaG1lbnRzJ107XG5cblxuICAvLyBkZWZhdWx0IG9iamVjdHMgdG8gcHVzaFxuICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG4gIC8vIHdoZW4gcHVzaGVkIHdpdGhvdXQgcGFzc2luZyBhbnkgb2JqZWN0cywgdGhlIG9iamVjdHMgcmV0dXJuZWQgZnJvbVxuICAvLyB0aGlzIG1ldGhvZCB3aWxsIGJlIHBhc3NlZC4gSXQgY2FuIGJlIG92ZXJ3cml0dGVuIGJ5IHBhc3NpbmcgYW5cbiAgLy8gYXJyYXkgb2Ygb2JqZWN0cyBvciBhIGZ1bmN0aW9uIGFzIGBvcHRpb25zLm9iamVjdHNgXG4gIC8vXG4gIHZhciBkZWZhdWx0T2JqZWN0c1RvUHVzaCA9IGZ1bmN0aW9uIGRlZmF1bHRPYmplY3RzVG9QdXNoKCkge1xuICAgIHJldHVybiBbXTtcbiAgfTtcbiAgaWYgKG9wdGlvbnMuZGVmYXVsdE9iamVjdHNUb1B1c2gpIHtcbiAgICBpZiAoJC5pc0FycmF5KG9wdGlvbnMuZGVmYXVsdE9iamVjdHNUb1B1c2gpKSB7XG4gICAgICBkZWZhdWx0T2JqZWN0c1RvUHVzaCA9IGZ1bmN0aW9uIGRlZmF1bHRPYmplY3RzVG9QdXNoKCkge1xuICAgICAgICByZXR1cm4gb3B0aW9ucy5kZWZhdWx0T2JqZWN0c1RvUHVzaDtcbiAgICAgIH07XG4gICAgfSBlbHNlIHtcbiAgICAgIGRlZmF1bHRPYmplY3RzVG9QdXNoID0gb3B0aW9ucy5kZWZhdWx0T2JqZWN0c1RvUHVzaDtcbiAgICB9XG4gIH1cblxuXG4gIC8vIHNldFNpbmNlTnJcbiAgLy8gLS0tLS0tLS0tLS0tXG5cbiAgLy8gc2V0cyB0aGUgc2VxdWVuY2UgbnVtYmVyIGZyb20gd2ljaCB0byBzdGFydCB0byBmaW5kIGNoYW5nZXMgaW4gcHVsbC5cbiAgLy8gSWYgcmVtb3RlIHN0b3JlIHdhcyBpbml0aWFsaXplZCB3aXRoIHNpbmNlIDogZnVuY3Rpb24obnIpIHsgLi4uIH0sXG4gIC8vIGNhbGwgdGhlIGZ1bmN0aW9uIHdpdGggdGhlIHNlcSBwYXNzZWQuIE90aGVyd2lzZSBzaW1wbHkgc2V0IHRoZSBzZXFcbiAgLy8gbnVtYmVyIGFuZCByZXR1cm4gaXQuXG4gIC8vXG4gIGZ1bmN0aW9uIHNldFNpbmNlTnIoc2VxKSB7XG4gICAgaWYgKHR5cGVvZiBzaW5jZSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgcmV0dXJuIHNpbmNlKHNlcSk7XG4gICAgfVxuXG4gICAgc2luY2UgPSBzZXE7XG4gICAgcmV0dXJuIHNpbmNlO1xuICB9XG5cblxuICAvLyBQYXJzZSBmb3IgcmVtb3RlXG4gIC8vIC0tLS0tLS0tLS0tLS0tLS0tLVxuXG4gIC8vIHBhcnNlIG9iamVjdCBmb3IgcmVtb3RlIHN0b3JhZ2UuIEFsbCBwcm9wZXJ0aWVzIHN0YXJ0aW5nIHdpdGggYW5cbiAgLy8gYHVuZGVyc2NvcmVgIGRvIG5vdCBnZXQgc3luY2hyb25pemVkIGRlc3BpdGUgdGhlIHNwZWNpYWwgcHJvcGVydGllc1xuICAvLyBgX2lkYCwgYF9yZXZgIGFuZCBgX2RlbGV0ZWRgIChzZWUgYWJvdmUpXG4gIC8vXG4gIC8vIEFsc28gYGlkYCBnZXRzIHJlcGxhY2VkIHdpdGggYF9pZGAgd2hpY2ggY29uc2lzdHMgb2YgdHlwZSAmIGlkXG4gIC8vXG4gIGZ1bmN0aW9uIHBhcnNlRm9yUmVtb3RlKG9iamVjdCkge1xuICAgIHZhciBhdHRyLCBwcm9wZXJ0aWVzO1xuICAgIHByb3BlcnRpZXMgPSAkLmV4dGVuZCh7fSwgb2JqZWN0KTtcblxuICAgIGZvciAoYXR0ciBpbiBwcm9wZXJ0aWVzKSB7XG4gICAgICBpZiAocHJvcGVydGllcy5oYXNPd25Qcm9wZXJ0eShhdHRyKSkge1xuICAgICAgICBpZiAodmFsaWRTcGVjaWFsQXR0cmlidXRlcy5pbmRleE9mKGF0dHIpICE9PSAtMSkge1xuICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG4gICAgICAgIGlmICghL15fLy50ZXN0KGF0dHIpKSB7XG4gICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cbiAgICAgICAgZGVsZXRlIHByb3BlcnRpZXNbYXR0cl07XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gcHJlcGFyZSBDb3VjaERCIGlkXG4gICAgcHJvcGVydGllcy5faWQgPSAnJyArIHByb3BlcnRpZXMudHlwZSArICcvJyArIHByb3BlcnRpZXMuaWQ7XG4gICAgaWYgKHJlbW90ZS5wcmVmaXgpIHtcbiAgICAgIHByb3BlcnRpZXMuX2lkID0gJycgKyByZW1vdGUucHJlZml4ICsgcHJvcGVydGllcy5faWQ7XG4gICAgfVxuICAgIGRlbGV0ZSBwcm9wZXJ0aWVzLmlkO1xuICAgIHJldHVybiBwcm9wZXJ0aWVzO1xuICB9XG5cblxuICAvLyAjIyMgX3BhcnNlRnJvbVJlbW90ZVxuXG4gIC8vIG5vcm1hbGl6ZSBvYmplY3RzIGNvbWluZyBmcm9tIHJlbW90ZVxuICAvL1xuICAvLyByZW5hbWVzIGBfaWRgIGF0dHJpYnV0ZSB0byBgaWRgIGFuZCByZW1vdmVzIHRoZSB0eXBlIGZyb20gdGhlIGlkLFxuICAvLyBlLmcuIGB0eXBlLzEyM2AgLT4gYDEyM2BcbiAgLy9cbiAgZnVuY3Rpb24gcGFyc2VGcm9tUmVtb3RlKG9iamVjdCkge1xuICAgIHZhciBpZCwgaWdub3JlLCBfcmVmO1xuXG4gICAgLy8gaGFuZGxlIGlkIGFuZCB0eXBlXG4gICAgaWQgPSBvYmplY3QuX2lkIHx8IG9iamVjdC5pZDtcbiAgICBkZWxldGUgb2JqZWN0Ll9pZDtcblxuICAgIGlmIChyZW1vdGUucHJlZml4KSB7XG4gICAgICBpZCA9IGlkLnJlcGxhY2UocmVtb3RlUHJlZml4UGF0dGVybiwgJycpO1xuICAgICAgLy8gaWQgPSBpZC5yZXBsYWNlKG5ldyBSZWdFeHAoJ14nICsgcmVtb3RlLnByZWZpeCksICcnKTtcbiAgICB9XG5cbiAgICAvLyB0dXJuIGRvYy8xMjMgaW50byB0eXBlID0gZG9jICYgaWQgPSAxMjNcbiAgICAvLyBOT1RFOiB3ZSBkb24ndCB1c2UgYSBzaW1wbGUgaWQuc3BsaXQoL1xcLy8pIGhlcmUsXG4gICAgLy8gYXMgaW4gc29tZSBjYXNlcyBJRHMgbWlnaHQgY29udGFpbiAnLycsIHRvb1xuICAgIC8vXG4gICAgX3JlZiA9IGlkLm1hdGNoKC8oW15cXC9dKylcXC8oLiopLyksXG4gICAgaWdub3JlID0gX3JlZlswXSxcbiAgICBvYmplY3QudHlwZSA9IF9yZWZbMV0sXG4gICAgb2JqZWN0LmlkID0gX3JlZlsyXTtcblxuICAgIHJldHVybiBvYmplY3Q7XG4gIH1cblxuICBmdW5jdGlvbiBwYXJzZUFsbEZyb21SZW1vdGUob2JqZWN0cykge1xuICAgIHZhciBvYmplY3QsIF9pLCBfbGVuLCBfcmVzdWx0cztcbiAgICBfcmVzdWx0cyA9IFtdO1xuICAgIGZvciAoX2kgPSAwLCBfbGVuID0gb2JqZWN0cy5sZW5ndGg7IF9pIDwgX2xlbjsgX2krKykge1xuICAgICAgb2JqZWN0ID0gb2JqZWN0c1tfaV07XG4gICAgICBfcmVzdWx0cy5wdXNoKHBhcnNlRnJvbVJlbW90ZShvYmplY3QpKTtcbiAgICB9XG4gICAgcmV0dXJuIF9yZXN1bHRzO1xuICB9XG5cblxuICAvLyAjIyMgX2FkZFJldmlzaW9uVG9cblxuICAvLyBleHRlbmRzIHBhc3NlZCBvYmplY3Qgd2l0aCBhIF9yZXYgcHJvcGVydHlcbiAgLy9cbiAgZnVuY3Rpb24gYWRkUmV2aXNpb25UbyhhdHRyaWJ1dGVzKSB7XG4gICAgdmFyIGN1cnJlbnRSZXZJZCwgY3VycmVudFJldk5yLCBuZXdSZXZpc2lvbklkLCBfcmVmO1xuICAgIHRyeSB7XG4gICAgICBfcmVmID0gYXR0cmlidXRlcy5fcmV2LnNwbGl0KC8tLyksXG4gICAgICBjdXJyZW50UmV2TnIgPSBfcmVmWzBdLFxuICAgICAgY3VycmVudFJldklkID0gX3JlZlsxXTtcbiAgICB9IGNhdGNoIChfZXJyb3IpIHt9XG4gICAgY3VycmVudFJldk5yID0gcGFyc2VJbnQoY3VycmVudFJldk5yLCAxMCkgfHwgMDtcbiAgICBuZXdSZXZpc2lvbklkID0gZ2VuZXJhdGVOZXdSZXZpc2lvbklkKCk7XG5cbiAgICAvLyBsb2NhbCBjaGFuZ2VzIGFyZSBub3QgbWVhbnQgdG8gYmUgcmVwbGljYXRlZCBvdXRzaWRlIG9mIHRoZVxuICAgIC8vIHVzZXJzIGRhdGFiYXNlLCB0aGVyZWZvcmUgdGhlIGAtbG9jYWxgIHN1ZmZpeC5cbiAgICBpZiAoYXR0cmlidXRlcy5fJGxvY2FsKSB7XG4gICAgICBuZXdSZXZpc2lvbklkICs9ICctbG9jYWwnO1xuICAgIH1cblxuICAgIGF0dHJpYnV0ZXMuX3JldiA9ICcnICsgKGN1cnJlbnRSZXZOciArIDEpICsgJy0nICsgbmV3UmV2aXNpb25JZDtcbiAgICBhdHRyaWJ1dGVzLl9yZXZpc2lvbnMgPSB7XG4gICAgICBzdGFydDogMSxcbiAgICAgIGlkczogW25ld1JldmlzaW9uSWRdXG4gICAgfTtcblxuICAgIGlmIChjdXJyZW50UmV2SWQpIHtcbiAgICAgIGF0dHJpYnV0ZXMuX3JldmlzaW9ucy5zdGFydCArPSBjdXJyZW50UmV2TnI7XG4gICAgICByZXR1cm4gYXR0cmlidXRlcy5fcmV2aXNpb25zLmlkcy5wdXNoKGN1cnJlbnRSZXZJZCk7XG4gICAgfVxuICB9XG5cblxuICAvLyAjIyMgZ2VuZXJhdGUgbmV3IHJldmlzaW9uIGlkXG5cbiAgLy9cbiAgZnVuY3Rpb24gZ2VuZXJhdGVOZXdSZXZpc2lvbklkKCkge1xuICAgIHJldHVybiBob29kaWUuZ2VuZXJhdGVJZCg5KTtcbiAgfVxuXG5cbiAgLy8gIyMjIG1hcCBkb2NzIGZyb20gZmluZEFsbFxuXG4gIC8vXG4gIGZ1bmN0aW9uIG1hcERvY3NGcm9tRmluZEFsbChyZXNwb25zZSkge1xuICAgIHJldHVybiByZXNwb25zZS5yb3dzLm1hcChmdW5jdGlvbihyb3cpIHtcbiAgICAgIHJldHVybiByb3cuZG9jO1xuICAgIH0pO1xuICB9XG5cblxuICAvLyAjIyMgcHVsbCB1cmxcblxuICAvLyBEZXBlbmRpbmcgb24gd2hldGhlciByZW1vdGUgaXMgY29ubmVjdGVkICg9IHB1bGxpbmcgY2hhbmdlcyBjb250aW51b3VzbHkpXG4gIC8vIHJldHVybiBhIGxvbmdwb2xsIFVSTCBvciBub3QuIElmIGl0IGlzIGEgYmVnaW5uaW5nIGJvb3RzdHJhcCByZXF1ZXN0LCBkb1xuICAvLyBub3QgcmV0dXJuIGEgbG9uZ3BvbGwgVVJMLCBhcyB3ZSB3YW50IGl0IHRvIGZpbmlzaCByaWdodCBhd2F5LCBldmVuIGlmIHRoZXJlXG4gIC8vIGFyZSBubyBjaGFuZ2VzIG9uIHJlbW90ZS5cbiAgLy9cbiAgZnVuY3Rpb24gcHVsbFVybCgpIHtcbiAgICB2YXIgc2luY2U7XG4gICAgc2luY2UgPSByZW1vdGUuZ2V0U2luY2VOcigpO1xuICAgIGlmIChyZW1vdGUuaXNDb25uZWN0ZWQoKSAmJiAhaXNCb290c3RyYXBwaW5nKSB7XG4gICAgICByZXR1cm4gJy9fY2hhbmdlcz9pbmNsdWRlX2RvY3M9dHJ1ZSZzaW5jZT0nICsgc2luY2UgKyAnJmhlYXJ0YmVhdD0xMDAwMCZmZWVkPWxvbmdwb2xsJztcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuICcvX2NoYW5nZXM/aW5jbHVkZV9kb2NzPXRydWUmc2luY2U9JyArIHNpbmNlO1xuICAgIH1cbiAgfVxuXG5cbiAgLy8gIyMjIHJlc3RhcnQgcHVsbCByZXF1ZXN0XG5cbiAgLy8gcmVxdWVzdCBnZXRzIHJlc3RhcnRlZCBhdXRvbWF0aWNjYWxseVxuICAvLyB3aGVuIGFib3J0ZWQgKHNlZSBoYW5kbGVQdWxsRXJyb3IpXG4gIGZ1bmN0aW9uIHJlc3RhcnRQdWxsUmVxdWVzdCgpIHtcbiAgICBpZiAocHVsbFJlcXVlc3QpIHtcbiAgICAgIHB1bGxSZXF1ZXN0LmFib3J0KCk7XG4gICAgfVxuICB9XG5cblxuICAvLyAjIyMgcHVsbCBzdWNjZXNzIGhhbmRsZXJcblxuICAvLyByZXF1ZXN0IGdldHMgcmVzdGFydGVkIGF1dG9tYXRpY2NhbGx5XG4gIC8vIHdoZW4gYWJvcnRlZCAoc2VlIGhhbmRsZVB1bGxFcnJvcilcbiAgLy9cbiAgZnVuY3Rpb24gaGFuZGxlUHVsbFN1Y2Nlc3MocmVzcG9uc2UpIHtcbiAgICBzZXRTaW5jZU5yKHJlc3BvbnNlLmxhc3Rfc2VxKTtcbiAgICBoYW5kbGVQdWxsUmVzdWx0cyhyZXNwb25zZS5yZXN1bHRzKTtcbiAgICBpZiAocmVtb3RlLmlzQ29ubmVjdGVkKCkpIHtcbiAgICAgIHJldHVybiByZW1vdGUucHVsbCgpO1xuICAgIH1cbiAgfVxuXG5cbiAgLy8gIyMjIHB1bGwgZXJyb3IgaGFuZGxlclxuXG4gIC8vIHdoZW4gdGhlcmUgaXMgYSBjaGFuZ2UsIHRyaWdnZXIgZXZlbnQsXG4gIC8vIHRoZW4gY2hlY2sgZm9yIGFub3RoZXIgY2hhbmdlXG4gIC8vXG4gIGZ1bmN0aW9uIGhhbmRsZVB1bGxFcnJvcih4aHIsIGVycm9yKSB7XG4gICAgaWYgKCFyZW1vdGUuaXNDb25uZWN0ZWQoKSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHN3aXRjaCAoeGhyLnN0YXR1cykge1xuICAgICAgLy8gU2Vzc2lvbiBpcyBpbnZhbGlkLiBVc2VyIGlzIHN0aWxsIGxvZ2luLCBidXQgbmVlZHMgdG8gcmVhdXRoZW50aWNhdGVcbiAgICAgIC8vIGJlZm9yZSBzeW5jIGNhbiBiZSBjb250aW51ZWRcbiAgICBjYXNlIDQwMTpcbiAgICAgIHJlbW90ZS50cmlnZ2VyKCdlcnJvcjp1bmF1dGhlbnRpY2F0ZWQnLCBlcnJvcik7XG4gICAgICByZXR1cm4gcmVtb3RlLmRpc2Nvbm5lY3QoKTtcblxuICAgICAvLyB0aGUgNDA0IGNvbWVzLCB3aGVuIHRoZSByZXF1ZXN0ZWQgREIgaGFzIGJlZW4gcmVtb3ZlZFxuICAgICAvLyBvciBkb2VzIG5vdCBleGlzdCB5ZXQuXG4gICAgIC8vXG4gICAgIC8vIEJVVDogaXQgbWlnaHQgYWxzbyBoYXBwZW4gdGhhdCB0aGUgYmFja2dyb3VuZCB3b3JrZXJzIGRpZFxuICAgICAvLyAgICAgIG5vdCBjcmVhdGUgYSBwZW5kaW5nIGRhdGFiYXNlIHlldC4gVGhlcmVmb3JlLFxuICAgICAvLyAgICAgIHdlIHRyeSBpdCBhZ2FpbiBpbiAzIHNlY29uZHNcbiAgICAgLy9cbiAgICAgLy8gVE9ETzogcmV2aWV3IC8gcmV0aGluayB0aGF0LlxuICAgICAvL1xuXG4gICAgY2FzZSA0MDQ6XG4gICAgICByZXR1cm4gd2luZG93LnNldFRpbWVvdXQocmVtb3RlLnB1bGwsIDMwMDApO1xuXG4gICAgY2FzZSA1MDA6XG4gICAgICAvL1xuICAgICAgLy8gUGxlYXNlIHNlcnZlciwgZG9uJ3QgZ2l2ZSB1cyB0aGVzZS4gQXQgbGVhc3Qgbm90IHBlcnNpc3RlbnRseVxuICAgICAgLy9cbiAgICAgIHJlbW90ZS50cmlnZ2VyKCdlcnJvcjpzZXJ2ZXInLCBlcnJvcik7XG4gICAgICB3aW5kb3cuc2V0VGltZW91dChyZW1vdGUucHVsbCwgMzAwMCk7XG4gICAgICByZXR1cm4gaG9vZGllLmNoZWNrQ29ubmVjdGlvbigpO1xuICAgIGRlZmF1bHQ6XG4gICAgICAvLyB1c3VhbGx5IGEgMCwgd2hpY2ggc3RhbmRzIGZvciB0aW1lb3V0IG9yIHNlcnZlciBub3QgcmVhY2hhYmxlLlxuICAgICAgaWYgKHhoci5zdGF0dXNUZXh0ID09PSAnYWJvcnQnKSB7XG4gICAgICAgIC8vIG1hbnVhbCBhYm9ydCBhZnRlciAyNXNlYy4gcmVzdGFydCBwdWxsaW5nIGNoYW5nZXMgZGlyZWN0bHkgd2hlbiBjb25uZWN0ZWRcbiAgICAgICAgcmV0dXJuIHJlbW90ZS5wdWxsKCk7XG4gICAgICB9IGVsc2Uge1xuXG4gICAgICAgIC8vIG9vcHMuIFRoaXMgbWlnaHQgYmUgY2F1c2VkIGJ5IGFuIHVucmVhY2hhYmxlIHNlcnZlci5cbiAgICAgICAgLy8gT3IgdGhlIHNlcnZlciBjYW5jZWxsZWQgaXQgZm9yIHdoYXQgZXZlciByZWFzb24sIGUuZy5cbiAgICAgICAgLy8gaGVyb2t1IGtpbGxzIHRoZSByZXF1ZXN0IGFmdGVyIH4zMHMuXG4gICAgICAgIC8vIHdlJ2xsIHRyeSBhZ2FpbiBhZnRlciBhIDNzIHRpbWVvdXRcbiAgICAgICAgLy9cbiAgICAgICAgd2luZG93LnNldFRpbWVvdXQocmVtb3RlLnB1bGwsIDMwMDApO1xuICAgICAgICByZXR1cm4gaG9vZGllLmNoZWNrQ29ubmVjdGlvbigpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG5cbiAgLy8gIyMjIGhhbmRsZSBjaGFuZ2VzIGZyb20gcmVtb3RlXG4gIC8vXG4gIGZ1bmN0aW9uIGhhbmRsZUJvb3RzdHJhcFN1Y2Nlc3MoKSB7XG4gICAgaXNCb290c3RyYXBwaW5nID0gZmFsc2U7XG4gICAgcmVtb3RlLnRyaWdnZXIoJ2Jvb3RzdHJhcDplbmQnKTtcbiAgfVxuXG4gIC8vICMjIyBoYW5kbGUgY2hhbmdlcyBmcm9tIHJlbW90ZVxuICAvL1xuICBmdW5jdGlvbiBoYW5kbGVQdWxsUmVzdWx0cyhjaGFuZ2VzKSB7XG4gICAgdmFyIGRvYywgZXZlbnQsIG9iamVjdCwgX2ksIF9sZW47XG5cbiAgICBmb3IgKF9pID0gMCwgX2xlbiA9IGNoYW5nZXMubGVuZ3RoOyBfaSA8IF9sZW47IF9pKyspIHtcbiAgICAgIGRvYyA9IGNoYW5nZXNbX2ldLmRvYztcblxuICAgICAgaWYgKHJlbW90ZS5wcmVmaXggJiYgZG9jLl9pZC5pbmRleE9mKHJlbW90ZS5wcmVmaXgpICE9PSAwKSB7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuXG4gICAgICBvYmplY3QgPSBwYXJzZUZyb21SZW1vdGUoZG9jKTtcblxuICAgICAgaWYgKG9iamVjdC5fZGVsZXRlZCkge1xuICAgICAgICBpZiAoIXJlbW90ZS5pc0tub3duT2JqZWN0KG9iamVjdCkpIHtcbiAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuICAgICAgICBldmVudCA9ICdyZW1vdmUnO1xuICAgICAgICByZW1vdGUuaXNLbm93bk9iamVjdChvYmplY3QpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgaWYgKHJlbW90ZS5pc0tub3duT2JqZWN0KG9iamVjdCkpIHtcbiAgICAgICAgICBldmVudCA9ICd1cGRhdGUnO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGV2ZW50ID0gJ2FkZCc7XG4gICAgICAgICAgcmVtb3RlLm1hcmtBc0tub3duT2JqZWN0KG9iamVjdCk7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgcmVtb3RlLnRyaWdnZXIoZXZlbnQsIG9iamVjdCk7XG4gICAgICByZW1vdGUudHJpZ2dlcihldmVudCArICc6JyArIG9iamVjdC50eXBlLCBvYmplY3QpO1xuICAgICAgcmVtb3RlLnRyaWdnZXIoZXZlbnQgKyAnOicgKyBvYmplY3QudHlwZSArICc6JyArIG9iamVjdC5pZCwgb2JqZWN0KTtcbiAgICAgIHJlbW90ZS50cmlnZ2VyKCdjaGFuZ2UnLCBldmVudCwgb2JqZWN0KTtcbiAgICAgIHJlbW90ZS50cmlnZ2VyKCdjaGFuZ2U6JyArIG9iamVjdC50eXBlLCBldmVudCwgb2JqZWN0KTtcbiAgICAgIHJlbW90ZS50cmlnZ2VyKCdjaGFuZ2U6JyArIG9iamVjdC50eXBlICsgJzonICsgb2JqZWN0LmlkLCBldmVudCwgb2JqZWN0KTtcbiAgICB9XG4gIH1cblxuXG4gIC8vIGJvb3RzdHJhcCBrbm93biBvYmplY3RzXG4gIC8vXG4gIGlmIChvcHRpb25zLmtub3duT2JqZWN0cykge1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgb3B0aW9ucy5rbm93bk9iamVjdHMubGVuZ3RoOyBpKyspIHtcbiAgICAgIHJlbW90ZS5tYXJrQXNLbm93bk9iamVjdCh7XG4gICAgICAgIHR5cGU6IG9wdGlvbnMua25vd25PYmplY3RzW2ldLnR5cGUsXG4gICAgICAgIGlkOiBvcHRpb25zLmtub3duT2JqZWN0c1tpXS5pZFxuICAgICAgfSk7XG4gICAgfVxuICB9XG5cblxuICAvLyBleHBvc2UgcHVibGljIEFQSVxuICByZXR1cm4gcmVtb3RlO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGhvb2RpZVJlbW90ZVN0b3JlO1xuIiwiLy8gc2NvcGVkIFN0b3JlXG4vLyA9PT09PT09PT09PT1cblxuLy8gc2FtZSBhcyBzdG9yZSwgYnV0IHdpdGggdHlwZSBwcmVzZXQgdG8gYW4gaW5pdGlhbGx5XG4vLyBwYXNzZWQgdmFsdWUuXG4vL1xudmFyIGhvb2RpZUV2ZW50cyA9IHJlcXVpcmUoJy4vZXZlbnRzJyk7XG5cbi8vXG5mdW5jdGlvbiBob29kaWVTY29wZWRTdG9yZUFwaShob29kaWUsIHN0b3JlQXBpLCBvcHRpb25zKSB7XG5cbiAgLy8gbmFtZVxuICB2YXIgc3RvcmVOYW1lID0gb3B0aW9ucy5uYW1lIHx8ICdzdG9yZSc7XG4gIHZhciB0eXBlID0gb3B0aW9ucy50eXBlO1xuICB2YXIgaWQgPSBvcHRpb25zLmlkO1xuXG4gIHZhciBhcGkgPSB7fTtcblxuICAvLyBzY29wZWQgYnkgdHlwZSBvbmx5XG4gIGlmICghaWQpIHtcblxuICAgIC8vIGFkZCBldmVudHNcbiAgICBob29kaWVFdmVudHMoaG9vZGllLCB7XG4gICAgICBjb250ZXh0OiBhcGksXG4gICAgICBuYW1lc3BhY2U6IHN0b3JlTmFtZSArICc6JyArIHR5cGVcbiAgICB9KTtcblxuICAgIC8vXG4gICAgYXBpLnNhdmUgPSBmdW5jdGlvbiBzYXZlKGlkLCBwcm9wZXJ0aWVzLCBvcHRpb25zKSB7XG4gICAgICByZXR1cm4gc3RvcmVBcGkuc2F2ZSh0eXBlLCBpZCwgcHJvcGVydGllcywgb3B0aW9ucyk7XG4gICAgfTtcblxuICAgIC8vXG4gICAgYXBpLmFkZCA9IGZ1bmN0aW9uIGFkZChwcm9wZXJ0aWVzLCBvcHRpb25zKSB7XG4gICAgICByZXR1cm4gc3RvcmVBcGkuYWRkKHR5cGUsIHByb3BlcnRpZXMsIG9wdGlvbnMpO1xuICAgIH07XG5cbiAgICAvL1xuICAgIGFwaS5maW5kID0gZnVuY3Rpb24gZmluZChpZCkge1xuICAgICAgcmV0dXJuIHN0b3JlQXBpLmZpbmQodHlwZSwgaWQpO1xuICAgIH07XG5cbiAgICAvL1xuICAgIGFwaS5maW5kT3JBZGQgPSBmdW5jdGlvbiBmaW5kT3JBZGQoaWQsIHByb3BlcnRpZXMpIHtcbiAgICAgIHJldHVybiBzdG9yZUFwaS5maW5kT3JBZGQodHlwZSwgaWQsIHByb3BlcnRpZXMpO1xuICAgIH07XG5cbiAgICAvL1xuICAgIGFwaS5maW5kQWxsID0gZnVuY3Rpb24gZmluZEFsbChvcHRpb25zKSB7XG4gICAgICByZXR1cm4gc3RvcmVBcGkuZmluZEFsbCh0eXBlLCBvcHRpb25zKTtcbiAgICB9O1xuXG4gICAgLy9cbiAgICBhcGkudXBkYXRlID0gZnVuY3Rpb24gdXBkYXRlKGlkLCBvYmplY3RVcGRhdGUsIG9wdGlvbnMpIHtcbiAgICAgIHJldHVybiBzdG9yZUFwaS51cGRhdGUodHlwZSwgaWQsIG9iamVjdFVwZGF0ZSwgb3B0aW9ucyk7XG4gICAgfTtcblxuICAgIC8vXG4gICAgYXBpLnVwZGF0ZUFsbCA9IGZ1bmN0aW9uIHVwZGF0ZUFsbChvYmplY3RVcGRhdGUsIG9wdGlvbnMpIHtcbiAgICAgIHJldHVybiBzdG9yZUFwaS51cGRhdGVBbGwodHlwZSwgb2JqZWN0VXBkYXRlLCBvcHRpb25zKTtcbiAgICB9O1xuXG4gICAgLy9cbiAgICBhcGkucmVtb3ZlID0gZnVuY3Rpb24gcmVtb3ZlKGlkLCBvcHRpb25zKSB7XG4gICAgICByZXR1cm4gc3RvcmVBcGkucmVtb3ZlKHR5cGUsIGlkLCBvcHRpb25zKTtcbiAgICB9O1xuXG4gICAgLy9cbiAgICBhcGkucmVtb3ZlQWxsID0gZnVuY3Rpb24gcmVtb3ZlQWxsKG9wdGlvbnMpIHtcbiAgICAgIHJldHVybiBzdG9yZUFwaS5yZW1vdmVBbGwodHlwZSwgb3B0aW9ucyk7XG4gICAgfTtcbiAgfVxuXG4gIC8vIHNjb3BlZCBieSBib3RoOiB0eXBlICYgaWRcbiAgaWYgKGlkKSB7XG5cbiAgICAvLyBhZGQgZXZlbnRzXG4gICAgaG9vZGllRXZlbnRzKGhvb2RpZSwge1xuICAgICAgY29udGV4dDogYXBpLFxuICAgICAgbmFtZXNwYWNlOiBzdG9yZU5hbWUgKyAnOicgKyB0eXBlICsgJzonICsgaWRcbiAgICB9KTtcblxuICAgIC8vXG4gICAgYXBpLnNhdmUgPSBmdW5jdGlvbiBzYXZlKHByb3BlcnRpZXMsIG9wdGlvbnMpIHtcbiAgICAgIHJldHVybiBzdG9yZUFwaS5zYXZlKHR5cGUsIGlkLCBwcm9wZXJ0aWVzLCBvcHRpb25zKTtcbiAgICB9O1xuXG4gICAgLy9cbiAgICBhcGkuZmluZCA9IGZ1bmN0aW9uIGZpbmQoKSB7XG4gICAgICByZXR1cm4gc3RvcmVBcGkuZmluZCh0eXBlLCBpZCk7XG4gICAgfTtcblxuICAgIC8vXG4gICAgYXBpLnVwZGF0ZSA9IGZ1bmN0aW9uIHVwZGF0ZShvYmplY3RVcGRhdGUsIG9wdGlvbnMpIHtcbiAgICAgIHJldHVybiBzdG9yZUFwaS51cGRhdGUodHlwZSwgaWQsIG9iamVjdFVwZGF0ZSwgb3B0aW9ucyk7XG4gICAgfTtcblxuICAgIC8vXG4gICAgYXBpLnJlbW92ZSA9IGZ1bmN0aW9uIHJlbW92ZShvcHRpb25zKSB7XG4gICAgICByZXR1cm4gc3RvcmVBcGkucmVtb3ZlKHR5cGUsIGlkLCBvcHRpb25zKTtcbiAgICB9O1xuICB9XG5cbiAgLy9cbiAgYXBpLmRlY29yYXRlUHJvbWlzZXMgPSBzdG9yZUFwaS5kZWNvcmF0ZVByb21pc2VzO1xuICBhcGkudmFsaWRhdGUgPSBzdG9yZUFwaS52YWxpZGF0ZTtcblxuICByZXR1cm4gYXBpO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGhvb2RpZVNjb3BlZFN0b3JlQXBpO1xuIiwiLy8gU3RvcmVcbi8vID09PT09PT09PT09PVxuXG4vLyBUaGlzIGNsYXNzIGRlZmluZXMgdGhlIEFQSSB0aGF0IGhvb2RpZS5zdG9yZSAobG9jYWwgc3RvcmUpIGFuZCBob29kaWUub3BlblxuLy8gKHJlbW90ZSBzdG9yZSkgaW1wbGVtZW50IHRvIGFzc3VyZSBhIGNvaGVyZW50IEFQSS4gSXQgYWxzbyBpbXBsZW1lbnRzIHNvbWVcbi8vIGJhc2ljIHZhbGlkYXRpb25zLlxuLy9cbi8vIFRoZSByZXR1cm5lZCBBUEkgcHJvdmlkZXMgdGhlIGZvbGxvd2luZyBtZXRob2RzOlxuLy9cbi8vICogdmFsaWRhdGVcbi8vICogc2F2ZVxuLy8gKiBhZGRcbi8vICogZmluZFxuLy8gKiBmaW5kT3JBZGRcbi8vICogZmluZEFsbFxuLy8gKiB1cGRhdGVcbi8vICogdXBkYXRlQWxsXG4vLyAqIHJlbW92ZVxuLy8gKiByZW1vdmVBbGxcbi8vICogZGVjb3JhdGVQcm9taXNlc1xuLy8gKiB0cmlnZ2VyXG4vLyAqIG9uXG4vLyAqIHVuYmluZFxuLy9cbi8vIEF0IHRoZSBzYW1lIHRpbWUsIHRoZSByZXR1cm5lZCBBUEkgY2FuIGJlIGNhbGxlZCBhcyBmdW5jdGlvbiByZXR1cm5pbmcgYVxuLy8gc3RvcmUgc2NvcGVkIGJ5IHRoZSBwYXNzZWQgdHlwZSwgZm9yIGV4YW1wbGVcbi8vXG4vLyAgICAgdmFyIHRhc2tTdG9yZSA9IGhvb2RpZS5zdG9yZSgndGFzaycpO1xuLy8gICAgIHRhc2tTdG9yZS5maW5kQWxsKCkudGhlbiggc2hvd0FsbFRhc2tzICk7XG4vLyAgICAgdGFza1N0b3JlLnVwZGF0ZSgnaWQxMjMnLCB7ZG9uZTogdHJ1ZX0pO1xuLy9cblxuLy9cbnZhciBob29kaWVTY29wZWRTdG9yZUFwaSA9IHJlcXVpcmUoJy4vc2NvcGVkX3N0b3JlJyk7XG52YXIgaG9vZGllRXZlbnRzID0gcmVxdWlyZSgnLi9ldmVudHMnKTtcbnZhciBIb29kaWVFcnJvciA9IHJlcXVpcmUoJy4vZXJyb3InKTtcbnZhciBIb29kaWVPYmplY3RUeXBlRXJyb3IgPSByZXF1aXJlKCcuL2Vycm9yL29iamVjdF90eXBlJyk7XG52YXIgSG9vZGllT2JqZWN0SWRFcnJvciA9IHJlcXVpcmUoJy4vZXJyb3Ivb2JqZWN0X2lkJyk7XG5cbi8vXG5mdW5jdGlvbiBob29kaWVTdG9yZUFwaShob29kaWUsIG9wdGlvbnMpIHtcblxuICAvLyBwZXJzaXN0YW5jZSBsb2dpY1xuICB2YXIgYmFja2VuZCA9IHt9O1xuXG4gIC8vIGV4dGVuZCB0aGlzIHByb3BlcnR5IHdpdGggZXh0cmEgZnVuY3Rpb25zIHRoYXQgd2lsbCBiZSBhdmFpbGFibGVcbiAgLy8gb24gYWxsIHByb21pc2VzIHJldHVybmVkIGJ5IGhvb2RpZS5zdG9yZSBBUEkuIEl0IGhhcyBhIHJlZmVyZW5jZVxuICAvLyB0byBjdXJyZW50IGhvb2RpZSBpbnN0YW5jZSBieSBkZWZhdWx0XG4gIHZhciBwcm9taXNlQXBpID0ge1xuICAgIGhvb2RpZTogaG9vZGllXG4gIH07XG5cbiAgLy8gbmFtZVxuICB2YXIgc3RvcmVOYW1lID0gb3B0aW9ucy5uYW1lIHx8ICdzdG9yZSc7XG5cbiAgLy8gcHVibGljIEFQSVxuICB2YXIgYXBpID0gZnVuY3Rpb24gYXBpKHR5cGUsIGlkKSB7XG4gICAgdmFyIHNjb3BlZE9wdGlvbnMgPSAkLmV4dGVuZCh0cnVlLCB7dHlwZTogdHlwZSwgaWQ6IGlkfSwgb3B0aW9ucyk7XG4gICAgcmV0dXJuIGhvb2RpZVNjb3BlZFN0b3JlQXBpKGhvb2RpZSwgYXBpLCBzY29wZWRPcHRpb25zKTtcbiAgfTtcblxuICAvLyBhZGQgZXZlbnQgQVBJXG4gIGhvb2RpZUV2ZW50cyhob29kaWUsIHsgY29udGV4dDogYXBpLCBuYW1lc3BhY2U6IHN0b3JlTmFtZSB9KTtcblxuXG4gIC8vIFZhbGlkYXRlXG4gIC8vIC0tLS0tLS0tLS0tLS0tXG5cbiAgLy8gYnkgZGVmYXVsdCwgd2Ugb25seSBjaGVjayBmb3IgYSB2YWxpZCB0eXBlICYgaWQuXG4gIC8vIHRoZSB2YWxpZGF0ZSBtZXRob2QgY2FuIGJlIG92ZXJ3cml0ZW4gYnkgcGFzc2luZ1xuICAvLyBvcHRpb25zLnZhbGlkYXRlXG4gIC8vXG4gIC8vIGlmIGB2YWxpZGF0ZWAgcmV0dXJucyBub3RoaW5nLCB0aGUgcGFzc2VkIG9iamVjdCBpc1xuICAvLyB2YWxpZC4gT3RoZXJ3aXNlIGl0IHJldHVybnMgYW4gZXJyb3JcbiAgLy9cbiAgYXBpLnZhbGlkYXRlID0gb3B0aW9ucy52YWxpZGF0ZTtcblxuICBpZiAoIW9wdGlvbnMudmFsaWRhdGUpIHtcbiAgICBhcGkudmFsaWRhdGUgPSBmdW5jdGlvbihvYmplY3QgLyosIG9wdGlvbnMgKi8pIHtcblxuICAgICAgaWYgKCFvYmplY3QpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBIb29kaWVFcnJvcih7XG4gICAgICAgICAgbmFtZTogJ0ludmFsaWRPYmplY3RFcnJvcicsXG4gICAgICAgICAgbWVzc2FnZTogJ05vIG9iamVjdCBwYXNzZWQuJ1xuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICAgIGlmIChIb29kaWVPYmplY3RUeXBlRXJyb3IuaXNJbnZhbGlkKG9iamVjdC50eXBlLCB2YWxpZElkT3JUeXBlUGF0dGVybikpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBIb29kaWVPYmplY3RUeXBlRXJyb3Ioe1xuICAgICAgICAgIHR5cGU6IG9iamVjdC50eXBlLFxuICAgICAgICAgIHJ1bGVzOiB2YWxpZElkT3JUeXBlUnVsZXNcbiAgICAgICAgfSk7XG4gICAgICB9XG5cbiAgICAgIGlmICghb2JqZWN0LmlkKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgaWYgKEhvb2RpZU9iamVjdElkRXJyb3IuaXNJbnZhbGlkKG9iamVjdC5pZCwgdmFsaWRJZE9yVHlwZVBhdHRlcm4pKSB7XG4gICAgICAgIHJldHVybiBuZXcgSG9vZGllT2JqZWN0SWRFcnJvcih7XG4gICAgICAgICAgaWQ6IG9iamVjdC5pZCxcbiAgICAgICAgICBydWxlczogdmFsaWRJZE9yVHlwZVJ1bGVzXG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH07XG4gIH1cblxuICAvLyBTYXZlXG4gIC8vIC0tLS0tLS0tLS0tLS0tXG5cbiAgLy8gY3JlYXRlcyBvciByZXBsYWNlcyBhbiBhbiBldmVudHVhbGx5IGV4aXN0aW5nIG9iamVjdCBpbiB0aGUgc3RvcmVcbiAgLy8gd2l0aCBzYW1lIHR5cGUgJiBpZC5cbiAgLy9cbiAgLy8gV2hlbiBpZCBpcyB1bmRlZmluZWQsIGl0IGdldHMgZ2VuZXJhdGVkIGFuZCBhIG5ldyBvYmplY3QgZ2V0cyBzYXZlZFxuICAvL1xuICAvLyBleGFtcGxlIHVzYWdlOlxuICAvL1xuICAvLyAgICAgc3RvcmUuc2F2ZSgnY2FyJywgdW5kZWZpbmVkLCB7Y29sb3I6ICdyZWQnfSlcbiAgLy8gICAgIHN0b3JlLnNhdmUoJ2NhcicsICdhYmM0NTY3Jywge2NvbG9yOiAncmVkJ30pXG4gIC8vXG4gIGFwaS5zYXZlID0gZnVuY3Rpb24gc2F2ZSh0eXBlLCBpZCwgcHJvcGVydGllcywgb3B0aW9ucykge1xuXG4gICAgaWYgKCBvcHRpb25zICkge1xuICAgICAgb3B0aW9ucyA9ICQuZXh0ZW5kKHRydWUsIHt9LCBvcHRpb25zKTtcbiAgICB9IGVsc2Uge1xuICAgICAgb3B0aW9ucyA9IHt9O1xuICAgIH1cblxuICAgIC8vIGRvbid0IG1lc3Mgd2l0aCBwYXNzZWQgb2JqZWN0XG4gICAgdmFyIG9iamVjdCA9ICQuZXh0ZW5kKHRydWUsIHt9LCBwcm9wZXJ0aWVzLCB7dHlwZTogdHlwZSwgaWQ6IGlkfSk7XG5cbiAgICAvLyB2YWxpZGF0aW9uc1xuICAgIHZhciBlcnJvciA9IGFwaS52YWxpZGF0ZShvYmplY3QsIG9wdGlvbnMgfHwge30pO1xuICAgIGlmKGVycm9yKSB7IHJldHVybiBob29kaWUucmVqZWN0V2l0aChlcnJvcik7IH1cblxuICAgIHJldHVybiBkZWNvcmF0ZVByb21pc2UoIGJhY2tlbmQuc2F2ZShvYmplY3QsIG9wdGlvbnMgfHwge30pICk7XG4gIH07XG5cblxuICAvLyBBZGRcbiAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG4gIC8vIGAuYWRkYCBpcyBhbiBhbGlhcyBmb3IgYC5zYXZlYCwgd2l0aCB0aGUgZGlmZmVyZW5jZSB0aGF0IHRoZXJlIGlzIG5vIGlkIGFyZ3VtZW50LlxuICAvLyBJbnRlcm5hbGx5IGl0IHNpbXBseSBjYWxscyBgLnNhdmUodHlwZSwgdW5kZWZpbmVkLCBvYmplY3QpLlxuICAvL1xuICBhcGkuYWRkID0gZnVuY3Rpb24gYWRkKHR5cGUsIHByb3BlcnRpZXMsIG9wdGlvbnMpIHtcblxuICAgIGlmIChwcm9wZXJ0aWVzID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHByb3BlcnRpZXMgPSB7fTtcbiAgICB9XG5cbiAgICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcbiAgICByZXR1cm4gYXBpLnNhdmUodHlwZSwgcHJvcGVydGllcy5pZCwgcHJvcGVydGllcywgb3B0aW9ucyk7XG4gIH07XG5cblxuICAvLyBmaW5kXG4gIC8vIC0tLS0tLVxuXG4gIC8vXG4gIGFwaS5maW5kID0gZnVuY3Rpb24gZmluZCh0eXBlLCBpZCkge1xuXG4gICAgcmV0dXJuIGRlY29yYXRlUHJvbWlzZSggYmFja2VuZC5maW5kKHR5cGUsIGlkKSApO1xuICB9O1xuXG5cbiAgLy8gZmluZCBvciBhZGRcbiAgLy8gLS0tLS0tLS0tLS0tLVxuXG4gIC8vIDEuIFRyeSB0byBmaW5kIGEgc2hhcmUgYnkgZ2l2ZW4gaWRcbiAgLy8gMi4gSWYgc2hhcmUgY291bGQgYmUgZm91bmQsIHJldHVybiBpdFxuICAvLyAzLiBJZiBub3QsIGFkZCBvbmUgYW5kIHJldHVybiBpdC5cbiAgLy9cbiAgYXBpLmZpbmRPckFkZCA9IGZ1bmN0aW9uIGZpbmRPckFkZCh0eXBlLCBpZCwgcHJvcGVydGllcykge1xuXG4gICAgaWYgKHByb3BlcnRpZXMgPT09IG51bGwpIHtcbiAgICAgIHByb3BlcnRpZXMgPSB7fTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBoYW5kbGVOb3RGb3VuZCgpIHtcbiAgICAgIHZhciBuZXdQcm9wZXJ0aWVzO1xuICAgICAgbmV3UHJvcGVydGllcyA9ICQuZXh0ZW5kKHRydWUsIHtcbiAgICAgICAgaWQ6IGlkXG4gICAgICB9LCBwcm9wZXJ0aWVzKTtcbiAgICAgIHJldHVybiBhcGkuYWRkKHR5cGUsIG5ld1Byb3BlcnRpZXMpO1xuICAgIH1cblxuICAgIC8vIHByb21pc2UgZGVjb3JhdGlvbnMgZ2V0IGxvc3Qgd2hlbiBwaXBlZCB0aHJvdWdoIGB0aGVuYCxcbiAgICAvLyB0aGF0J3Mgd2h5IHdlIG5lZWQgdG8gZGVjb3JhdGUgdGhlIGZpbmQncyBwcm9taXNlIGFnYWluLlxuICAgIHZhciBwcm9taXNlID0gYXBpLmZpbmQodHlwZSwgaWQpLnRoZW4obnVsbCwgaGFuZGxlTm90Rm91bmQpO1xuICAgIHJldHVybiBkZWNvcmF0ZVByb21pc2UoIHByb21pc2UgKTtcbiAgfTtcblxuXG4gIC8vIGZpbmRBbGxcbiAgLy8gLS0tLS0tLS0tLS0tXG5cbiAgLy8gcmV0dXJucyBhbGwgb2JqZWN0cyBmcm9tIHN0b3JlLlxuICAvLyBDYW4gYmUgb3B0aW9uYWxseSBmaWx0ZXJlZCBieSBhIHR5cGUgb3IgYSBmdW5jdGlvblxuICAvL1xuICBhcGkuZmluZEFsbCA9IGZ1bmN0aW9uIGZpbmRBbGwodHlwZSwgb3B0aW9ucykge1xuXG4gICAgcmV0dXJuIGRlY29yYXRlUHJvbWlzZSggYmFja2VuZC5maW5kQWxsKHR5cGUsIG9wdGlvbnMpICk7XG4gIH07XG5cblxuICAvLyBVcGRhdGVcbiAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG4gIC8vIEluIGNvbnRyYXN0IHRvIGAuc2F2ZWAsIHRoZSBgLnVwZGF0ZWAgbWV0aG9kIGRvZXMgbm90IHJlcGxhY2UgdGhlIHN0b3JlZCBvYmplY3QsXG4gIC8vIGJ1dCBvbmx5IGNoYW5nZXMgdGhlIHBhc3NlZCBhdHRyaWJ1dGVzIG9mIGFuIGV4c3Rpbmcgb2JqZWN0LCBpZiBpdCBleGlzdHNcbiAgLy9cbiAgLy8gYm90aCBhIGhhc2ggb2Yga2V5L3ZhbHVlcyBvciBhIGZ1bmN0aW9uIHRoYXQgYXBwbGllcyB0aGUgdXBkYXRlIHRvIHRoZSBwYXNzZWRcbiAgLy8gb2JqZWN0IGNhbiBiZSBwYXNzZWQuXG4gIC8vXG4gIC8vIGV4YW1wbGUgdXNhZ2VcbiAgLy9cbiAgLy8gaG9vZGllLnN0b3JlLnVwZGF0ZSgnY2FyJywgJ2FiYzQ1NjcnLCB7c29sZDogdHJ1ZX0pXG4gIC8vIGhvb2RpZS5zdG9yZS51cGRhdGUoJ2NhcicsICdhYmM0NTY3JywgZnVuY3Rpb24ob2JqKSB7IG9iai5zb2xkID0gdHJ1ZSB9KVxuICAvL1xuICBhcGkudXBkYXRlID0gZnVuY3Rpb24gdXBkYXRlKHR5cGUsIGlkLCBvYmplY3RVcGRhdGUsIG9wdGlvbnMpIHtcblxuICAgIGZ1bmN0aW9uIGhhbmRsZUZvdW5kKGN1cnJlbnRPYmplY3QpIHtcbiAgICAgIHZhciBjaGFuZ2VkUHJvcGVydGllcywgbmV3T2JqLCB2YWx1ZTtcblxuICAgICAgLy8gbm9ybWFsaXplIGlucHV0XG4gICAgICBuZXdPYmogPSAkLmV4dGVuZCh0cnVlLCB7fSwgY3VycmVudE9iamVjdCk7XG5cbiAgICAgIGlmICh0eXBlb2Ygb2JqZWN0VXBkYXRlID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIG9iamVjdFVwZGF0ZSA9IG9iamVjdFVwZGF0ZShuZXdPYmopO1xuICAgICAgfVxuXG4gICAgICBpZiAoIW9iamVjdFVwZGF0ZSkge1xuICAgICAgICByZXR1cm4gaG9vZGllLnJlc29sdmVXaXRoKGN1cnJlbnRPYmplY3QpO1xuICAgICAgfVxuXG4gICAgICAvLyBjaGVjayBpZiBzb21ldGhpbmcgY2hhbmdlZFxuICAgICAgY2hhbmdlZFByb3BlcnRpZXMgPSAoZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciBfcmVzdWx0cyA9IFtdO1xuXG4gICAgICAgIGZvciAodmFyIGtleSBpbiBvYmplY3RVcGRhdGUpIHtcbiAgICAgICAgICBpZiAob2JqZWN0VXBkYXRlLmhhc093blByb3BlcnR5KGtleSkpIHtcbiAgICAgICAgICAgIHZhbHVlID0gb2JqZWN0VXBkYXRlW2tleV07XG4gICAgICAgICAgICBpZiAoKGN1cnJlbnRPYmplY3Rba2V5XSAhPT0gdmFsdWUpID09PSBmYWxzZSkge1xuICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIHdvcmthcm91bmQgZm9yIHVuZGVmaW5lZCB2YWx1ZXMsIGFzICQuZXh0ZW5kIGlnbm9yZXMgdGhlc2VcbiAgICAgICAgICAgIG5ld09ialtrZXldID0gdmFsdWU7XG4gICAgICAgICAgICBfcmVzdWx0cy5wdXNoKGtleSk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBfcmVzdWx0cztcbiAgICAgIH0pKCk7XG5cbiAgICAgIGlmICghKGNoYW5nZWRQcm9wZXJ0aWVzLmxlbmd0aCB8fCBvcHRpb25zKSkge1xuICAgICAgICByZXR1cm4gaG9vZGllLnJlc29sdmVXaXRoKG5ld09iaik7XG4gICAgICB9XG5cbiAgICAgIC8vYXBwbHkgdXBkYXRlXG4gICAgICByZXR1cm4gYXBpLnNhdmUodHlwZSwgaWQsIG5ld09iaiwgb3B0aW9ucyk7XG4gICAgfVxuXG4gICAgLy8gcHJvbWlzZSBkZWNvcmF0aW9ucyBnZXQgbG9zdCB3aGVuIHBpcGVkIHRocm91Z2ggYHRoZW5gLFxuICAgIC8vIHRoYXQncyB3aHkgd2UgbmVlZCB0byBkZWNvcmF0ZSB0aGUgZmluZCdzIHByb21pc2UgYWdhaW4uXG4gICAgdmFyIHByb21pc2UgPSBhcGkuZmluZCh0eXBlLCBpZCkudGhlbihoYW5kbGVGb3VuZCk7XG4gICAgcmV0dXJuIGRlY29yYXRlUHJvbWlzZSggcHJvbWlzZSApO1xuICB9O1xuXG5cbiAgLy8gdXBkYXRlT3JBZGRcbiAgLy8gLS0tLS0tLS0tLS0tLVxuXG4gIC8vIHNhbWUgYXMgYC51cGRhdGUoKWAsIGJ1dCBpbiBjYXNlIHRoZSBvYmplY3QgY2Fubm90IGJlIGZvdW5kLFxuICAvLyBpdCBnZXRzIGNyZWF0ZWRcbiAgLy9cbiAgYXBpLnVwZGF0ZU9yQWRkID0gZnVuY3Rpb24gdXBkYXRlT3JBZGQodHlwZSwgaWQsIG9iamVjdFVwZGF0ZSwgb3B0aW9ucykge1xuICAgIGZ1bmN0aW9uIGhhbmRsZU5vdEZvdW5kKCkge1xuICAgICAgdmFyIHByb3BlcnRpZXMgPSAkLmV4dGVuZCh0cnVlLCB7fSwgb2JqZWN0VXBkYXRlLCB7aWQ6IGlkfSk7XG4gICAgICByZXR1cm4gYXBpLmFkZCh0eXBlLCBwcm9wZXJ0aWVzLCBvcHRpb25zKTtcbiAgICB9XG5cbiAgICB2YXIgcHJvbWlzZSA9IGFwaS51cGRhdGUodHlwZSwgaWQsIG9iamVjdFVwZGF0ZSwgb3B0aW9ucykudGhlbihudWxsLCBoYW5kbGVOb3RGb3VuZCk7XG4gICAgcmV0dXJuIGRlY29yYXRlUHJvbWlzZSggcHJvbWlzZSApO1xuICB9O1xuXG5cbiAgLy8gdXBkYXRlQWxsXG4gIC8vIC0tLS0tLS0tLS0tLS0tLS0tXG5cbiAgLy8gdXBkYXRlIGFsbCBvYmplY3RzIGluIHRoZSBzdG9yZSwgY2FuIGJlIG9wdGlvbmFsbHkgZmlsdGVyZWQgYnkgYSBmdW5jdGlvblxuICAvLyBBcyBhbiBhbHRlcm5hdGl2ZSwgYW4gYXJyYXkgb2Ygb2JqZWN0cyBjYW4gYmUgcGFzc2VkXG4gIC8vXG4gIC8vIGV4YW1wbGUgdXNhZ2VcbiAgLy9cbiAgLy8gaG9vZGllLnN0b3JlLnVwZGF0ZUFsbCgpXG4gIC8vXG4gIGFwaS51cGRhdGVBbGwgPSBmdW5jdGlvbiB1cGRhdGVBbGwoZmlsdGVyT3JPYmplY3RzLCBvYmplY3RVcGRhdGUsIG9wdGlvbnMpIHtcbiAgICB2YXIgcHJvbWlzZTtcblxuICAgIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuXG4gICAgLy8gbm9ybWFsaXplIHRoZSBpbnB1dDogbWFrZSBzdXJlIHdlIGhhdmUgYWxsIG9iamVjdHNcbiAgICBzd2l0Y2ggKHRydWUpIHtcbiAgICBjYXNlIHR5cGVvZiBmaWx0ZXJPck9iamVjdHMgPT09ICdzdHJpbmcnOlxuICAgICAgcHJvbWlzZSA9IGFwaS5maW5kQWxsKGZpbHRlck9yT2JqZWN0cyk7XG4gICAgICBicmVhaztcbiAgICBjYXNlIGhvb2RpZS5pc1Byb21pc2UoZmlsdGVyT3JPYmplY3RzKTpcbiAgICAgIHByb21pc2UgPSBmaWx0ZXJPck9iamVjdHM7XG4gICAgICBicmVhaztcbiAgICBjYXNlICQuaXNBcnJheShmaWx0ZXJPck9iamVjdHMpOlxuICAgICAgcHJvbWlzZSA9IGhvb2RpZS5kZWZlcigpLnJlc29sdmUoZmlsdGVyT3JPYmplY3RzKS5wcm9taXNlKCk7XG4gICAgICBicmVhaztcbiAgICBkZWZhdWx0OiAvLyBlLmcuIG51bGwsIHVwZGF0ZSBhbGxcbiAgICAgIHByb21pc2UgPSBhcGkuZmluZEFsbCgpO1xuICAgIH1cblxuICAgIHByb21pc2UgPSBwcm9taXNlLnRoZW4oZnVuY3Rpb24ob2JqZWN0cykge1xuICAgICAgLy8gbm93IHdlIHVwZGF0ZSBhbGwgb2JqZWN0cyBvbmUgYnkgb25lIGFuZCByZXR1cm4gYSBwcm9taXNlXG4gICAgICAvLyB0aGF0IHdpbGwgYmUgcmVzb2x2ZWQgb25jZSBhbGwgdXBkYXRlcyBoYXZlIGJlZW4gZmluaXNoZWRcbiAgICAgIHZhciBvYmplY3QsIF91cGRhdGVQcm9taXNlcztcblxuICAgICAgaWYgKCEkLmlzQXJyYXkob2JqZWN0cykpIHtcbiAgICAgICAgb2JqZWN0cyA9IFtvYmplY3RzXTtcbiAgICAgIH1cblxuICAgICAgX3VwZGF0ZVByb21pc2VzID0gKGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgX2ksIF9sZW4sIF9yZXN1bHRzO1xuICAgICAgICBfcmVzdWx0cyA9IFtdO1xuICAgICAgICBmb3IgKF9pID0gMCwgX2xlbiA9IG9iamVjdHMubGVuZ3RoOyBfaSA8IF9sZW47IF9pKyspIHtcbiAgICAgICAgICBvYmplY3QgPSBvYmplY3RzW19pXTtcbiAgICAgICAgICBfcmVzdWx0cy5wdXNoKGFwaS51cGRhdGUob2JqZWN0LnR5cGUsIG9iamVjdC5pZCwgb2JqZWN0VXBkYXRlLCBvcHRpb25zKSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIF9yZXN1bHRzO1xuICAgICAgfSkoKTtcblxuICAgICAgcmV0dXJuICQud2hlbi5hcHBseShudWxsLCBfdXBkYXRlUHJvbWlzZXMpO1xuICAgIH0pO1xuXG4gICAgcmV0dXJuIGRlY29yYXRlUHJvbWlzZSggcHJvbWlzZSApO1xuICB9O1xuXG5cbiAgLy8gUmVtb3ZlXG4gIC8vIC0tLS0tLS0tLS0tLVxuXG4gIC8vIFJlbW92ZXMgb25lIG9iamVjdCBzcGVjaWZpZWQgYnkgYHR5cGVgIGFuZCBgaWRgLlxuICAvL1xuICAvLyB3aGVuIG9iamVjdCBoYXMgYmVlbiBzeW5jZWQgYmVmb3JlLCBtYXJrIGl0IGFzIGRlbGV0ZWQuXG4gIC8vIE90aGVyd2lzZSByZW1vdmUgaXQgZnJvbSBTdG9yZS5cbiAgLy9cbiAgYXBpLnJlbW92ZSA9IGZ1bmN0aW9uIHJlbW92ZSh0eXBlLCBpZCwgb3B0aW9ucykge1xuICAgIHJldHVybiBkZWNvcmF0ZVByb21pc2UoIGJhY2tlbmQucmVtb3ZlKHR5cGUsIGlkLCBvcHRpb25zIHx8IHt9KSApO1xuICB9O1xuXG5cbiAgLy8gcmVtb3ZlQWxsXG4gIC8vIC0tLS0tLS0tLS0tXG5cbiAgLy8gRGVzdHJveWUgYWxsIG9iamVjdHMuIENhbiBiZSBmaWx0ZXJlZCBieSBhIHR5cGVcbiAgLy9cbiAgYXBpLnJlbW92ZUFsbCA9IGZ1bmN0aW9uIHJlbW92ZUFsbCh0eXBlLCBvcHRpb25zKSB7XG4gICAgcmV0dXJuIGRlY29yYXRlUHJvbWlzZSggYmFja2VuZC5yZW1vdmVBbGwodHlwZSwgb3B0aW9ucyB8fCB7fSkgKTtcbiAgfTtcblxuXG4gIC8vIGRlY29yYXRlIHByb21pc2VzXG4gIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS1cblxuICAvLyBleHRlbmQgcHJvbWlzZXMgcmV0dXJuZWQgYnkgc3RvcmUuYXBpXG4gIGFwaS5kZWNvcmF0ZVByb21pc2VzID0gZnVuY3Rpb24gZGVjb3JhdGVQcm9taXNlcyhtZXRob2RzKSB7XG4gICAgcmV0dXJuICQuZXh0ZW5kKHByb21pc2VBcGksIG1ldGhvZHMpO1xuICB9O1xuXG5cblxuICAvLyByZXF1aXJlZCBiYWNrZW5kIG1ldGhvZHNcbiAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICBpZiAoIW9wdGlvbnMuYmFja2VuZCApIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ29wdGlvbnMuYmFja2VuZCBtdXN0IGJlIHBhc3NlZCcpO1xuICB9XG5cbiAgdmFyIHJlcXVpcmVkID0gJ3NhdmUgZmluZCBmaW5kQWxsIHJlbW92ZSByZW1vdmVBbGwnLnNwbGl0KCcgJyk7XG5cbiAgcmVxdWlyZWQuZm9yRWFjaCggZnVuY3Rpb24obWV0aG9kTmFtZSkge1xuXG4gICAgaWYgKCFvcHRpb25zLmJhY2tlbmRbbWV0aG9kTmFtZV0pIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignb3B0aW9ucy5iYWNrZW5kLicrbWV0aG9kTmFtZSsnIG11c3QgYmUgcGFzc2VkLicpO1xuICAgIH1cblxuICAgIGJhY2tlbmRbbWV0aG9kTmFtZV0gPSBvcHRpb25zLmJhY2tlbmRbbWV0aG9kTmFtZV07XG4gIH0pO1xuXG5cbiAgLy8gUHJpdmF0ZVxuICAvLyAtLS0tLS0tLS1cblxuICAvLyAvIG5vdCBhbGxvd2VkIGZvciBpZFxuICB2YXIgdmFsaWRJZE9yVHlwZVBhdHRlcm4gPSAvXlteXFwvXSskLztcbiAgdmFyIHZhbGlkSWRPclR5cGVSdWxlcyA9ICcvIG5vdCBhbGxvd2VkJztcblxuICAvL1xuICBmdW5jdGlvbiBkZWNvcmF0ZVByb21pc2UocHJvbWlzZSkge1xuICAgIHJldHVybiAkLmV4dGVuZChwcm9taXNlLCBwcm9taXNlQXBpKTtcbiAgfVxuXG4gIHJldHVybiBhcGk7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gaG9vZGllU3RvcmVBcGk7XG4iLCIvLyBIb29kaWUgQWRtaW5cbi8vIC0tLS0tLS0tLS0tLS1cbi8vXG4vLyB5b3VyIGZyaWVuZGx5IGxpYnJhcnkgZm9yIHBvY2tldCxcbi8vIHRoZSBIb29kaWUgQWRtaW4gVUlcbi8vXG52YXIgaG9vZGllRXZlbnRzID0gcmVxdWlyZSgnLi4vbm9kZV9tb2R1bGVzL2hvb2RpZS9zcmMvaG9vZGllL2V2ZW50cycpO1xudmFyIGhvb2RpZVByb21pc2VzID0gcmVxdWlyZSgnLi4vbm9kZV9tb2R1bGVzL2hvb2RpZS9zcmMvaG9vZGllL3Byb21pc2VzJyk7XG52YXIgaG9vZGllT3BlbiA9IHJlcXVpcmUoJy4uL25vZGVfbW9kdWxlcy9ob29kaWUvc3JjL2hvb2RpZS9vcGVuJyk7XG5cbi8vIENvbnN0cnVjdG9yXG4vLyAtLS0tLS0tLS0tLS0tXG5cbi8vIFdoZW4gaW5pdGlhbGl6aW5nIGEgaG9vZGllIGluc3RhbmNlLCBhbiBvcHRpb25hbCBVUkxcbi8vIGNhbiBiZSBwYXNzZWQuIFRoYXQncyB0aGUgVVJMIG9mIHRoZSBob29kaWUgYmFja2VuZC5cbi8vIElmIG5vIFVSTCBwYXNzZWQgaXQgZGVmYXVsdHMgdG8gdGhlIGN1cnJlbnQgZG9tYWluLlxuLy9cbi8vICAgICAvLyBpbml0IGEgbmV3IGhvb2RpZSBpbnN0YW5jZVxuLy8gICAgIGhvb2RpZSA9IG5ldyBIb29kaWVcbi8vXG5mdW5jdGlvbiBIb29kaWVBZG1pbihiYXNlVXJsKSB7XG4gIHZhciBob29kaWVBZG1pbiA9IHRoaXM7XG5cbiAgLy8gZW5mb3JjZSBpbml0aWFsaXphdGlvbiB3aXRoIGBuZXdgXG4gIGlmICghKGhvb2RpZUFkbWluIGluc3RhbmNlb2YgSG9vZGllQWRtaW4pKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCd1c2FnZTogbmV3IEhvb2RpZUFkbWluKHVybCk7Jyk7XG4gIH1cblxuICBpZiAoYmFzZVVybCkge1xuICAgIC8vIHJlbW92ZSB0cmFpbGluZyBzbGFzaGVzXG4gICAgaG9vZGllQWRtaW4uYmFzZVVybCA9IGJhc2VVcmwucmVwbGFjZSgvXFwvKyQvLCAnJyk7XG4gIH1cblxuXG4gIC8vIGhvb2RpZUFkbWluLmV4dGVuZFxuICAvLyAtLS0tLS0tLS0tLS0tLS1cblxuICAvLyBleHRlbmQgaG9vZGllQWRtaW4gaW5zdGFuY2U6XG4gIC8vXG4gIC8vICAgICBob29kaWVBZG1pbi5leHRlbmQoZnVuY3Rpb24oaG9vZGllQWRtaW4pIHt9IClcbiAgLy9cbiAgaG9vZGllQWRtaW4uZXh0ZW5kID0gZnVuY3Rpb24gZXh0ZW5kKGV4dGVuc2lvbikge1xuICAgIGV4dGVuc2lvbihob29kaWVBZG1pbik7XG4gIH07XG5cbiAgLy9cbiAgLy8gRXh0ZW5kaW5nIGhvb2RpZSBhZG1pbiBjb3JlXG4gIC8vXG5cbiAgLy8gKiBob29kaWVBZG1pbi5iaW5kXG4gIC8vICogaG9vZGllQWRtaW4ub25cbiAgLy8gKiBob29kaWVBZG1pbi5vbmVcbiAgLy8gKiBob29kaWVBZG1pbi50cmlnZ2VyXG4gIC8vICogaG9vZGllQWRtaW4udW5iaW5kXG4gIC8vICogaG9vZGllQWRtaW4ub2ZmXG4gIGhvb2RpZUFkbWluLmV4dGVuZChob29kaWVFdmVudHMpO1xuXG5cbiAgLy8gKiBob29kaWVBZG1pbi5kZWZlclxuICAvLyAqIGhvb2RpZUFkbWluLmlzUHJvbWlzZVxuICAvLyAqIGhvb2RpZUFkbWluLnJlc29sdmVcbiAgLy8gKiBob29kaWVBZG1pbi5yZWplY3RcbiAgLy8gKiBob29kaWVBZG1pbi5yZXNvbHZlV2l0aFxuICAvLyAqIGhvb2RpZUFkbWluLnJlamVjdFdpdGhcbiAgaG9vZGllQWRtaW4uZXh0ZW5kKGhvb2RpZVByb21pc2VzICk7XG5cbiAgLy8gKiBob29kaWUub3BlblxuICBob29kaWVBZG1pbi5leHRlbmQoaG9vZGllT3Blbik7XG5cbiAgLy9cbiAgLy8gbG9hZGluZyB1c2VyIGV4dGVuc2lvbnNcbiAgLy9cbiAgYXBwbHlFeHRlbnNpb25zKEhvb2RpZUFkbWluKTtcbn1cblxuLy8gRXh0ZW5kaW5nIEhvb2RpZUFkbWluXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbi8vIFlvdSBjYW4gZXh0ZW5kIHRoZSBIb29kaWUgY2xhc3MgbGlrZSBzbzpcbi8vXG4vLyBIb29kaWUuZXh0ZW5kKGZ1bmNpb24oSG9vZGllQWRtaW4pIHsgSG9vZGllQWRtaW4ubXlNYWdpYyA9IGZ1bmN0aW9uKCkge30gfSlcbi8vXG5cbnZhciBleHRlbnNpb25zID0gW107XG5cbkhvb2RpZUFkbWluLmV4dGVuZCA9IGZ1bmN0aW9uKGV4dGVuc2lvbikge1xuICBleHRlbnNpb25zLnB1c2goZXh0ZW5zaW9uKTtcbn07XG5cbi8vXG4vLyBkZXRlY3QgYXZhaWxhYmxlIGV4dGVuc2lvbnMgYW5kIGF0dGFjaCB0byBIb29kaWUgT2JqZWN0LlxuLy9cbmZ1bmN0aW9uIGFwcGx5RXh0ZW5zaW9ucyhob29kaWUpIHtcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBleHRlbnNpb25zLmxlbmd0aDsgaSsrKSB7XG4gICAgZXh0ZW5zaW9uc1tpXShob29kaWUpO1xuICB9XG59XG5cbm1vZHVsZS5leHBvcnRzID0gSG9vZGllQWRtaW47XG4iXX0=
(10)
});
;