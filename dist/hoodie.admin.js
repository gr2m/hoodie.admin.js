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

},{"./store":10}],8:[function(require,module,exports){
//
// hoodie.request
// ================

// Hoodie's central place to send request to its backend.
// At the moment, it's a wrapper around jQuery's ajax method,
// but we might get rid of this dependency in the future.
//
// It has build in support for CORS and a standard error
// handling that normalizes errors returned by CouchDB
// to JavaScript's nativ conventions of errors having
// a name & a message property.
//
// Common errors to expect:
//
// * HoodieRequestError
// * HoodieUnauthorizedError
// * HoodieConflictError
// * HoodieServerError
//
function hoodieRequest(hoodie) {
  var $extend = $.extend;
  var $ajax = $.ajax;

  // Hoodie backend listents to requests prefixed by /_api,
  // so we prefix all requests with relative URLs
  var API_PATH = '/_api';

  // Requests
  // ----------

  // sends requests to the hoodie backend.
  //
  //     promise = hoodie.request('GET', '/user_database/doc_id')
  //
  function request(type, url, options) {
    var defaults, requestPromise, pipedPromise;

    options = options || {};

    defaults = {
      type: type,
      dataType: 'json'
    };

    // if absolute path passed, set CORS headers

    // if relative path passed, prefix with baseUrl
    if (!/^http/.test(url)) {
      url = (hoodie.baseUrl || '') + API_PATH + url;
    }

    // if url is cross domain, set CORS headers
    if (/^http/.test(url)) {
      defaults.xhrFields = {
        withCredentials: true
      };
      defaults.crossDomain = true;
    }

    defaults.url = url;


    // we are piping the result of the request to return a nicer
    // error if the request cannot reach the server at all.
    // We can't return the promise of ajax directly because of
    // the piping, as for whatever reason the returned promise
    // does not have the `abort` method any more, maybe others
    // as well. See also http://bugs.jquery.com/ticket/14104
    requestPromise = $ajax($extend(defaults, options));
    pipedPromise = requestPromise.then( null, handleRequestError);
    pipedPromise.abort = requestPromise.abort;

    return pipedPromise;
  }

  //
  //
  //
  function handleRequestError(xhr) {
    var error;

    try {
      error = parseErrorFromResponse(xhr);
    } catch (_error) {

      if (xhr.responseText) {
        error = xhr.responseText;
      } else {
        error = {
          name: 'HoodieConnectionError',
          message: 'Could not connect to Hoodie server at {{url}}.',
          url: hoodie.baseUrl || '/'
        };
      }
    }

    return hoodie.rejectWith(error).promise();
  }

  //
  // CouchDB returns errors in JSON format, with the properties
  // `error` and `reason`. Hoodie uses JavaScript's native Error
  // properties `name` and `message` instead, so we are normalizing
  // that.
  //
  // Besides the renaming we also do a matching with a map of known
  // errors to make them more clear. For reference, see
  // https://wiki.apache.org/couchdb/Default_http_errors &
  // https://github.com/apache/couchdb/blob/master/src/couchdb/couch_httpd.erl#L807
  //

  function parseErrorFromResponse(xhr) {
    var error = JSON.parse(xhr.responseText);

    // get error name
    error.name = HTTP_STATUS_ERROR_MAP[xhr.status];
    if (! error.name) {
      error.name = hoodiefyRequestErrorName(error.error);
    }

    // store status & message
    error.status = xhr.status;
    error.message = error.reason || '';
    error.message = error.message.charAt(0).toUpperCase() + error.message.slice(1);

    // cleanup
    delete error.error;
    delete error.reason;

    return error;
  }

  // map CouchDB HTTP status codes to Hoodie Errors
  var HTTP_STATUS_ERROR_MAP = {
    400: 'HoodieRequestError', // bad request
    401: 'HoodieUnauthorizedError',
    403: 'HoodieRequestError', // forbidden
    404: 'HoodieNotFoundError', // forbidden
    409: 'HoodieConflictError',
    412: 'HoodieConflictError', // file exist
    500: 'HoodieServerError'
  };


  function hoodiefyRequestErrorName(name) {
    name = name.replace(/(^\w|_\w)/g, function (match) {
      return (match[1] || match[0]).toUpperCase();
    });
    return 'Hoodie' + name + 'Error';
  }


  //
  // public API
  //
  hoodie.request = request;
}

module.exports = hoodieRequest;

},{}],9:[function(require,module,exports){
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

},{"./events":4}],10:[function(require,module,exports){
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

},{"./error":1,"./error/object_id":2,"./error/object_type":3,"./events":4,"./scoped_store":9}],11:[function(require,module,exports){
// Hoodie Admin
// -------------
//
// your friendly library for pocket,
// the Hoodie Admin UI
//
var hoodieEvents = require('../node_modules/hoodie/src/hoodie/events');
var hoodiePromises = require('../node_modules/hoodie/src/hoodie/promises');
var hoodieRequest = require('../node_modules/hoodie/src/hoodie/request');
var hoodieOpen = require('../node_modules/hoodie/src/hoodie/open');

var hoodieAdminAccount = require('./hoodie.admin/account');
var hoodieAdminPlugins = require('./hoodie.admin/plugins');

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

  // * hoodieAdmin.request
  hoodieAdmin.extend(hoodieRequest);

  // * hoodieAdmin.open
  hoodieAdmin.extend(hoodieOpen);

  // * hoodieAdmin.account
  hoodieAdmin.extend(hoodieAdminAccount);

  // * hoodieAdmin.plugins
  hoodieAdmin.extend(hoodieAdminPlugins);

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

},{"../node_modules/hoodie/src/hoodie/events":4,"../node_modules/hoodie/src/hoodie/open":5,"../node_modules/hoodie/src/hoodie/promises":6,"../node_modules/hoodie/src/hoodie/request":8,"./hoodie.admin/account":12,"./hoodie.admin/plugins":13}],12:[function(require,module,exports){
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

},{"../../node_modules/hoodie/src/hoodie/events":4}],13:[function(require,module,exports){
function hoodieAdminPlugins( hoodieAdmin ) {
  hoodieAdmin.plugins = hoodieAdmin.open('plugins');
}

module.exports = hoodieAdminPlugins;

},{}]},{},[11])
//@ sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlcyI6WyIvVXNlcnMvZ3JlZ29yL0phdmFTY3JpcHRzL2hvb2QuaWUvaG9vZGllLmFkbWluLmpzL25vZGVfbW9kdWxlcy9ob29kaWUvc3JjL2hvb2RpZS9lcnJvci5qcyIsIi9Vc2Vycy9ncmVnb3IvSmF2YVNjcmlwdHMvaG9vZC5pZS9ob29kaWUuYWRtaW4uanMvbm9kZV9tb2R1bGVzL2hvb2RpZS9zcmMvaG9vZGllL2Vycm9yL29iamVjdF9pZC5qcyIsIi9Vc2Vycy9ncmVnb3IvSmF2YVNjcmlwdHMvaG9vZC5pZS9ob29kaWUuYWRtaW4uanMvbm9kZV9tb2R1bGVzL2hvb2RpZS9zcmMvaG9vZGllL2Vycm9yL29iamVjdF90eXBlLmpzIiwiL1VzZXJzL2dyZWdvci9KYXZhU2NyaXB0cy9ob29kLmllL2hvb2RpZS5hZG1pbi5qcy9ub2RlX21vZHVsZXMvaG9vZGllL3NyYy9ob29kaWUvZXZlbnRzLmpzIiwiL1VzZXJzL2dyZWdvci9KYXZhU2NyaXB0cy9ob29kLmllL2hvb2RpZS5hZG1pbi5qcy9ub2RlX21vZHVsZXMvaG9vZGllL3NyYy9ob29kaWUvb3Blbi5qcyIsIi9Vc2Vycy9ncmVnb3IvSmF2YVNjcmlwdHMvaG9vZC5pZS9ob29kaWUuYWRtaW4uanMvbm9kZV9tb2R1bGVzL2hvb2RpZS9zcmMvaG9vZGllL3Byb21pc2VzLmpzIiwiL1VzZXJzL2dyZWdvci9KYXZhU2NyaXB0cy9ob29kLmllL2hvb2RpZS5hZG1pbi5qcy9ub2RlX21vZHVsZXMvaG9vZGllL3NyYy9ob29kaWUvcmVtb3RlX3N0b3JlLmpzIiwiL1VzZXJzL2dyZWdvci9KYXZhU2NyaXB0cy9ob29kLmllL2hvb2RpZS5hZG1pbi5qcy9ub2RlX21vZHVsZXMvaG9vZGllL3NyYy9ob29kaWUvcmVxdWVzdC5qcyIsIi9Vc2Vycy9ncmVnb3IvSmF2YVNjcmlwdHMvaG9vZC5pZS9ob29kaWUuYWRtaW4uanMvbm9kZV9tb2R1bGVzL2hvb2RpZS9zcmMvaG9vZGllL3Njb3BlZF9zdG9yZS5qcyIsIi9Vc2Vycy9ncmVnb3IvSmF2YVNjcmlwdHMvaG9vZC5pZS9ob29kaWUuYWRtaW4uanMvbm9kZV9tb2R1bGVzL2hvb2RpZS9zcmMvaG9vZGllL3N0b3JlLmpzIiwiL1VzZXJzL2dyZWdvci9KYXZhU2NyaXB0cy9ob29kLmllL2hvb2RpZS5hZG1pbi5qcy9zcmMvaG9vZGllLmFkbWluLmpzIiwiL1VzZXJzL2dyZWdvci9KYXZhU2NyaXB0cy9ob29kLmllL2hvb2RpZS5hZG1pbi5qcy9zcmMvaG9vZGllLmFkbWluL2FjY291bnQuanMiLCIvVXNlcnMvZ3JlZ29yL0phdmFTY3JpcHRzL2hvb2QuaWUvaG9vZGllLmFkbWluLmpzL3NyYy9ob29kaWUuYWRtaW4vcGx1Z2lucy5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25LQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN3ZCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hLQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvR0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeFpBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaEhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwic291cmNlc0NvbnRlbnQiOlsiLy8gSG9vZGllIEVycm9yXG4vLyAtLS0tLS0tLS0tLS0tXG5cbi8vIFdpdGggdGhlIGN1c3RvbSBob29kaWUgZXJyb3IgZnVuY3Rpb25cbi8vIHdlIG5vcm1hbGl6ZSBhbGwgZXJyb3JzIHRoZSBnZXQgcmV0dXJuZWRcbi8vIHdoZW4gdXNpbmcgaG9vZGllLnJlamVjdFdpdGhcbi8vXG4vLyBUaGUgbmF0aXZlIEphdmFTY3JpcHQgZXJyb3IgbWV0aG9kIGhhc1xuLy8gYSBuYW1lICYgYSBtZXNzYWdlIHByb3BlcnR5LiBIb29kaWVFcnJvclxuLy8gcmVxdWlyZXMgdGhlc2UsIGJ1dCBvbiB0b3AgYWxsb3dzIGZvclxuLy8gdW5saW1pdGVkIGN1c3RvbSBwcm9wZXJ0aWVzLlxuLy9cbi8vIEluc3RlYWQgb2YgYmVpbmcgaW5pdGlhbGl6ZWQgd2l0aCBqdXN0XG4vLyB0aGUgbWVzc2FnZSwgSG9vZGllRXJyb3IgZXhwZWN0cyBhblxuLy8gb2JqZWN0IHdpdGggcHJvcGVyaXRlcy4gVGhlIGBtZXNzYWdlYFxuLy8gcHJvcGVydHkgaXMgcmVxdWlyZWQuIFRoZSBuYW1lIHdpbGxcbi8vIGZhbGxiYWNrIHRvIGBlcnJvcmAuXG4vL1xuLy8gYG1lc3NhZ2VgIGNhbiBhbHNvIGNvbnRhaW4gcGxhY2Vob2xkZXJzXG4vLyBpbiB0aGUgZm9ybSBvZiBge3twcm9wZXJ0eU5hbWV9fWBgIHdoaWNoXG4vLyB3aWxsIGdldCByZXBsYWNlZCBhdXRvbWF0aWNhbGx5IHdpdGggcGFzc2VkXG4vLyBleHRyYSBwcm9wZXJ0aWVzLlxuLy9cbi8vICMjIyBFcnJvciBDb252ZW50aW9uc1xuLy9cbi8vIFdlIGZvbGxvdyBKYXZhU2NyaXB0J3MgbmF0aXZlIGVycm9yIGNvbnZlbnRpb25zLFxuLy8gbWVhbmluZyB0aGF0IGVycm9yIG5hbWVzIGFyZSBjYW1lbENhc2Ugd2l0aCB0aGVcbi8vIGZpcnN0IGxldHRlciB1cHBlcmNhc2UgYXMgd2VsbCwgYW5kIHRoZSBtZXNzYWdlXG4vLyBzdGFydGluZyB3aXRoIGFuIHVwcGVyY2FzZSBsZXR0ZXIuXG4vL1xudmFyIGVycm9yTWVzc2FnZVJlcGxhY2VQYXR0ZXJuID0gL1xce1xce1xccypcXHcrXFxzKlxcfVxcfS9nO1xudmFyIGVycm9yTWVzc2FnZUZpbmRQcm9wZXJ0eVBhdHRlcm4gPSAvXFx3Ky87XG5mdW5jdGlvbiBIb29kaWVFcnJvcihwcm9wZXJ0aWVzKSB7XG5cbiAgLy8gbm9ybWFsaXplIGFyZ3VtZW50c1xuICBpZiAodHlwZW9mIHByb3BlcnRpZXMgPT09ICdzdHJpbmcnKSB7XG4gICAgcHJvcGVydGllcyA9IHtcbiAgICAgIG1lc3NhZ2U6IHByb3BlcnRpZXNcbiAgICB9O1xuICB9XG5cbiAgaWYgKCEgcHJvcGVydGllcy5tZXNzYWdlKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdGQVRBTDogZXJyb3IubWVzc2FnZSBtdXN0IGJlIHNldCcpO1xuICB9XG5cbiAgLy8gbXVzdCBjaGVjayBmb3IgcHJvcGVydGllcywgYXMgdGhpcy5uYW1lIGlzIGFsd2F5cyBzZXQuXG4gIGlmICghIHByb3BlcnRpZXMubmFtZSkge1xuICAgIHByb3BlcnRpZXMubmFtZSA9ICdIb29kaWVFcnJvcic7XG4gIH1cblxuICBwcm9wZXJ0aWVzLm1lc3NhZ2UgPSBwcm9wZXJ0aWVzLm1lc3NhZ2UucmVwbGFjZShlcnJvck1lc3NhZ2VSZXBsYWNlUGF0dGVybiwgZnVuY3Rpb24obWF0Y2gpIHtcbiAgICB2YXIgcHJvcGVydHkgPSBtYXRjaC5tYXRjaChlcnJvck1lc3NhZ2VGaW5kUHJvcGVydHlQYXR0ZXJuKVswXTtcbiAgICByZXR1cm4gcHJvcGVydGllc1twcm9wZXJ0eV07XG4gIH0pO1xuXG4gICQuZXh0ZW5kKHRoaXMsIHByb3BlcnRpZXMpO1xufVxuSG9vZGllRXJyb3IucHJvdG90eXBlID0gbmV3IEVycm9yKCk7XG5Ib29kaWVFcnJvci5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBIb29kaWVFcnJvcjtcblxubW9kdWxlLmV4cG9ydHMgPSBIb29kaWVFcnJvcjtcbiIsIi8vIEhvb2RpZSBJbnZhbGlkIFR5cGUgT3IgSWQgRXJyb3Jcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuLy8gb25seSBsb3dlcmNhc2UgbGV0dGVycywgbnVtYmVycyBhbmQgZGFzaGVzXG4vLyBhcmUgYWxsb3dlZCBmb3Igb2JqZWN0IElEcy5cbi8vXG52YXIgSG9vZGllRXJyb3IgPSByZXF1aXJlKCcuLi9lcnJvcicpO1xuXG4vL1xuZnVuY3Rpb24gSG9vZGllT2JqZWN0SWRFcnJvcihwcm9wZXJ0aWVzKSB7XG4gIHByb3BlcnRpZXMubmFtZSA9ICdIb29kaWVPYmplY3RJZEVycm9yJztcbiAgcHJvcGVydGllcy5tZXNzYWdlID0gJ1wie3tpZH19XCIgaXMgaW52YWxpZCBvYmplY3QgaWQuIHt7cnVsZXN9fS4nO1xuXG4gIHJldHVybiBuZXcgSG9vZGllRXJyb3IocHJvcGVydGllcyk7XG59XG52YXIgdmFsaWRJZFBhdHRlcm4gPSAvXlthLXowLTlcXC1dKyQvO1xuSG9vZGllT2JqZWN0SWRFcnJvci5pc0ludmFsaWQgPSBmdW5jdGlvbihpZCwgY3VzdG9tUGF0dGVybikge1xuICByZXR1cm4gISAoY3VzdG9tUGF0dGVybiB8fCB2YWxpZElkUGF0dGVybikudGVzdChpZCB8fCAnJyk7XG59O1xuSG9vZGllT2JqZWN0SWRFcnJvci5pc1ZhbGlkID0gZnVuY3Rpb24oaWQsIGN1c3RvbVBhdHRlcm4pIHtcbiAgcmV0dXJuIChjdXN0b21QYXR0ZXJuIHx8IHZhbGlkSWRQYXR0ZXJuKS50ZXN0KGlkIHx8ICcnKTtcbn07XG5Ib29kaWVPYmplY3RJZEVycm9yLnByb3RvdHlwZS5ydWxlcyA9ICdMb3dlcmNhc2UgbGV0dGVycywgbnVtYmVycyBhbmQgZGFzaGVzIGFsbG93ZWQgb25seS4gTXVzdCBzdGFydCB3aXRoIGEgbGV0dGVyJztcblxubW9kdWxlLmV4cG9ydHMgPSBIb29kaWVPYmplY3RJZEVycm9yO1xuIiwiLy8gSG9vZGllIEludmFsaWQgVHlwZSBPciBJZCBFcnJvclxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG4vLyBvbmx5IGxvd2VyY2FzZSBsZXR0ZXJzLCBudW1iZXJzIGFuZCBkYXNoZXNcbi8vIGFyZSBhbGxvd2VkIGZvciBvYmplY3QgdHlwZXMsIHBsdXMgbXVzdCBzdGFydFxuLy8gd2l0aCBhIGxldHRlci5cbi8vXG52YXIgSG9vZGllRXJyb3IgPSByZXF1aXJlKCcuLi9lcnJvcicpO1xuXG4vL1xuZnVuY3Rpb24gSG9vZGllT2JqZWN0VHlwZUVycm9yKHByb3BlcnRpZXMpIHtcbiAgcHJvcGVydGllcy5uYW1lID0gJ0hvb2RpZU9iamVjdFR5cGVFcnJvcic7XG4gIHByb3BlcnRpZXMubWVzc2FnZSA9ICdcInt7dHlwZX19XCIgaXMgaW52YWxpZCBvYmplY3QgdHlwZS4ge3tydWxlc319Lic7XG5cbiAgcmV0dXJuIG5ldyBIb29kaWVFcnJvcihwcm9wZXJ0aWVzKTtcbn1cbnZhciB2YWxpZFR5cGVQYXR0ZXJuID0gL15bYS16JF1bYS16MC05XSskLztcbkhvb2RpZU9iamVjdFR5cGVFcnJvci5pc0ludmFsaWQgPSBmdW5jdGlvbih0eXBlLCBjdXN0b21QYXR0ZXJuKSB7XG4gIHJldHVybiAhIChjdXN0b21QYXR0ZXJuIHx8IHZhbGlkVHlwZVBhdHRlcm4pLnRlc3QodHlwZSB8fCAnJyk7XG59O1xuSG9vZGllT2JqZWN0VHlwZUVycm9yLmlzVmFsaWQgPSBmdW5jdGlvbih0eXBlLCBjdXN0b21QYXR0ZXJuKSB7XG4gIHJldHVybiAoY3VzdG9tUGF0dGVybiB8fCB2YWxpZFR5cGVQYXR0ZXJuKS50ZXN0KHR5cGUgfHwgJycpO1xufTtcbkhvb2RpZU9iamVjdFR5cGVFcnJvci5wcm90b3R5cGUucnVsZXMgPSAnbG93ZXJjYXNlIGxldHRlcnMsIG51bWJlcnMgYW5kIGRhc2hlcyBhbGxvd2VkIG9ubHkuIE11c3Qgc3RhcnQgd2l0aCBhIGxldHRlcic7XG5cbm1vZHVsZS5leHBvcnRzID0gSG9vZGllT2JqZWN0VHlwZUVycm9yO1xuIiwiLy8gRXZlbnRzXG4vLyA9PT09PT09PVxuLy9cbi8vIGV4dGVuZCBhbnkgQ2xhc3Mgd2l0aCBzdXBwb3J0IGZvclxuLy9cbi8vICogYG9iamVjdC5iaW5kKCdldmVudCcsIGNiKWBcbi8vICogYG9iamVjdC51bmJpbmQoJ2V2ZW50JywgY2IpYFxuLy8gKiBgb2JqZWN0LnRyaWdnZXIoJ2V2ZW50JywgYXJncy4uLilgXG4vLyAqIGBvYmplY3Qub25lKCdldicsIGNiKWBcbi8vXG4vLyBiYXNlZCBvbiBbRXZlbnRzIGltcGxlbWVudGF0aW9ucyBmcm9tIFNwaW5lXShodHRwczovL2dpdGh1Yi5jb20vbWFjY21hbi9zcGluZS9ibG9iL21hc3Rlci9zcmMvc3BpbmUuY29mZmVlI0wxKVxuLy9cblxuLy8gY2FsbGJhY2tzIGFyZSBnbG9iYWwsIHdoaWxlIHRoZSBldmVudHMgQVBJIGlzIHVzZWQgYXQgc2V2ZXJhbCBwbGFjZXMsXG4vLyBsaWtlIGhvb2RpZS5vbiAvIGhvb2RpZS5zdG9yZS5vbiAvIGhvb2RpZS50YXNrLm9uIGV0Yy5cbi8vXG5cbmZ1bmN0aW9uIGhvb2RpZUV2ZW50cyhob29kaWUsIG9wdGlvbnMpIHtcbiAgdmFyIGNvbnRleHQgPSBob29kaWU7XG4gIHZhciBuYW1lc3BhY2UgPSAnJztcblxuICAvLyBub3JtYWxpemUgb3B0aW9ucyBoYXNoXG4gIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuXG4gIC8vIG1ha2Ugc3VyZSBjYWxsYmFja3MgaGFzaCBleGlzdHNcbiAgaWYgKCFob29kaWUuZXZlbnRzQ2FsbGJhY2tzKSB7XG4gICAgaG9vZGllLmV2ZW50c0NhbGxiYWNrcyA9IHt9O1xuICB9XG5cbiAgaWYgKG9wdGlvbnMuY29udGV4dCkge1xuICAgIGNvbnRleHQgPSBvcHRpb25zLmNvbnRleHQ7XG4gICAgbmFtZXNwYWNlID0gb3B0aW9ucy5uYW1lc3BhY2UgKyAnOic7XG4gIH1cblxuICAvLyBCaW5kXG4gIC8vIC0tLS0tLVxuICAvL1xuICAvLyBiaW5kIGEgY2FsbGJhY2sgdG8gYW4gZXZlbnQgdHJpZ2dlcmQgYnkgdGhlIG9iamVjdFxuICAvL1xuICAvLyAgICAgb2JqZWN0LmJpbmQgJ2NoZWF0JywgYmxhbWVcbiAgLy9cbiAgZnVuY3Rpb24gYmluZChldiwgY2FsbGJhY2spIHtcbiAgICB2YXIgZXZzLCBuYW1lLCBfaSwgX2xlbjtcblxuICAgIGV2cyA9IGV2LnNwbGl0KCcgJyk7XG5cbiAgICBmb3IgKF9pID0gMCwgX2xlbiA9IGV2cy5sZW5ndGg7IF9pIDwgX2xlbjsgX2krKykge1xuICAgICAgbmFtZSA9IG5hbWVzcGFjZSArIGV2c1tfaV07XG4gICAgICBob29kaWUuZXZlbnRzQ2FsbGJhY2tzW25hbWVdID0gaG9vZGllLmV2ZW50c0NhbGxiYWNrc1tuYW1lXSB8fCBbXTtcbiAgICAgIGhvb2RpZS5ldmVudHNDYWxsYmFja3NbbmFtZV0ucHVzaChjYWxsYmFjayk7XG4gICAgfVxuICB9XG5cbiAgLy8gb25lXG4gIC8vIC0tLS0tXG4gIC8vXG4gIC8vIHNhbWUgYXMgYGJpbmRgLCBidXQgZG9lcyBnZXQgZXhlY3V0ZWQgb25seSBvbmNlXG4gIC8vXG4gIC8vICAgICBvYmplY3Qub25lICdncm91bmRUb3VjaCcsIGdhbWVPdmVyXG4gIC8vXG4gIGZ1bmN0aW9uIG9uZShldiwgY2FsbGJhY2spIHtcbiAgICBldiA9IG5hbWVzcGFjZSArIGV2O1xuICAgIHZhciB3cmFwcGVyID0gZnVuY3Rpb24oKSB7XG4gICAgICBob29kaWUudW5iaW5kKGV2LCB3cmFwcGVyKTtcbiAgICAgIGNhbGxiYWNrLmFwcGx5KG51bGwsIGFyZ3VtZW50cyk7XG4gICAgfTtcbiAgICBob29kaWUuYmluZChldiwgd3JhcHBlcik7XG4gIH1cblxuICAvLyB0cmlnZ2VyXG4gIC8vIC0tLS0tLS0tLVxuICAvL1xuICAvLyB0cmlnZ2VyIGFuIGV2ZW50IGFuZCBwYXNzIG9wdGlvbmFsIHBhcmFtZXRlcnMgZm9yIGJpbmRpbmcuXG4gIC8vICAgICBvYmplY3QudHJpZ2dlciAnd2luJywgc2NvcmU6IDEyMzBcbiAgLy9cbiAgZnVuY3Rpb24gdHJpZ2dlcigpIHtcbiAgICB2YXIgYXJncywgY2FsbGJhY2ssIGV2LCBsaXN0LCBfaSwgX2xlbjtcblxuICAgIGFyZ3MgPSAxIDw9IGFyZ3VtZW50cy5sZW5ndGggPyBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMsIDApIDogW107XG4gICAgZXYgPSBhcmdzLnNoaWZ0KCk7XG4gICAgZXYgPSBuYW1lc3BhY2UgKyBldjtcbiAgICBsaXN0ID0gaG9vZGllLmV2ZW50c0NhbGxiYWNrc1tldl07XG5cbiAgICBpZiAoIWxpc3QpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBmb3IgKF9pID0gMCwgX2xlbiA9IGxpc3QubGVuZ3RoOyBfaSA8IF9sZW47IF9pKyspIHtcbiAgICAgIGNhbGxiYWNrID0gbGlzdFtfaV07XG4gICAgICBjYWxsYmFjay5hcHBseShudWxsLCBhcmdzKTtcbiAgICB9XG5cbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuXG4gIC8vIHVuYmluZFxuICAvLyAtLS0tLS0tLVxuICAvL1xuICAvLyB1bmJpbmQgdG8gZnJvbSBhbGwgYmluZGluZ3MsIGZyb20gYWxsIGJpbmRpbmdzIG9mIGEgc3BlY2lmaWMgZXZlbnRcbiAgLy8gb3IgZnJvbSBhIHNwZWNpZmljIGJpbmRpbmcuXG4gIC8vXG4gIC8vICAgICBvYmplY3QudW5iaW5kKClcbiAgLy8gICAgIG9iamVjdC51bmJpbmQgJ21vdmUnXG4gIC8vICAgICBvYmplY3QudW5iaW5kICdtb3ZlJywgZm9sbG93XG4gIC8vXG4gIGZ1bmN0aW9uIHVuYmluZChldiwgY2FsbGJhY2spIHtcbiAgICB2YXIgY2IsIGksIGxpc3QsIF9pLCBfbGVuLCBldk5hbWVzO1xuXG4gICAgaWYgKCFldikge1xuICAgICAgaWYgKCFuYW1lc3BhY2UpIHtcbiAgICAgICAgaG9vZGllLmV2ZW50c0NhbGxiYWNrcyA9IHt9O1xuICAgICAgfVxuXG4gICAgICBldk5hbWVzID0gT2JqZWN0LmtleXMoaG9vZGllLmV2ZW50c0NhbGxiYWNrcyk7XG4gICAgICBldk5hbWVzID0gZXZOYW1lcy5maWx0ZXIoZnVuY3Rpb24oa2V5KSB7XG4gICAgICAgIHJldHVybiBrZXkuaW5kZXhPZihuYW1lc3BhY2UpID09PSAwO1xuICAgICAgfSk7XG4gICAgICBldk5hbWVzLmZvckVhY2goZnVuY3Rpb24oa2V5KSB7XG4gICAgICAgIGRlbGV0ZSBob29kaWUuZXZlbnRzQ2FsbGJhY2tzW2tleV07XG4gICAgICB9KTtcblxuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGV2ID0gbmFtZXNwYWNlICsgZXY7XG5cbiAgICBsaXN0ID0gaG9vZGllLmV2ZW50c0NhbGxiYWNrc1tldl07XG5cbiAgICBpZiAoIWxpc3QpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBpZiAoIWNhbGxiYWNrKSB7XG4gICAgICBkZWxldGUgaG9vZGllLmV2ZW50c0NhbGxiYWNrc1tldl07XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgZm9yIChpID0gX2kgPSAwLCBfbGVuID0gbGlzdC5sZW5ndGg7IF9pIDwgX2xlbjsgaSA9ICsrX2kpIHtcbiAgICAgIGNiID0gbGlzdFtpXTtcblxuXG4gICAgICBpZiAoY2IgIT09IGNhbGxiYWNrKSB7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuXG4gICAgICBsaXN0ID0gbGlzdC5zbGljZSgpO1xuICAgICAgbGlzdC5zcGxpY2UoaSwgMSk7XG4gICAgICBob29kaWUuZXZlbnRzQ2FsbGJhY2tzW2V2XSA9IGxpc3Q7XG4gICAgICBicmVhaztcbiAgICB9XG5cbiAgICByZXR1cm47XG4gIH1cblxuICBjb250ZXh0LmJpbmQgPSBiaW5kO1xuICBjb250ZXh0Lm9uID0gYmluZDtcbiAgY29udGV4dC5vbmUgPSBvbmU7XG4gIGNvbnRleHQudHJpZ2dlciA9IHRyaWdnZXI7XG4gIGNvbnRleHQudW5iaW5kID0gdW5iaW5kO1xuICBjb250ZXh0Lm9mZiA9IHVuYmluZDtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBob29kaWVFdmVudHM7XG4iLCIvLyBPcGVuIHN0b3Jlc1xuLy8gLS0tLS0tLS0tLS0tLVxuXG52YXIgaG9vZGllUmVtb3RlU3RvcmUgPSByZXF1aXJlKCcuL3JlbW90ZV9zdG9yZScpO1xuXG5mdW5jdGlvbiBob29kaWVPcGVuKGhvb2RpZSkge1xuXG4gIC8vIGdlbmVyaWMgbWV0aG9kIHRvIG9wZW4gYSBzdG9yZS4gVXNlZCBieVxuICAvL1xuICAvLyAqIGhvb2RpZS5yZW1vdGVcbiAgLy8gKiBob29kaWUudXNlcihcImpvZVwiKVxuICAvLyAqIGhvb2RpZS5nbG9iYWxcbiAgLy8gKiAuLi4gYW5kIG1vcmVcbiAgLy9cbiAgLy8gICAgIGhvb2RpZS5vcGVuKFwic29tZV9zdG9yZV9uYW1lXCIpLmZpbmRBbGwoKVxuICAvL1xuICBmdW5jdGlvbiBvcGVuKHN0b3JlTmFtZSwgb3B0aW9ucykge1xuICAgIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuXG4gICAgJC5leHRlbmQob3B0aW9ucywge1xuICAgICAgbmFtZTogc3RvcmVOYW1lXG4gICAgfSk7XG5cbiAgICByZXR1cm4gaG9vZGllUmVtb3RlU3RvcmUoaG9vZGllLCBvcHRpb25zKTtcbiAgfVxuXG4gIC8vXG4gIC8vIFB1YmxpYyBBUElcbiAgLy9cbiAgaG9vZGllLm9wZW4gPSBvcGVuO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGhvb2RpZU9wZW47XG4iLCIvLyBIb29kaWUgRGVmZXJzIC8gUHJvbWlzZXNcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG4vLyByZXR1cm5zIGEgZGVmZXIgb2JqZWN0IGZvciBjdXN0b20gcHJvbWlzZSBoYW5kbGluZ3MuXG4vLyBQcm9taXNlcyBhcmUgaGVhdmVseSB1c2VkIHRocm91Z2hvdXQgdGhlIGNvZGUgb2YgaG9vZGllLlxuLy8gV2UgY3VycmVudGx5IGJvcnJvdyBqUXVlcnkncyBpbXBsZW1lbnRhdGlvbjpcbi8vIGh0dHA6Ly9hcGkuanF1ZXJ5LmNvbS9jYXRlZ29yeS9kZWZlcnJlZC1vYmplY3QvXG4vL1xuLy8gICAgIGRlZmVyID0gaG9vZGllLmRlZmVyKClcbi8vICAgICBpZiAoZ29vZCkge1xuLy8gICAgICAgZGVmZXIucmVzb2x2ZSgnZ29vZC4nKVxuLy8gICAgIH0gZWxzZSB7XG4vLyAgICAgICBkZWZlci5yZWplY3QoJ25vdCBnb29kLicpXG4vLyAgICAgfVxuLy8gICAgIHJldHVybiBkZWZlci5wcm9taXNlKClcbi8vXG52YXIgSG9vZGllRXJyb3IgPSByZXF1aXJlKCcuL2Vycm9yJyk7XG5cbi8vXG5mdW5jdGlvbiBob29kaWVQcm9taXNlcyAoaG9vZGllKSB7XG4gIHZhciAkZGVmZXIgPSB3aW5kb3cualF1ZXJ5LkRlZmVycmVkO1xuXG4gIC8vIHJldHVybnMgdHJ1ZSBpZiBwYXNzZWQgb2JqZWN0IGlzIGEgcHJvbWlzZSAoYnV0IG5vdCBhIGRlZmVycmVkKSxcbiAgLy8gb3RoZXJ3aXNlIGZhbHNlLlxuICBmdW5jdGlvbiBpc1Byb21pc2Uob2JqZWN0KSB7XG4gICAgcmV0dXJuICEhIChvYmplY3QgJiZcbiAgICAgICAgICAgICAgIHR5cGVvZiBvYmplY3QuZG9uZSA9PT0gJ2Z1bmN0aW9uJyAmJlxuICAgICAgICAgICAgICAgdHlwZW9mIG9iamVjdC5yZXNvbHZlICE9PSAnZnVuY3Rpb24nKTtcbiAgfVxuXG4gIC8vXG4gIGZ1bmN0aW9uIHJlc29sdmUoKSB7XG4gICAgcmV0dXJuICRkZWZlcigpLnJlc29sdmUoKS5wcm9taXNlKCk7XG4gIH1cblxuXG4gIC8vXG4gIGZ1bmN0aW9uIHJlamVjdCgpIHtcbiAgICByZXR1cm4gJGRlZmVyKCkucmVqZWN0KCkucHJvbWlzZSgpO1xuICB9XG5cblxuICAvL1xuICBmdW5jdGlvbiByZXNvbHZlV2l0aCgpIHtcbiAgICB2YXIgX2RlZmVyID0gJGRlZmVyKCk7XG4gICAgcmV0dXJuIF9kZWZlci5yZXNvbHZlLmFwcGx5KF9kZWZlciwgYXJndW1lbnRzKS5wcm9taXNlKCk7XG4gIH1cblxuICAvL1xuICBmdW5jdGlvbiByZWplY3RXaXRoKGVycm9yUHJvcGVydGllcykge1xuICAgIHZhciBfZGVmZXIgPSAkZGVmZXIoKTtcbiAgICB2YXIgZXJyb3IgPSBuZXcgSG9vZGllRXJyb3IoZXJyb3JQcm9wZXJ0aWVzKTtcbiAgICByZXR1cm4gX2RlZmVyLnJlamVjdChlcnJvcikucHJvbWlzZSgpO1xuICB9XG5cbiAgLy9cbiAgLy8gUHVibGljIEFQSVxuICAvL1xuICBob29kaWUuZGVmZXIgPSAkZGVmZXI7XG4gIGhvb2RpZS5pc1Byb21pc2UgPSBpc1Byb21pc2U7XG4gIGhvb2RpZS5yZXNvbHZlID0gcmVzb2x2ZTtcbiAgaG9vZGllLnJlamVjdCA9IHJlamVjdDtcbiAgaG9vZGllLnJlc29sdmVXaXRoID0gcmVzb2x2ZVdpdGg7XG4gIGhvb2RpZS5yZWplY3RXaXRoID0gcmVqZWN0V2l0aDtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBob29kaWVQcm9taXNlcztcbiIsIi8vIFJlbW90ZVxuLy8gPT09PT09PT1cblxuLy8gQ29ubmVjdGlvbiB0byBhIHJlbW90ZSBDb3VjaCBEYXRhYmFzZS5cbi8vXG4vLyBzdG9yZSBBUElcbi8vIC0tLS0tLS0tLS0tLS0tLS1cbi8vXG4vLyBvYmplY3QgbG9hZGluZyAvIHVwZGF0aW5nIC8gZGVsZXRpbmdcbi8vXG4vLyAqIGZpbmQodHlwZSwgaWQpXG4vLyAqIGZpbmRBbGwodHlwZSApXG4vLyAqIGFkZCh0eXBlLCBvYmplY3QpXG4vLyAqIHNhdmUodHlwZSwgaWQsIG9iamVjdClcbi8vICogdXBkYXRlKHR5cGUsIGlkLCBuZXdfcHJvcGVydGllcyApXG4vLyAqIHVwZGF0ZUFsbCggdHlwZSwgbmV3X3Byb3BlcnRpZXMpXG4vLyAqIHJlbW92ZSh0eXBlLCBpZClcbi8vICogcmVtb3ZlQWxsKHR5cGUpXG4vL1xuLy8gY3VzdG9tIHJlcXVlc3RzXG4vL1xuLy8gKiByZXF1ZXN0KHZpZXcsIHBhcmFtcylcbi8vICogZ2V0KHZpZXcsIHBhcmFtcylcbi8vICogcG9zdCh2aWV3LCBwYXJhbXMpXG4vL1xuLy8gc3luY2hyb25pemF0aW9uXG4vL1xuLy8gKiBjb25uZWN0KClcbi8vICogZGlzY29ubmVjdCgpXG4vLyAqIHB1bGwoKVxuLy8gKiBwdXNoKClcbi8vICogc3luYygpXG4vL1xuLy8gZXZlbnQgYmluZGluZ1xuLy9cbi8vICogb24oZXZlbnQsIGNhbGxiYWNrKVxuLy9cbnZhciBob29kaWVTdG9yZUFwaSA9IHJlcXVpcmUoJy4vc3RvcmUnKTtcblxuLy9cbmZ1bmN0aW9uIGhvb2RpZVJlbW90ZVN0b3JlIChob29kaWUsIG9wdGlvbnMpIHtcblxuICB2YXIgcmVtb3RlU3RvcmUgPSB7fTtcblxuXG4gIC8vIFJlbW90ZSBTdG9yZSBQZXJzaXN0YW5jZSBtZXRob2RzXG4gIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuICAvLyBmaW5kXG4gIC8vIC0tLS0tLVxuXG4gIC8vIGZpbmQgb25lIG9iamVjdFxuICAvL1xuICByZW1vdGVTdG9yZS5maW5kID0gZnVuY3Rpb24gZmluZCh0eXBlLCBpZCkge1xuICAgIHZhciBwYXRoO1xuXG4gICAgcGF0aCA9IHR5cGUgKyAnLycgKyBpZDtcblxuICAgIGlmIChyZW1vdGUucHJlZml4KSB7XG4gICAgICBwYXRoID0gcmVtb3RlLnByZWZpeCArIHBhdGg7XG4gICAgfVxuXG4gICAgcGF0aCA9ICcvJyArIGVuY29kZVVSSUNvbXBvbmVudChwYXRoKTtcblxuICAgIHJldHVybiByZW1vdGUucmVxdWVzdCgnR0VUJywgcGF0aCkudGhlbihwYXJzZUZyb21SZW1vdGUpO1xuICB9O1xuXG5cbiAgLy8gZmluZEFsbFxuICAvLyAtLS0tLS0tLS1cblxuICAvLyBmaW5kIGFsbCBvYmplY3RzLCBjYW4gYmUgZmlsZXRlcmVkIGJ5IGEgdHlwZVxuICAvL1xuICByZW1vdGVTdG9yZS5maW5kQWxsID0gZnVuY3Rpb24gZmluZEFsbCh0eXBlKSB7XG4gICAgdmFyIGVuZGtleSwgcGF0aCwgc3RhcnRrZXk7XG5cbiAgICBwYXRoID0gJy9fYWxsX2RvY3M/aW5jbHVkZV9kb2NzPXRydWUnO1xuXG4gICAgc3dpdGNoICh0cnVlKSB7XG4gICAgY2FzZSAodHlwZSAhPT0gdW5kZWZpbmVkKSAmJiByZW1vdGUucHJlZml4ICE9PSAnJzpcbiAgICAgIHN0YXJ0a2V5ID0gcmVtb3RlLnByZWZpeCArIHR5cGUgKyAnLyc7XG4gICAgICBicmVhaztcbiAgICBjYXNlIHR5cGUgIT09IHVuZGVmaW5lZDpcbiAgICAgIHN0YXJ0a2V5ID0gdHlwZSArICcvJztcbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgcmVtb3RlLnByZWZpeCAhPT0gJyc6XG4gICAgICBzdGFydGtleSA9IHJlbW90ZS5wcmVmaXg7XG4gICAgICBicmVhaztcbiAgICBkZWZhdWx0OlxuICAgICAgc3RhcnRrZXkgPSAnJztcbiAgICB9XG5cbiAgICBpZiAoc3RhcnRrZXkpIHtcblxuICAgICAgLy8gbWFrZSBzdXJlIHRoYXQgb25seSBvYmplY3RzIHN0YXJ0aW5nIHdpdGhcbiAgICAgIC8vIGBzdGFydGtleWAgd2lsbCBiZSByZXR1cm5lZFxuICAgICAgZW5ka2V5ID0gc3RhcnRrZXkucmVwbGFjZSgvLiQvLCBmdW5jdGlvbihjaGFycykge1xuICAgICAgICB2YXIgY2hhckNvZGU7XG4gICAgICAgIGNoYXJDb2RlID0gY2hhcnMuY2hhckNvZGVBdCgwKTtcbiAgICAgICAgcmV0dXJuIFN0cmluZy5mcm9tQ2hhckNvZGUoY2hhckNvZGUgKyAxKTtcbiAgICAgIH0pO1xuICAgICAgcGF0aCA9ICcnICsgcGF0aCArICcmc3RhcnRrZXk9XCInICsgKGVuY29kZVVSSUNvbXBvbmVudChzdGFydGtleSkpICsgJ1wiJmVuZGtleT1cIicgKyAoZW5jb2RlVVJJQ29tcG9uZW50KGVuZGtleSkpICsgJ1wiJztcbiAgICB9XG5cbiAgICByZXR1cm4gcmVtb3RlLnJlcXVlc3QoJ0dFVCcsIHBhdGgpLnRoZW4obWFwRG9jc0Zyb21GaW5kQWxsKS50aGVuKHBhcnNlQWxsRnJvbVJlbW90ZSk7XG4gIH07XG5cblxuICAvLyBzYXZlXG4gIC8vIC0tLS0tLVxuXG4gIC8vIHNhdmUgYSBuZXcgb2JqZWN0LiBJZiBpdCBleGlzdGVkIGJlZm9yZSwgYWxsIHByb3BlcnRpZXNcbiAgLy8gd2lsbCBiZSBvdmVyd3JpdHRlblxuICAvL1xuICByZW1vdGVTdG9yZS5zYXZlID0gZnVuY3Rpb24gc2F2ZShvYmplY3QpIHtcbiAgICB2YXIgcGF0aDtcblxuICAgIGlmICghb2JqZWN0LmlkKSB7XG4gICAgICBvYmplY3QuaWQgPSBob29kaWUuZ2VuZXJhdGVJZCgpO1xuICAgIH1cblxuICAgIG9iamVjdCA9IHBhcnNlRm9yUmVtb3RlKG9iamVjdCk7XG4gICAgcGF0aCA9ICcvJyArIGVuY29kZVVSSUNvbXBvbmVudChvYmplY3QuX2lkKTtcbiAgICByZXR1cm4gcmVtb3RlLnJlcXVlc3QoJ1BVVCcsIHBhdGgsIHtcbiAgICAgIGRhdGE6IG9iamVjdFxuICAgIH0pO1xuICB9O1xuXG5cbiAgLy8gcmVtb3ZlXG4gIC8vIC0tLS0tLS0tLVxuXG4gIC8vIHJlbW92ZSBvbmUgb2JqZWN0XG4gIC8vXG4gIHJlbW90ZVN0b3JlLnJlbW92ZSA9IGZ1bmN0aW9uIHJlbW92ZSh0eXBlLCBpZCkge1xuICAgIHJldHVybiByZW1vdGUudXBkYXRlKHR5cGUsIGlkLCB7XG4gICAgICBfZGVsZXRlZDogdHJ1ZVxuICAgIH0pO1xuICB9O1xuXG5cbiAgLy8gcmVtb3ZlQWxsXG4gIC8vIC0tLS0tLS0tLS0tLVxuXG4gIC8vIHJlbW92ZSBhbGwgb2JqZWN0cywgY2FuIGJlIGZpbHRlcmVkIGJ5IHR5cGVcbiAgLy9cbiAgcmVtb3RlU3RvcmUucmVtb3ZlQWxsID0gZnVuY3Rpb24gcmVtb3ZlQWxsKHR5cGUpIHtcbiAgICByZXR1cm4gcmVtb3RlLnVwZGF0ZUFsbCh0eXBlLCB7XG4gICAgICBfZGVsZXRlZDogdHJ1ZVxuICAgIH0pO1xuICB9O1xuXG5cbiAgdmFyIHJlbW90ZSA9IGhvb2RpZVN0b3JlQXBpKGhvb2RpZSwge1xuXG4gICAgbmFtZTogb3B0aW9ucy5uYW1lLFxuXG4gICAgYmFja2VuZDoge1xuICAgICAgc2F2ZTogcmVtb3RlU3RvcmUuc2F2ZSxcbiAgICAgIGZpbmQ6IHJlbW90ZVN0b3JlLmZpbmQsXG4gICAgICBmaW5kQWxsOiByZW1vdGVTdG9yZS5maW5kQWxsLFxuICAgICAgcmVtb3ZlOiByZW1vdGVTdG9yZS5yZW1vdmUsXG4gICAgICByZW1vdmVBbGw6IHJlbW90ZVN0b3JlLnJlbW92ZUFsbFxuICAgIH1cbiAgfSk7XG5cblxuXG5cblxuICAvLyBwcm9wZXJ0aWVzXG4gIC8vIC0tLS0tLS0tLS0tLVxuXG4gIC8vIG5hbWVcblxuICAvLyB0aGUgbmFtZSBvZiB0aGUgUmVtb3RlIGlzIHRoZSBuYW1lIG9mIHRoZVxuICAvLyBDb3VjaERCIGRhdGFiYXNlIGFuZCBpcyBhbHNvIHVzZWQgdG8gcHJlZml4XG4gIC8vIHRyaWdnZXJlZCBldmVudHNcbiAgLy9cbiAgdmFyIHJlbW90ZU5hbWUgPSBudWxsO1xuXG5cbiAgLy8gc3luY1xuXG4gIC8vIGlmIHNldCB0byB0cnVlLCB1cGRhdGVzIHdpbGwgYmUgY29udGludW91c2x5IHB1bGxlZFxuICAvLyBhbmQgcHVzaGVkLiBBbHRlcm5hdGl2ZWx5LCBgc3luY2AgY2FuIGJlIHNldCB0b1xuICAvLyBgcHVsbDogdHJ1ZWAgb3IgYHB1c2g6IHRydWVgLlxuICAvL1xuICByZW1vdGUuY29ubmVjdGVkID0gZmFsc2U7XG5cblxuICAvLyBwcmVmaXhcblxuICAvLyBwcmVmaXggZm9yIGRvY3MgaW4gYSBDb3VjaERCIGRhdGFiYXNlLCBlLmcuIGFsbCBkb2NzXG4gIC8vIGluIHB1YmxpYyB1c2VyIHN0b3JlcyBhcmUgcHJlZml4ZWQgYnkgJyRwdWJsaWMvJ1xuICAvL1xuICByZW1vdGUucHJlZml4ID0gJyc7XG4gIHZhciByZW1vdGVQcmVmaXhQYXR0ZXJuID0gbmV3IFJlZ0V4cCgnXicpO1xuXG5cbiAgLy8gZGVmYXVsdHNcbiAgLy8gLS0tLS0tLS0tLS0tLS0tLVxuXG4gIC8vXG4gIGlmIChvcHRpb25zLm5hbWUgIT09IHVuZGVmaW5lZCkge1xuICAgIHJlbW90ZU5hbWUgPSBvcHRpb25zLm5hbWU7XG4gIH1cblxuICBpZiAob3B0aW9ucy5wcmVmaXggIT09IHVuZGVmaW5lZCkge1xuICAgIHJlbW90ZS5wcmVmaXggPSBvcHRpb25zLnByZWZpeDtcbiAgICByZW1vdGVQcmVmaXhQYXR0ZXJuID0gbmV3IFJlZ0V4cCgnXicgKyByZW1vdGUucHJlZml4KTtcbiAgfVxuXG4gIGlmIChvcHRpb25zLmJhc2VVcmwgIT09IG51bGwpIHtcbiAgICByZW1vdGUuYmFzZVVybCA9IG9wdGlvbnMuYmFzZVVybDtcbiAgfVxuXG5cbiAgLy8gcmVxdWVzdFxuICAvLyAtLS0tLS0tLS1cblxuICAvLyB3cmFwcGVyIGZvciBob29kaWUucmVxdWVzdCwgd2l0aCBzb21lIHN0b3JlIHNwZWNpZmljIGRlZmF1bHRzXG4gIC8vIGFuZCBhIHByZWZpeGVkIHBhdGhcbiAgLy9cbiAgcmVtb3RlLnJlcXVlc3QgPSBmdW5jdGlvbiByZXF1ZXN0KHR5cGUsIHBhdGgsIG9wdGlvbnMpIHtcbiAgICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcblxuICAgIGlmIChyZW1vdGVOYW1lKSB7XG4gICAgICBwYXRoID0gJy8nICsgKGVuY29kZVVSSUNvbXBvbmVudChyZW1vdGVOYW1lKSkgKyBwYXRoO1xuICAgIH1cblxuICAgIGlmIChyZW1vdGUuYmFzZVVybCkge1xuICAgICAgcGF0aCA9ICcnICsgcmVtb3RlLmJhc2VVcmwgKyBwYXRoO1xuICAgIH1cblxuICAgIG9wdGlvbnMuY29udGVudFR5cGUgPSBvcHRpb25zLmNvbnRlbnRUeXBlIHx8ICdhcHBsaWNhdGlvbi9qc29uJztcblxuICAgIGlmICh0eXBlID09PSAnUE9TVCcgfHwgdHlwZSA9PT0gJ1BVVCcpIHtcbiAgICAgIG9wdGlvbnMuZGF0YVR5cGUgPSBvcHRpb25zLmRhdGFUeXBlIHx8ICdqc29uJztcbiAgICAgIG9wdGlvbnMucHJvY2Vzc0RhdGEgPSBvcHRpb25zLnByb2Nlc3NEYXRhIHx8IGZhbHNlO1xuICAgICAgb3B0aW9ucy5kYXRhID0gSlNPTi5zdHJpbmdpZnkob3B0aW9ucy5kYXRhKTtcbiAgICB9XG4gICAgcmV0dXJuIGhvb2RpZS5yZXF1ZXN0KHR5cGUsIHBhdGgsIG9wdGlvbnMpO1xuICB9O1xuXG5cbiAgLy8gaXNLbm93bk9iamVjdFxuICAvLyAtLS0tLS0tLS0tLS0tLS1cblxuICAvLyBkZXRlcm1pbmUgYmV0d2VlbiBhIGtub3duIGFuZCBhIG5ldyBvYmplY3RcbiAgLy9cbiAgcmVtb3RlLmlzS25vd25PYmplY3QgPSBmdW5jdGlvbiBpc0tub3duT2JqZWN0KG9iamVjdCkge1xuICAgIHZhciBrZXkgPSAnJyArIG9iamVjdC50eXBlICsgJy8nICsgb2JqZWN0LmlkO1xuXG4gICAgaWYgKGtub3duT2JqZWN0c1trZXldICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIHJldHVybiBrbm93bk9iamVjdHNba2V5XTtcbiAgICB9XG4gIH07XG5cblxuICAvLyBtYXJrQXNLbm93bk9iamVjdFxuICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tXG5cbiAgLy8gZGV0ZXJtaW5lIGJldHdlZW4gYSBrbm93biBhbmQgYSBuZXcgb2JqZWN0XG4gIC8vXG4gIHJlbW90ZS5tYXJrQXNLbm93bk9iamVjdCA9IGZ1bmN0aW9uIG1hcmtBc0tub3duT2JqZWN0KG9iamVjdCkge1xuICAgIHZhciBrZXkgPSAnJyArIG9iamVjdC50eXBlICsgJy8nICsgb2JqZWN0LmlkO1xuICAgIGtub3duT2JqZWN0c1trZXldID0gMTtcbiAgICByZXR1cm4ga25vd25PYmplY3RzW2tleV07XG4gIH07XG5cblxuICAvLyBzeW5jaHJvbml6YXRpb25cbiAgLy8gLS0tLS0tLS0tLS0tLS0tLS1cblxuICAvLyBDb25uZWN0XG4gIC8vIC0tLS0tLS0tLVxuXG4gIC8vIHN0YXJ0IHN5bmNpbmcuIGByZW1vdGUuYm9vdHN0cmFwKClgIHdpbGwgYXV0b21hdGljYWxseSBzdGFydFxuICAvLyBwdWxsaW5nIHdoZW4gYHJlbW90ZS5jb25uZWN0ZWRgIHJlbWFpbnMgdHJ1ZS5cbiAgLy9cbiAgcmVtb3RlLmNvbm5lY3QgPSBmdW5jdGlvbiBjb25uZWN0KG5hbWUpIHtcbiAgICBpZiAobmFtZSkge1xuICAgICAgcmVtb3RlTmFtZSA9IG5hbWU7XG4gICAgfVxuICAgIHJlbW90ZS5jb25uZWN0ZWQgPSB0cnVlO1xuICAgIHJlbW90ZS50cmlnZ2VyKCdjb25uZWN0Jyk7XG4gICAgcmV0dXJuIHJlbW90ZS5ib290c3RyYXAoKS50aGVuKCBmdW5jdGlvbigpIHsgcmVtb3RlLnB1c2goKTsgfSApO1xuICB9O1xuXG5cbiAgLy8gRGlzY29ubmVjdFxuICAvLyAtLS0tLS0tLS0tLS1cblxuICAvLyBzdG9wIHN5bmNpbmcgY2hhbmdlcyBmcm9tIHJlbW90ZSBzdG9yZVxuICAvL1xuICByZW1vdGUuZGlzY29ubmVjdCA9IGZ1bmN0aW9uIGRpc2Nvbm5lY3QoKSB7XG4gICAgcmVtb3RlLmNvbm5lY3RlZCA9IGZhbHNlO1xuICAgIHJlbW90ZS50cmlnZ2VyKCdkaXNjb25uZWN0Jyk7IC8vIFRPRE86IHNwZWMgdGhhdFxuXG4gICAgaWYgKHB1bGxSZXF1ZXN0KSB7XG4gICAgICBwdWxsUmVxdWVzdC5hYm9ydCgpO1xuICAgIH1cblxuICAgIGlmIChwdXNoUmVxdWVzdCkge1xuICAgICAgcHVzaFJlcXVlc3QuYWJvcnQoKTtcbiAgICB9XG5cbiAgfTtcblxuXG4gIC8vIGlzQ29ubmVjdGVkXG4gIC8vIC0tLS0tLS0tLS0tLS1cblxuICAvL1xuICByZW1vdGUuaXNDb25uZWN0ZWQgPSBmdW5jdGlvbiBpc0Nvbm5lY3RlZCgpIHtcbiAgICByZXR1cm4gcmVtb3RlLmNvbm5lY3RlZDtcbiAgfTtcblxuXG4gIC8vIGdldFNpbmNlTnJcbiAgLy8gLS0tLS0tLS0tLS0tXG5cbiAgLy8gcmV0dXJucyB0aGUgc2VxdWVuY2UgbnVtYmVyIGZyb20gd2ljaCB0byBzdGFydCB0byBmaW5kIGNoYW5nZXMgaW4gcHVsbFxuICAvL1xuICB2YXIgc2luY2UgPSBvcHRpb25zLnNpbmNlIHx8IDA7IC8vIFRPRE86IHNwZWMgdGhhdCFcbiAgcmVtb3RlLmdldFNpbmNlTnIgPSBmdW5jdGlvbiBnZXRTaW5jZU5yKCkge1xuICAgIGlmICh0eXBlb2Ygc2luY2UgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgIHJldHVybiBzaW5jZSgpO1xuICAgIH1cblxuICAgIHJldHVybiBzaW5jZTtcbiAgfTtcblxuXG4gIC8vIGJvb3RzdHJhcFxuICAvLyAtLS0tLS0tLS0tLVxuXG4gIC8vIGluaXRhbCBwdWxsIG9mIGRhdGEgb2YgdGhlIHJlbW90ZSBzdG9yZS4gQnkgZGVmYXVsdCwgd2UgcHVsbCBhbGxcbiAgLy8gY2hhbmdlcyBzaW5jZSB0aGUgYmVnaW5uaW5nLCBidXQgdGhpcyBiZWhhdmlvciBtaWdodCBiZSBhZGp1c3RlZCxcbiAgLy8gZS5nIGZvciBhIGZpbHRlcmVkIGJvb3RzdHJhcC5cbiAgLy9cbiAgdmFyIGlzQm9vdHN0cmFwcGluZyA9IGZhbHNlO1xuICByZW1vdGUuYm9vdHN0cmFwID0gZnVuY3Rpb24gYm9vdHN0cmFwKCkge1xuICAgIGlzQm9vdHN0cmFwcGluZyA9IHRydWU7XG4gICAgcmVtb3RlLnRyaWdnZXIoJ2Jvb3RzdHJhcDpzdGFydCcpO1xuICAgIHJldHVybiByZW1vdGUucHVsbCgpLmRvbmUoIGhhbmRsZUJvb3RzdHJhcFN1Y2Nlc3MgKTtcbiAgfTtcblxuXG4gIC8vIHB1bGwgY2hhbmdlc1xuICAvLyAtLS0tLS0tLS0tLS0tLVxuXG4gIC8vIGEuay5hLiBtYWtlIGEgR0VUIHJlcXVlc3QgdG8gQ291Y2hEQidzIGBfY2hhbmdlc2AgZmVlZC5cbiAgLy8gV2UgY3VycmVudGx5IG1ha2UgbG9uZyBwb2xsIHJlcXVlc3RzLCB0aGF0IHdlIG1hbnVhbGx5IGFib3J0XG4gIC8vIGFuZCByZXN0YXJ0IGVhY2ggMjUgc2Vjb25kcy5cbiAgLy9cbiAgdmFyIHB1bGxSZXF1ZXN0LCBwdWxsUmVxdWVzdFRpbWVvdXQ7XG4gIHJlbW90ZS5wdWxsID0gZnVuY3Rpb24gcHVsbCgpIHtcbiAgICBwdWxsUmVxdWVzdCA9IHJlbW90ZS5yZXF1ZXN0KCdHRVQnLCBwdWxsVXJsKCkpO1xuXG4gICAgaWYgKHJlbW90ZS5pc0Nvbm5lY3RlZCgpKSB7XG4gICAgICB3aW5kb3cuY2xlYXJUaW1lb3V0KHB1bGxSZXF1ZXN0VGltZW91dCk7XG4gICAgICBwdWxsUmVxdWVzdFRpbWVvdXQgPSB3aW5kb3cuc2V0VGltZW91dChyZXN0YXJ0UHVsbFJlcXVlc3QsIDI1MDAwKTtcbiAgICB9XG5cbiAgICByZXR1cm4gcHVsbFJlcXVlc3QuZG9uZShoYW5kbGVQdWxsU3VjY2VzcykuZmFpbChoYW5kbGVQdWxsRXJyb3IpO1xuICB9O1xuXG5cbiAgLy8gcHVzaCBjaGFuZ2VzXG4gIC8vIC0tLS0tLS0tLS0tLS0tXG5cbiAgLy8gUHVzaCBvYmplY3RzIHRvIHJlbW90ZSBzdG9yZSB1c2luZyB0aGUgYF9idWxrX2RvY3NgIEFQSS5cbiAgLy9cbiAgdmFyIHB1c2hSZXF1ZXN0O1xuICByZW1vdGUucHVzaCA9IGZ1bmN0aW9uIHB1c2gob2JqZWN0cykge1xuICAgIHZhciBvYmplY3QsIG9iamVjdHNGb3JSZW1vdGUsIF9pLCBfbGVuO1xuXG4gICAgaWYgKCEkLmlzQXJyYXkob2JqZWN0cykpIHtcbiAgICAgIG9iamVjdHMgPSBkZWZhdWx0T2JqZWN0c1RvUHVzaCgpO1xuICAgIH1cblxuICAgIGlmIChvYmplY3RzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgcmV0dXJuIGhvb2RpZS5yZXNvbHZlV2l0aChbXSk7XG4gICAgfVxuXG4gICAgb2JqZWN0c0ZvclJlbW90ZSA9IFtdO1xuXG4gICAgZm9yIChfaSA9IDAsIF9sZW4gPSBvYmplY3RzLmxlbmd0aDsgX2kgPCBfbGVuOyBfaSsrKSB7XG5cbiAgICAgIC8vIGRvbid0IG1lc3Mgd2l0aCBvcmlnaW5hbCBvYmplY3RzXG4gICAgICBvYmplY3QgPSAkLmV4dGVuZCh0cnVlLCB7fSwgb2JqZWN0c1tfaV0pO1xuICAgICAgYWRkUmV2aXNpb25UbyhvYmplY3QpO1xuICAgICAgb2JqZWN0ID0gcGFyc2VGb3JSZW1vdGUob2JqZWN0KTtcbiAgICAgIG9iamVjdHNGb3JSZW1vdGUucHVzaChvYmplY3QpO1xuICAgIH1cbiAgICBwdXNoUmVxdWVzdCA9IHJlbW90ZS5yZXF1ZXN0KCdQT1NUJywgJy9fYnVsa19kb2NzJywge1xuICAgICAgZGF0YToge1xuICAgICAgICBkb2NzOiBvYmplY3RzRm9yUmVtb3RlLFxuICAgICAgICBuZXdfZWRpdHM6IGZhbHNlXG4gICAgICB9XG4gICAgfSk7XG5cbiAgICBwdXNoUmVxdWVzdC5kb25lKGZ1bmN0aW9uKCkge1xuICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBvYmplY3RzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIHJlbW90ZS50cmlnZ2VyKCdwdXNoJywgb2JqZWN0c1tpXSk7XG4gICAgICB9XG4gICAgfSk7XG4gICAgcmV0dXJuIHB1c2hSZXF1ZXN0O1xuICB9O1xuXG4gIC8vIHN5bmMgY2hhbmdlc1xuICAvLyAtLS0tLS0tLS0tLS0tLVxuXG4gIC8vIHB1c2ggb2JqZWN0cywgdGhlbiBwdWxsIHVwZGF0ZXMuXG4gIC8vXG4gIHJlbW90ZS5zeW5jID0gZnVuY3Rpb24gc3luYyhvYmplY3RzKSB7XG4gICAgcmV0dXJuIHJlbW90ZS5wdXNoKG9iamVjdHMpLnRoZW4ocmVtb3RlLnB1bGwpO1xuICB9O1xuXG4gIC8vXG4gIC8vIFByaXZhdGVcbiAgLy8gLS0tLS0tLS0tXG4gIC8vXG5cbiAgLy8gaW4gb3JkZXIgdG8gZGlmZmVyZW50aWF0ZSB3aGV0aGVyIGFuIG9iamVjdCBmcm9tIHJlbW90ZSBzaG91bGQgdHJpZ2dlciBhICduZXcnXG4gIC8vIG9yIGFuICd1cGRhdGUnIGV2ZW50LCB3ZSBzdG9yZSBhIGhhc2ggb2Yga25vd24gb2JqZWN0c1xuICB2YXIga25vd25PYmplY3RzID0ge307XG5cblxuICAvLyB2YWxpZCBDb3VjaERCIGRvYyBhdHRyaWJ1dGVzIHN0YXJ0aW5nIHdpdGggYW4gdW5kZXJzY29yZVxuICAvL1xuICB2YXIgdmFsaWRTcGVjaWFsQXR0cmlidXRlcyA9IFsnX2lkJywgJ19yZXYnLCAnX2RlbGV0ZWQnLCAnX3JldmlzaW9ucycsICdfYXR0YWNobWVudHMnXTtcblxuXG4gIC8vIGRlZmF1bHQgb2JqZWN0cyB0byBwdXNoXG4gIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbiAgLy8gd2hlbiBwdXNoZWQgd2l0aG91dCBwYXNzaW5nIGFueSBvYmplY3RzLCB0aGUgb2JqZWN0cyByZXR1cm5lZCBmcm9tXG4gIC8vIHRoaXMgbWV0aG9kIHdpbGwgYmUgcGFzc2VkLiBJdCBjYW4gYmUgb3ZlcndyaXR0ZW4gYnkgcGFzc2luZyBhblxuICAvLyBhcnJheSBvZiBvYmplY3RzIG9yIGEgZnVuY3Rpb24gYXMgYG9wdGlvbnMub2JqZWN0c2BcbiAgLy9cbiAgdmFyIGRlZmF1bHRPYmplY3RzVG9QdXNoID0gZnVuY3Rpb24gZGVmYXVsdE9iamVjdHNUb1B1c2goKSB7XG4gICAgcmV0dXJuIFtdO1xuICB9O1xuICBpZiAob3B0aW9ucy5kZWZhdWx0T2JqZWN0c1RvUHVzaCkge1xuICAgIGlmICgkLmlzQXJyYXkob3B0aW9ucy5kZWZhdWx0T2JqZWN0c1RvUHVzaCkpIHtcbiAgICAgIGRlZmF1bHRPYmplY3RzVG9QdXNoID0gZnVuY3Rpb24gZGVmYXVsdE9iamVjdHNUb1B1c2goKSB7XG4gICAgICAgIHJldHVybiBvcHRpb25zLmRlZmF1bHRPYmplY3RzVG9QdXNoO1xuICAgICAgfTtcbiAgICB9IGVsc2Uge1xuICAgICAgZGVmYXVsdE9iamVjdHNUb1B1c2ggPSBvcHRpb25zLmRlZmF1bHRPYmplY3RzVG9QdXNoO1xuICAgIH1cbiAgfVxuXG5cbiAgLy8gc2V0U2luY2VOclxuICAvLyAtLS0tLS0tLS0tLS1cblxuICAvLyBzZXRzIHRoZSBzZXF1ZW5jZSBudW1iZXIgZnJvbSB3aWNoIHRvIHN0YXJ0IHRvIGZpbmQgY2hhbmdlcyBpbiBwdWxsLlxuICAvLyBJZiByZW1vdGUgc3RvcmUgd2FzIGluaXRpYWxpemVkIHdpdGggc2luY2UgOiBmdW5jdGlvbihucikgeyAuLi4gfSxcbiAgLy8gY2FsbCB0aGUgZnVuY3Rpb24gd2l0aCB0aGUgc2VxIHBhc3NlZC4gT3RoZXJ3aXNlIHNpbXBseSBzZXQgdGhlIHNlcVxuICAvLyBudW1iZXIgYW5kIHJldHVybiBpdC5cbiAgLy9cbiAgZnVuY3Rpb24gc2V0U2luY2VOcihzZXEpIHtcbiAgICBpZiAodHlwZW9mIHNpbmNlID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICByZXR1cm4gc2luY2Uoc2VxKTtcbiAgICB9XG5cbiAgICBzaW5jZSA9IHNlcTtcbiAgICByZXR1cm4gc2luY2U7XG4gIH1cblxuXG4gIC8vIFBhcnNlIGZvciByZW1vdGVcbiAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tXG5cbiAgLy8gcGFyc2Ugb2JqZWN0IGZvciByZW1vdGUgc3RvcmFnZS4gQWxsIHByb3BlcnRpZXMgc3RhcnRpbmcgd2l0aCBhblxuICAvLyBgdW5kZXJzY29yZWAgZG8gbm90IGdldCBzeW5jaHJvbml6ZWQgZGVzcGl0ZSB0aGUgc3BlY2lhbCBwcm9wZXJ0aWVzXG4gIC8vIGBfaWRgLCBgX3JldmAgYW5kIGBfZGVsZXRlZGAgKHNlZSBhYm92ZSlcbiAgLy9cbiAgLy8gQWxzbyBgaWRgIGdldHMgcmVwbGFjZWQgd2l0aCBgX2lkYCB3aGljaCBjb25zaXN0cyBvZiB0eXBlICYgaWRcbiAgLy9cbiAgZnVuY3Rpb24gcGFyc2VGb3JSZW1vdGUob2JqZWN0KSB7XG4gICAgdmFyIGF0dHIsIHByb3BlcnRpZXM7XG4gICAgcHJvcGVydGllcyA9ICQuZXh0ZW5kKHt9LCBvYmplY3QpO1xuXG4gICAgZm9yIChhdHRyIGluIHByb3BlcnRpZXMpIHtcbiAgICAgIGlmIChwcm9wZXJ0aWVzLmhhc093blByb3BlcnR5KGF0dHIpKSB7XG4gICAgICAgIGlmICh2YWxpZFNwZWNpYWxBdHRyaWJ1dGVzLmluZGV4T2YoYXR0cikgIT09IC0xKSB7XG4gICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCEvXl8vLnRlc3QoYXR0cikpIHtcbiAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuICAgICAgICBkZWxldGUgcHJvcGVydGllc1thdHRyXTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBwcmVwYXJlIENvdWNoREIgaWRcbiAgICBwcm9wZXJ0aWVzLl9pZCA9ICcnICsgcHJvcGVydGllcy50eXBlICsgJy8nICsgcHJvcGVydGllcy5pZDtcbiAgICBpZiAocmVtb3RlLnByZWZpeCkge1xuICAgICAgcHJvcGVydGllcy5faWQgPSAnJyArIHJlbW90ZS5wcmVmaXggKyBwcm9wZXJ0aWVzLl9pZDtcbiAgICB9XG4gICAgZGVsZXRlIHByb3BlcnRpZXMuaWQ7XG4gICAgcmV0dXJuIHByb3BlcnRpZXM7XG4gIH1cblxuXG4gIC8vICMjIyBfcGFyc2VGcm9tUmVtb3RlXG5cbiAgLy8gbm9ybWFsaXplIG9iamVjdHMgY29taW5nIGZyb20gcmVtb3RlXG4gIC8vXG4gIC8vIHJlbmFtZXMgYF9pZGAgYXR0cmlidXRlIHRvIGBpZGAgYW5kIHJlbW92ZXMgdGhlIHR5cGUgZnJvbSB0aGUgaWQsXG4gIC8vIGUuZy4gYHR5cGUvMTIzYCAtPiBgMTIzYFxuICAvL1xuICBmdW5jdGlvbiBwYXJzZUZyb21SZW1vdGUob2JqZWN0KSB7XG4gICAgdmFyIGlkLCBpZ25vcmUsIF9yZWY7XG5cbiAgICAvLyBoYW5kbGUgaWQgYW5kIHR5cGVcbiAgICBpZCA9IG9iamVjdC5faWQgfHwgb2JqZWN0LmlkO1xuICAgIGRlbGV0ZSBvYmplY3QuX2lkO1xuXG4gICAgaWYgKHJlbW90ZS5wcmVmaXgpIHtcbiAgICAgIGlkID0gaWQucmVwbGFjZShyZW1vdGVQcmVmaXhQYXR0ZXJuLCAnJyk7XG4gICAgICAvLyBpZCA9IGlkLnJlcGxhY2UobmV3IFJlZ0V4cCgnXicgKyByZW1vdGUucHJlZml4KSwgJycpO1xuICAgIH1cblxuICAgIC8vIHR1cm4gZG9jLzEyMyBpbnRvIHR5cGUgPSBkb2MgJiBpZCA9IDEyM1xuICAgIC8vIE5PVEU6IHdlIGRvbid0IHVzZSBhIHNpbXBsZSBpZC5zcGxpdCgvXFwvLykgaGVyZSxcbiAgICAvLyBhcyBpbiBzb21lIGNhc2VzIElEcyBtaWdodCBjb250YWluICcvJywgdG9vXG4gICAgLy9cbiAgICBfcmVmID0gaWQubWF0Y2goLyhbXlxcL10rKVxcLyguKikvKSxcbiAgICBpZ25vcmUgPSBfcmVmWzBdLFxuICAgIG9iamVjdC50eXBlID0gX3JlZlsxXSxcbiAgICBvYmplY3QuaWQgPSBfcmVmWzJdO1xuXG4gICAgcmV0dXJuIG9iamVjdDtcbiAgfVxuXG4gIGZ1bmN0aW9uIHBhcnNlQWxsRnJvbVJlbW90ZShvYmplY3RzKSB7XG4gICAgdmFyIG9iamVjdCwgX2ksIF9sZW4sIF9yZXN1bHRzO1xuICAgIF9yZXN1bHRzID0gW107XG4gICAgZm9yIChfaSA9IDAsIF9sZW4gPSBvYmplY3RzLmxlbmd0aDsgX2kgPCBfbGVuOyBfaSsrKSB7XG4gICAgICBvYmplY3QgPSBvYmplY3RzW19pXTtcbiAgICAgIF9yZXN1bHRzLnB1c2gocGFyc2VGcm9tUmVtb3RlKG9iamVjdCkpO1xuICAgIH1cbiAgICByZXR1cm4gX3Jlc3VsdHM7XG4gIH1cblxuXG4gIC8vICMjIyBfYWRkUmV2aXNpb25Ub1xuXG4gIC8vIGV4dGVuZHMgcGFzc2VkIG9iamVjdCB3aXRoIGEgX3JldiBwcm9wZXJ0eVxuICAvL1xuICBmdW5jdGlvbiBhZGRSZXZpc2lvblRvKGF0dHJpYnV0ZXMpIHtcbiAgICB2YXIgY3VycmVudFJldklkLCBjdXJyZW50UmV2TnIsIG5ld1JldmlzaW9uSWQsIF9yZWY7XG4gICAgdHJ5IHtcbiAgICAgIF9yZWYgPSBhdHRyaWJ1dGVzLl9yZXYuc3BsaXQoLy0vKSxcbiAgICAgIGN1cnJlbnRSZXZOciA9IF9yZWZbMF0sXG4gICAgICBjdXJyZW50UmV2SWQgPSBfcmVmWzFdO1xuICAgIH0gY2F0Y2ggKF9lcnJvcikge31cbiAgICBjdXJyZW50UmV2TnIgPSBwYXJzZUludChjdXJyZW50UmV2TnIsIDEwKSB8fCAwO1xuICAgIG5ld1JldmlzaW9uSWQgPSBnZW5lcmF0ZU5ld1JldmlzaW9uSWQoKTtcblxuICAgIC8vIGxvY2FsIGNoYW5nZXMgYXJlIG5vdCBtZWFudCB0byBiZSByZXBsaWNhdGVkIG91dHNpZGUgb2YgdGhlXG4gICAgLy8gdXNlcnMgZGF0YWJhc2UsIHRoZXJlZm9yZSB0aGUgYC1sb2NhbGAgc3VmZml4LlxuICAgIGlmIChhdHRyaWJ1dGVzLl8kbG9jYWwpIHtcbiAgICAgIG5ld1JldmlzaW9uSWQgKz0gJy1sb2NhbCc7XG4gICAgfVxuXG4gICAgYXR0cmlidXRlcy5fcmV2ID0gJycgKyAoY3VycmVudFJldk5yICsgMSkgKyAnLScgKyBuZXdSZXZpc2lvbklkO1xuICAgIGF0dHJpYnV0ZXMuX3JldmlzaW9ucyA9IHtcbiAgICAgIHN0YXJ0OiAxLFxuICAgICAgaWRzOiBbbmV3UmV2aXNpb25JZF1cbiAgICB9O1xuXG4gICAgaWYgKGN1cnJlbnRSZXZJZCkge1xuICAgICAgYXR0cmlidXRlcy5fcmV2aXNpb25zLnN0YXJ0ICs9IGN1cnJlbnRSZXZOcjtcbiAgICAgIHJldHVybiBhdHRyaWJ1dGVzLl9yZXZpc2lvbnMuaWRzLnB1c2goY3VycmVudFJldklkKTtcbiAgICB9XG4gIH1cblxuXG4gIC8vICMjIyBnZW5lcmF0ZSBuZXcgcmV2aXNpb24gaWRcblxuICAvL1xuICBmdW5jdGlvbiBnZW5lcmF0ZU5ld1JldmlzaW9uSWQoKSB7XG4gICAgcmV0dXJuIGhvb2RpZS5nZW5lcmF0ZUlkKDkpO1xuICB9XG5cblxuICAvLyAjIyMgbWFwIGRvY3MgZnJvbSBmaW5kQWxsXG5cbiAgLy9cbiAgZnVuY3Rpb24gbWFwRG9jc0Zyb21GaW5kQWxsKHJlc3BvbnNlKSB7XG4gICAgcmV0dXJuIHJlc3BvbnNlLnJvd3MubWFwKGZ1bmN0aW9uKHJvdykge1xuICAgICAgcmV0dXJuIHJvdy5kb2M7XG4gICAgfSk7XG4gIH1cblxuXG4gIC8vICMjIyBwdWxsIHVybFxuXG4gIC8vIERlcGVuZGluZyBvbiB3aGV0aGVyIHJlbW90ZSBpcyBjb25uZWN0ZWQgKD0gcHVsbGluZyBjaGFuZ2VzIGNvbnRpbnVvdXNseSlcbiAgLy8gcmV0dXJuIGEgbG9uZ3BvbGwgVVJMIG9yIG5vdC4gSWYgaXQgaXMgYSBiZWdpbm5pbmcgYm9vdHN0cmFwIHJlcXVlc3QsIGRvXG4gIC8vIG5vdCByZXR1cm4gYSBsb25ncG9sbCBVUkwsIGFzIHdlIHdhbnQgaXQgdG8gZmluaXNoIHJpZ2h0IGF3YXksIGV2ZW4gaWYgdGhlcmVcbiAgLy8gYXJlIG5vIGNoYW5nZXMgb24gcmVtb3RlLlxuICAvL1xuICBmdW5jdGlvbiBwdWxsVXJsKCkge1xuICAgIHZhciBzaW5jZTtcbiAgICBzaW5jZSA9IHJlbW90ZS5nZXRTaW5jZU5yKCk7XG4gICAgaWYgKHJlbW90ZS5pc0Nvbm5lY3RlZCgpICYmICFpc0Jvb3RzdHJhcHBpbmcpIHtcbiAgICAgIHJldHVybiAnL19jaGFuZ2VzP2luY2x1ZGVfZG9jcz10cnVlJnNpbmNlPScgKyBzaW5jZSArICcmaGVhcnRiZWF0PTEwMDAwJmZlZWQ9bG9uZ3BvbGwnO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gJy9fY2hhbmdlcz9pbmNsdWRlX2RvY3M9dHJ1ZSZzaW5jZT0nICsgc2luY2U7XG4gICAgfVxuICB9XG5cblxuICAvLyAjIyMgcmVzdGFydCBwdWxsIHJlcXVlc3RcblxuICAvLyByZXF1ZXN0IGdldHMgcmVzdGFydGVkIGF1dG9tYXRpY2NhbGx5XG4gIC8vIHdoZW4gYWJvcnRlZCAoc2VlIGhhbmRsZVB1bGxFcnJvcilcbiAgZnVuY3Rpb24gcmVzdGFydFB1bGxSZXF1ZXN0KCkge1xuICAgIGlmIChwdWxsUmVxdWVzdCkge1xuICAgICAgcHVsbFJlcXVlc3QuYWJvcnQoKTtcbiAgICB9XG4gIH1cblxuXG4gIC8vICMjIyBwdWxsIHN1Y2Nlc3MgaGFuZGxlclxuXG4gIC8vIHJlcXVlc3QgZ2V0cyByZXN0YXJ0ZWQgYXV0b21hdGljY2FsbHlcbiAgLy8gd2hlbiBhYm9ydGVkIChzZWUgaGFuZGxlUHVsbEVycm9yKVxuICAvL1xuICBmdW5jdGlvbiBoYW5kbGVQdWxsU3VjY2VzcyhyZXNwb25zZSkge1xuICAgIHNldFNpbmNlTnIocmVzcG9uc2UubGFzdF9zZXEpO1xuICAgIGhhbmRsZVB1bGxSZXN1bHRzKHJlc3BvbnNlLnJlc3VsdHMpO1xuICAgIGlmIChyZW1vdGUuaXNDb25uZWN0ZWQoKSkge1xuICAgICAgcmV0dXJuIHJlbW90ZS5wdWxsKCk7XG4gICAgfVxuICB9XG5cblxuICAvLyAjIyMgcHVsbCBlcnJvciBoYW5kbGVyXG5cbiAgLy8gd2hlbiB0aGVyZSBpcyBhIGNoYW5nZSwgdHJpZ2dlciBldmVudCxcbiAgLy8gdGhlbiBjaGVjayBmb3IgYW5vdGhlciBjaGFuZ2VcbiAgLy9cbiAgZnVuY3Rpb24gaGFuZGxlUHVsbEVycm9yKHhociwgZXJyb3IpIHtcbiAgICBpZiAoIXJlbW90ZS5pc0Nvbm5lY3RlZCgpKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgc3dpdGNoICh4aHIuc3RhdHVzKSB7XG4gICAgICAvLyBTZXNzaW9uIGlzIGludmFsaWQuIFVzZXIgaXMgc3RpbGwgbG9naW4sIGJ1dCBuZWVkcyB0byByZWF1dGhlbnRpY2F0ZVxuICAgICAgLy8gYmVmb3JlIHN5bmMgY2FuIGJlIGNvbnRpbnVlZFxuICAgIGNhc2UgNDAxOlxuICAgICAgcmVtb3RlLnRyaWdnZXIoJ2Vycm9yOnVuYXV0aGVudGljYXRlZCcsIGVycm9yKTtcbiAgICAgIHJldHVybiByZW1vdGUuZGlzY29ubmVjdCgpO1xuXG4gICAgIC8vIHRoZSA0MDQgY29tZXMsIHdoZW4gdGhlIHJlcXVlc3RlZCBEQiBoYXMgYmVlbiByZW1vdmVkXG4gICAgIC8vIG9yIGRvZXMgbm90IGV4aXN0IHlldC5cbiAgICAgLy9cbiAgICAgLy8gQlVUOiBpdCBtaWdodCBhbHNvIGhhcHBlbiB0aGF0IHRoZSBiYWNrZ3JvdW5kIHdvcmtlcnMgZGlkXG4gICAgIC8vICAgICAgbm90IGNyZWF0ZSBhIHBlbmRpbmcgZGF0YWJhc2UgeWV0LiBUaGVyZWZvcmUsXG4gICAgIC8vICAgICAgd2UgdHJ5IGl0IGFnYWluIGluIDMgc2Vjb25kc1xuICAgICAvL1xuICAgICAvLyBUT0RPOiByZXZpZXcgLyByZXRoaW5rIHRoYXQuXG4gICAgIC8vXG5cbiAgICBjYXNlIDQwNDpcbiAgICAgIHJldHVybiB3aW5kb3cuc2V0VGltZW91dChyZW1vdGUucHVsbCwgMzAwMCk7XG5cbiAgICBjYXNlIDUwMDpcbiAgICAgIC8vXG4gICAgICAvLyBQbGVhc2Ugc2VydmVyLCBkb24ndCBnaXZlIHVzIHRoZXNlLiBBdCBsZWFzdCBub3QgcGVyc2lzdGVudGx5XG4gICAgICAvL1xuICAgICAgcmVtb3RlLnRyaWdnZXIoJ2Vycm9yOnNlcnZlcicsIGVycm9yKTtcbiAgICAgIHdpbmRvdy5zZXRUaW1lb3V0KHJlbW90ZS5wdWxsLCAzMDAwKTtcbiAgICAgIHJldHVybiBob29kaWUuY2hlY2tDb25uZWN0aW9uKCk7XG4gICAgZGVmYXVsdDpcbiAgICAgIC8vIHVzdWFsbHkgYSAwLCB3aGljaCBzdGFuZHMgZm9yIHRpbWVvdXQgb3Igc2VydmVyIG5vdCByZWFjaGFibGUuXG4gICAgICBpZiAoeGhyLnN0YXR1c1RleHQgPT09ICdhYm9ydCcpIHtcbiAgICAgICAgLy8gbWFudWFsIGFib3J0IGFmdGVyIDI1c2VjLiByZXN0YXJ0IHB1bGxpbmcgY2hhbmdlcyBkaXJlY3RseSB3aGVuIGNvbm5lY3RlZFxuICAgICAgICByZXR1cm4gcmVtb3RlLnB1bGwoKTtcbiAgICAgIH0gZWxzZSB7XG5cbiAgICAgICAgLy8gb29wcy4gVGhpcyBtaWdodCBiZSBjYXVzZWQgYnkgYW4gdW5yZWFjaGFibGUgc2VydmVyLlxuICAgICAgICAvLyBPciB0aGUgc2VydmVyIGNhbmNlbGxlZCBpdCBmb3Igd2hhdCBldmVyIHJlYXNvbiwgZS5nLlxuICAgICAgICAvLyBoZXJva3Uga2lsbHMgdGhlIHJlcXVlc3QgYWZ0ZXIgfjMwcy5cbiAgICAgICAgLy8gd2UnbGwgdHJ5IGFnYWluIGFmdGVyIGEgM3MgdGltZW91dFxuICAgICAgICAvL1xuICAgICAgICB3aW5kb3cuc2V0VGltZW91dChyZW1vdGUucHVsbCwgMzAwMCk7XG4gICAgICAgIHJldHVybiBob29kaWUuY2hlY2tDb25uZWN0aW9uKCk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cblxuICAvLyAjIyMgaGFuZGxlIGNoYW5nZXMgZnJvbSByZW1vdGVcbiAgLy9cbiAgZnVuY3Rpb24gaGFuZGxlQm9vdHN0cmFwU3VjY2VzcygpIHtcbiAgICBpc0Jvb3RzdHJhcHBpbmcgPSBmYWxzZTtcbiAgICByZW1vdGUudHJpZ2dlcignYm9vdHN0cmFwOmVuZCcpO1xuICB9XG5cbiAgLy8gIyMjIGhhbmRsZSBjaGFuZ2VzIGZyb20gcmVtb3RlXG4gIC8vXG4gIGZ1bmN0aW9uIGhhbmRsZVB1bGxSZXN1bHRzKGNoYW5nZXMpIHtcbiAgICB2YXIgZG9jLCBldmVudCwgb2JqZWN0LCBfaSwgX2xlbjtcblxuICAgIGZvciAoX2kgPSAwLCBfbGVuID0gY2hhbmdlcy5sZW5ndGg7IF9pIDwgX2xlbjsgX2krKykge1xuICAgICAgZG9jID0gY2hhbmdlc1tfaV0uZG9jO1xuXG4gICAgICBpZiAocmVtb3RlLnByZWZpeCAmJiBkb2MuX2lkLmluZGV4T2YocmVtb3RlLnByZWZpeCkgIT09IDApIHtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG5cbiAgICAgIG9iamVjdCA9IHBhcnNlRnJvbVJlbW90ZShkb2MpO1xuXG4gICAgICBpZiAob2JqZWN0Ll9kZWxldGVkKSB7XG4gICAgICAgIGlmICghcmVtb3RlLmlzS25vd25PYmplY3Qob2JqZWN0KSkge1xuICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG4gICAgICAgIGV2ZW50ID0gJ3JlbW92ZSc7XG4gICAgICAgIHJlbW90ZS5pc0tub3duT2JqZWN0KG9iamVjdCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBpZiAocmVtb3RlLmlzS25vd25PYmplY3Qob2JqZWN0KSkge1xuICAgICAgICAgIGV2ZW50ID0gJ3VwZGF0ZSc7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgZXZlbnQgPSAnYWRkJztcbiAgICAgICAgICByZW1vdGUubWFya0FzS25vd25PYmplY3Qob2JqZWN0KTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICByZW1vdGUudHJpZ2dlcihldmVudCwgb2JqZWN0KTtcbiAgICAgIHJlbW90ZS50cmlnZ2VyKGV2ZW50ICsgJzonICsgb2JqZWN0LnR5cGUsIG9iamVjdCk7XG4gICAgICByZW1vdGUudHJpZ2dlcihldmVudCArICc6JyArIG9iamVjdC50eXBlICsgJzonICsgb2JqZWN0LmlkLCBvYmplY3QpO1xuICAgICAgcmVtb3RlLnRyaWdnZXIoJ2NoYW5nZScsIGV2ZW50LCBvYmplY3QpO1xuICAgICAgcmVtb3RlLnRyaWdnZXIoJ2NoYW5nZTonICsgb2JqZWN0LnR5cGUsIGV2ZW50LCBvYmplY3QpO1xuICAgICAgcmVtb3RlLnRyaWdnZXIoJ2NoYW5nZTonICsgb2JqZWN0LnR5cGUgKyAnOicgKyBvYmplY3QuaWQsIGV2ZW50LCBvYmplY3QpO1xuICAgIH1cbiAgfVxuXG5cbiAgLy8gYm9vdHN0cmFwIGtub3duIG9iamVjdHNcbiAgLy9cbiAgaWYgKG9wdGlvbnMua25vd25PYmplY3RzKSB7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBvcHRpb25zLmtub3duT2JqZWN0cy5sZW5ndGg7IGkrKykge1xuICAgICAgcmVtb3RlLm1hcmtBc0tub3duT2JqZWN0KHtcbiAgICAgICAgdHlwZTogb3B0aW9ucy5rbm93bk9iamVjdHNbaV0udHlwZSxcbiAgICAgICAgaWQ6IG9wdGlvbnMua25vd25PYmplY3RzW2ldLmlkXG4gICAgICB9KTtcbiAgICB9XG4gIH1cblxuXG4gIC8vIGV4cG9zZSBwdWJsaWMgQVBJXG4gIHJldHVybiByZW1vdGU7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gaG9vZGllUmVtb3RlU3RvcmU7XG4iLCIvL1xuLy8gaG9vZGllLnJlcXVlc3Rcbi8vID09PT09PT09PT09PT09PT1cblxuLy8gSG9vZGllJ3MgY2VudHJhbCBwbGFjZSB0byBzZW5kIHJlcXVlc3QgdG8gaXRzIGJhY2tlbmQuXG4vLyBBdCB0aGUgbW9tZW50LCBpdCdzIGEgd3JhcHBlciBhcm91bmQgalF1ZXJ5J3MgYWpheCBtZXRob2QsXG4vLyBidXQgd2UgbWlnaHQgZ2V0IHJpZCBvZiB0aGlzIGRlcGVuZGVuY3kgaW4gdGhlIGZ1dHVyZS5cbi8vXG4vLyBJdCBoYXMgYnVpbGQgaW4gc3VwcG9ydCBmb3IgQ09SUyBhbmQgYSBzdGFuZGFyZCBlcnJvclxuLy8gaGFuZGxpbmcgdGhhdCBub3JtYWxpemVzIGVycm9ycyByZXR1cm5lZCBieSBDb3VjaERCXG4vLyB0byBKYXZhU2NyaXB0J3MgbmF0aXYgY29udmVudGlvbnMgb2YgZXJyb3JzIGhhdmluZ1xuLy8gYSBuYW1lICYgYSBtZXNzYWdlIHByb3BlcnR5LlxuLy9cbi8vIENvbW1vbiBlcnJvcnMgdG8gZXhwZWN0OlxuLy9cbi8vICogSG9vZGllUmVxdWVzdEVycm9yXG4vLyAqIEhvb2RpZVVuYXV0aG9yaXplZEVycm9yXG4vLyAqIEhvb2RpZUNvbmZsaWN0RXJyb3Jcbi8vICogSG9vZGllU2VydmVyRXJyb3Jcbi8vXG5mdW5jdGlvbiBob29kaWVSZXF1ZXN0KGhvb2RpZSkge1xuICB2YXIgJGV4dGVuZCA9ICQuZXh0ZW5kO1xuICB2YXIgJGFqYXggPSAkLmFqYXg7XG5cbiAgLy8gSG9vZGllIGJhY2tlbmQgbGlzdGVudHMgdG8gcmVxdWVzdHMgcHJlZml4ZWQgYnkgL19hcGksXG4gIC8vIHNvIHdlIHByZWZpeCBhbGwgcmVxdWVzdHMgd2l0aCByZWxhdGl2ZSBVUkxzXG4gIHZhciBBUElfUEFUSCA9ICcvX2FwaSc7XG5cbiAgLy8gUmVxdWVzdHNcbiAgLy8gLS0tLS0tLS0tLVxuXG4gIC8vIHNlbmRzIHJlcXVlc3RzIHRvIHRoZSBob29kaWUgYmFja2VuZC5cbiAgLy9cbiAgLy8gICAgIHByb21pc2UgPSBob29kaWUucmVxdWVzdCgnR0VUJywgJy91c2VyX2RhdGFiYXNlL2RvY19pZCcpXG4gIC8vXG4gIGZ1bmN0aW9uIHJlcXVlc3QodHlwZSwgdXJsLCBvcHRpb25zKSB7XG4gICAgdmFyIGRlZmF1bHRzLCByZXF1ZXN0UHJvbWlzZSwgcGlwZWRQcm9taXNlO1xuXG4gICAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG5cbiAgICBkZWZhdWx0cyA9IHtcbiAgICAgIHR5cGU6IHR5cGUsXG4gICAgICBkYXRhVHlwZTogJ2pzb24nXG4gICAgfTtcblxuICAgIC8vIGlmIGFic29sdXRlIHBhdGggcGFzc2VkLCBzZXQgQ09SUyBoZWFkZXJzXG5cbiAgICAvLyBpZiByZWxhdGl2ZSBwYXRoIHBhc3NlZCwgcHJlZml4IHdpdGggYmFzZVVybFxuICAgIGlmICghL15odHRwLy50ZXN0KHVybCkpIHtcbiAgICAgIHVybCA9IChob29kaWUuYmFzZVVybCB8fCAnJykgKyBBUElfUEFUSCArIHVybDtcbiAgICB9XG5cbiAgICAvLyBpZiB1cmwgaXMgY3Jvc3MgZG9tYWluLCBzZXQgQ09SUyBoZWFkZXJzXG4gICAgaWYgKC9eaHR0cC8udGVzdCh1cmwpKSB7XG4gICAgICBkZWZhdWx0cy54aHJGaWVsZHMgPSB7XG4gICAgICAgIHdpdGhDcmVkZW50aWFsczogdHJ1ZVxuICAgICAgfTtcbiAgICAgIGRlZmF1bHRzLmNyb3NzRG9tYWluID0gdHJ1ZTtcbiAgICB9XG5cbiAgICBkZWZhdWx0cy51cmwgPSB1cmw7XG5cblxuICAgIC8vIHdlIGFyZSBwaXBpbmcgdGhlIHJlc3VsdCBvZiB0aGUgcmVxdWVzdCB0byByZXR1cm4gYSBuaWNlclxuICAgIC8vIGVycm9yIGlmIHRoZSByZXF1ZXN0IGNhbm5vdCByZWFjaCB0aGUgc2VydmVyIGF0IGFsbC5cbiAgICAvLyBXZSBjYW4ndCByZXR1cm4gdGhlIHByb21pc2Ugb2YgYWpheCBkaXJlY3RseSBiZWNhdXNlIG9mXG4gICAgLy8gdGhlIHBpcGluZywgYXMgZm9yIHdoYXRldmVyIHJlYXNvbiB0aGUgcmV0dXJuZWQgcHJvbWlzZVxuICAgIC8vIGRvZXMgbm90IGhhdmUgdGhlIGBhYm9ydGAgbWV0aG9kIGFueSBtb3JlLCBtYXliZSBvdGhlcnNcbiAgICAvLyBhcyB3ZWxsLiBTZWUgYWxzbyBodHRwOi8vYnVncy5qcXVlcnkuY29tL3RpY2tldC8xNDEwNFxuICAgIHJlcXVlc3RQcm9taXNlID0gJGFqYXgoJGV4dGVuZChkZWZhdWx0cywgb3B0aW9ucykpO1xuICAgIHBpcGVkUHJvbWlzZSA9IHJlcXVlc3RQcm9taXNlLnRoZW4oIG51bGwsIGhhbmRsZVJlcXVlc3RFcnJvcik7XG4gICAgcGlwZWRQcm9taXNlLmFib3J0ID0gcmVxdWVzdFByb21pc2UuYWJvcnQ7XG5cbiAgICByZXR1cm4gcGlwZWRQcm9taXNlO1xuICB9XG5cbiAgLy9cbiAgLy9cbiAgLy9cbiAgZnVuY3Rpb24gaGFuZGxlUmVxdWVzdEVycm9yKHhocikge1xuICAgIHZhciBlcnJvcjtcblxuICAgIHRyeSB7XG4gICAgICBlcnJvciA9IHBhcnNlRXJyb3JGcm9tUmVzcG9uc2UoeGhyKTtcbiAgICB9IGNhdGNoIChfZXJyb3IpIHtcblxuICAgICAgaWYgKHhoci5yZXNwb25zZVRleHQpIHtcbiAgICAgICAgZXJyb3IgPSB4aHIucmVzcG9uc2VUZXh0O1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgZXJyb3IgPSB7XG4gICAgICAgICAgbmFtZTogJ0hvb2RpZUNvbm5lY3Rpb25FcnJvcicsXG4gICAgICAgICAgbWVzc2FnZTogJ0NvdWxkIG5vdCBjb25uZWN0IHRvIEhvb2RpZSBzZXJ2ZXIgYXQge3t1cmx9fS4nLFxuICAgICAgICAgIHVybDogaG9vZGllLmJhc2VVcmwgfHwgJy8nXG4gICAgICAgIH07XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIGhvb2RpZS5yZWplY3RXaXRoKGVycm9yKS5wcm9taXNlKCk7XG4gIH1cblxuICAvL1xuICAvLyBDb3VjaERCIHJldHVybnMgZXJyb3JzIGluIEpTT04gZm9ybWF0LCB3aXRoIHRoZSBwcm9wZXJ0aWVzXG4gIC8vIGBlcnJvcmAgYW5kIGByZWFzb25gLiBIb29kaWUgdXNlcyBKYXZhU2NyaXB0J3MgbmF0aXZlIEVycm9yXG4gIC8vIHByb3BlcnRpZXMgYG5hbWVgIGFuZCBgbWVzc2FnZWAgaW5zdGVhZCwgc28gd2UgYXJlIG5vcm1hbGl6aW5nXG4gIC8vIHRoYXQuXG4gIC8vXG4gIC8vIEJlc2lkZXMgdGhlIHJlbmFtaW5nIHdlIGFsc28gZG8gYSBtYXRjaGluZyB3aXRoIGEgbWFwIG9mIGtub3duXG4gIC8vIGVycm9ycyB0byBtYWtlIHRoZW0gbW9yZSBjbGVhci4gRm9yIHJlZmVyZW5jZSwgc2VlXG4gIC8vIGh0dHBzOi8vd2lraS5hcGFjaGUub3JnL2NvdWNoZGIvRGVmYXVsdF9odHRwX2Vycm9ycyAmXG4gIC8vIGh0dHBzOi8vZ2l0aHViLmNvbS9hcGFjaGUvY291Y2hkYi9ibG9iL21hc3Rlci9zcmMvY291Y2hkYi9jb3VjaF9odHRwZC5lcmwjTDgwN1xuICAvL1xuXG4gIGZ1bmN0aW9uIHBhcnNlRXJyb3JGcm9tUmVzcG9uc2UoeGhyKSB7XG4gICAgdmFyIGVycm9yID0gSlNPTi5wYXJzZSh4aHIucmVzcG9uc2VUZXh0KTtcblxuICAgIC8vIGdldCBlcnJvciBuYW1lXG4gICAgZXJyb3IubmFtZSA9IEhUVFBfU1RBVFVTX0VSUk9SX01BUFt4aHIuc3RhdHVzXTtcbiAgICBpZiAoISBlcnJvci5uYW1lKSB7XG4gICAgICBlcnJvci5uYW1lID0gaG9vZGllZnlSZXF1ZXN0RXJyb3JOYW1lKGVycm9yLmVycm9yKTtcbiAgICB9XG5cbiAgICAvLyBzdG9yZSBzdGF0dXMgJiBtZXNzYWdlXG4gICAgZXJyb3Iuc3RhdHVzID0geGhyLnN0YXR1cztcbiAgICBlcnJvci5tZXNzYWdlID0gZXJyb3IucmVhc29uIHx8ICcnO1xuICAgIGVycm9yLm1lc3NhZ2UgPSBlcnJvci5tZXNzYWdlLmNoYXJBdCgwKS50b1VwcGVyQ2FzZSgpICsgZXJyb3IubWVzc2FnZS5zbGljZSgxKTtcblxuICAgIC8vIGNsZWFudXBcbiAgICBkZWxldGUgZXJyb3IuZXJyb3I7XG4gICAgZGVsZXRlIGVycm9yLnJlYXNvbjtcblxuICAgIHJldHVybiBlcnJvcjtcbiAgfVxuXG4gIC8vIG1hcCBDb3VjaERCIEhUVFAgc3RhdHVzIGNvZGVzIHRvIEhvb2RpZSBFcnJvcnNcbiAgdmFyIEhUVFBfU1RBVFVTX0VSUk9SX01BUCA9IHtcbiAgICA0MDA6ICdIb29kaWVSZXF1ZXN0RXJyb3InLCAvLyBiYWQgcmVxdWVzdFxuICAgIDQwMTogJ0hvb2RpZVVuYXV0aG9yaXplZEVycm9yJyxcbiAgICA0MDM6ICdIb29kaWVSZXF1ZXN0RXJyb3InLCAvLyBmb3JiaWRkZW5cbiAgICA0MDQ6ICdIb29kaWVOb3RGb3VuZEVycm9yJywgLy8gZm9yYmlkZGVuXG4gICAgNDA5OiAnSG9vZGllQ29uZmxpY3RFcnJvcicsXG4gICAgNDEyOiAnSG9vZGllQ29uZmxpY3RFcnJvcicsIC8vIGZpbGUgZXhpc3RcbiAgICA1MDA6ICdIb29kaWVTZXJ2ZXJFcnJvcidcbiAgfTtcblxuXG4gIGZ1bmN0aW9uIGhvb2RpZWZ5UmVxdWVzdEVycm9yTmFtZShuYW1lKSB7XG4gICAgbmFtZSA9IG5hbWUucmVwbGFjZSgvKF5cXHd8X1xcdykvZywgZnVuY3Rpb24gKG1hdGNoKSB7XG4gICAgICByZXR1cm4gKG1hdGNoWzFdIHx8IG1hdGNoWzBdKS50b1VwcGVyQ2FzZSgpO1xuICAgIH0pO1xuICAgIHJldHVybiAnSG9vZGllJyArIG5hbWUgKyAnRXJyb3InO1xuICB9XG5cblxuICAvL1xuICAvLyBwdWJsaWMgQVBJXG4gIC8vXG4gIGhvb2RpZS5yZXF1ZXN0ID0gcmVxdWVzdDtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBob29kaWVSZXF1ZXN0O1xuIiwiLy8gc2NvcGVkIFN0b3JlXG4vLyA9PT09PT09PT09PT1cblxuLy8gc2FtZSBhcyBzdG9yZSwgYnV0IHdpdGggdHlwZSBwcmVzZXQgdG8gYW4gaW5pdGlhbGx5XG4vLyBwYXNzZWQgdmFsdWUuXG4vL1xudmFyIGhvb2RpZUV2ZW50cyA9IHJlcXVpcmUoJy4vZXZlbnRzJyk7XG5cbi8vXG5mdW5jdGlvbiBob29kaWVTY29wZWRTdG9yZUFwaShob29kaWUsIHN0b3JlQXBpLCBvcHRpb25zKSB7XG5cbiAgLy8gbmFtZVxuICB2YXIgc3RvcmVOYW1lID0gb3B0aW9ucy5uYW1lIHx8ICdzdG9yZSc7XG4gIHZhciB0eXBlID0gb3B0aW9ucy50eXBlO1xuICB2YXIgaWQgPSBvcHRpb25zLmlkO1xuXG4gIHZhciBhcGkgPSB7fTtcblxuICAvLyBzY29wZWQgYnkgdHlwZSBvbmx5XG4gIGlmICghaWQpIHtcblxuICAgIC8vIGFkZCBldmVudHNcbiAgICBob29kaWVFdmVudHMoaG9vZGllLCB7XG4gICAgICBjb250ZXh0OiBhcGksXG4gICAgICBuYW1lc3BhY2U6IHN0b3JlTmFtZSArICc6JyArIHR5cGVcbiAgICB9KTtcblxuICAgIC8vXG4gICAgYXBpLnNhdmUgPSBmdW5jdGlvbiBzYXZlKGlkLCBwcm9wZXJ0aWVzLCBvcHRpb25zKSB7XG4gICAgICByZXR1cm4gc3RvcmVBcGkuc2F2ZSh0eXBlLCBpZCwgcHJvcGVydGllcywgb3B0aW9ucyk7XG4gICAgfTtcblxuICAgIC8vXG4gICAgYXBpLmFkZCA9IGZ1bmN0aW9uIGFkZChwcm9wZXJ0aWVzLCBvcHRpb25zKSB7XG4gICAgICByZXR1cm4gc3RvcmVBcGkuYWRkKHR5cGUsIHByb3BlcnRpZXMsIG9wdGlvbnMpO1xuICAgIH07XG5cbiAgICAvL1xuICAgIGFwaS5maW5kID0gZnVuY3Rpb24gZmluZChpZCkge1xuICAgICAgcmV0dXJuIHN0b3JlQXBpLmZpbmQodHlwZSwgaWQpO1xuICAgIH07XG5cbiAgICAvL1xuICAgIGFwaS5maW5kT3JBZGQgPSBmdW5jdGlvbiBmaW5kT3JBZGQoaWQsIHByb3BlcnRpZXMpIHtcbiAgICAgIHJldHVybiBzdG9yZUFwaS5maW5kT3JBZGQodHlwZSwgaWQsIHByb3BlcnRpZXMpO1xuICAgIH07XG5cbiAgICAvL1xuICAgIGFwaS5maW5kQWxsID0gZnVuY3Rpb24gZmluZEFsbChvcHRpb25zKSB7XG4gICAgICByZXR1cm4gc3RvcmVBcGkuZmluZEFsbCh0eXBlLCBvcHRpb25zKTtcbiAgICB9O1xuXG4gICAgLy9cbiAgICBhcGkudXBkYXRlID0gZnVuY3Rpb24gdXBkYXRlKGlkLCBvYmplY3RVcGRhdGUsIG9wdGlvbnMpIHtcbiAgICAgIHJldHVybiBzdG9yZUFwaS51cGRhdGUodHlwZSwgaWQsIG9iamVjdFVwZGF0ZSwgb3B0aW9ucyk7XG4gICAgfTtcblxuICAgIC8vXG4gICAgYXBpLnVwZGF0ZUFsbCA9IGZ1bmN0aW9uIHVwZGF0ZUFsbChvYmplY3RVcGRhdGUsIG9wdGlvbnMpIHtcbiAgICAgIHJldHVybiBzdG9yZUFwaS51cGRhdGVBbGwodHlwZSwgb2JqZWN0VXBkYXRlLCBvcHRpb25zKTtcbiAgICB9O1xuXG4gICAgLy9cbiAgICBhcGkucmVtb3ZlID0gZnVuY3Rpb24gcmVtb3ZlKGlkLCBvcHRpb25zKSB7XG4gICAgICByZXR1cm4gc3RvcmVBcGkucmVtb3ZlKHR5cGUsIGlkLCBvcHRpb25zKTtcbiAgICB9O1xuXG4gICAgLy9cbiAgICBhcGkucmVtb3ZlQWxsID0gZnVuY3Rpb24gcmVtb3ZlQWxsKG9wdGlvbnMpIHtcbiAgICAgIHJldHVybiBzdG9yZUFwaS5yZW1vdmVBbGwodHlwZSwgb3B0aW9ucyk7XG4gICAgfTtcbiAgfVxuXG4gIC8vIHNjb3BlZCBieSBib3RoOiB0eXBlICYgaWRcbiAgaWYgKGlkKSB7XG5cbiAgICAvLyBhZGQgZXZlbnRzXG4gICAgaG9vZGllRXZlbnRzKGhvb2RpZSwge1xuICAgICAgY29udGV4dDogYXBpLFxuICAgICAgbmFtZXNwYWNlOiBzdG9yZU5hbWUgKyAnOicgKyB0eXBlICsgJzonICsgaWRcbiAgICB9KTtcblxuICAgIC8vXG4gICAgYXBpLnNhdmUgPSBmdW5jdGlvbiBzYXZlKHByb3BlcnRpZXMsIG9wdGlvbnMpIHtcbiAgICAgIHJldHVybiBzdG9yZUFwaS5zYXZlKHR5cGUsIGlkLCBwcm9wZXJ0aWVzLCBvcHRpb25zKTtcbiAgICB9O1xuXG4gICAgLy9cbiAgICBhcGkuZmluZCA9IGZ1bmN0aW9uIGZpbmQoKSB7XG4gICAgICByZXR1cm4gc3RvcmVBcGkuZmluZCh0eXBlLCBpZCk7XG4gICAgfTtcblxuICAgIC8vXG4gICAgYXBpLnVwZGF0ZSA9IGZ1bmN0aW9uIHVwZGF0ZShvYmplY3RVcGRhdGUsIG9wdGlvbnMpIHtcbiAgICAgIHJldHVybiBzdG9yZUFwaS51cGRhdGUodHlwZSwgaWQsIG9iamVjdFVwZGF0ZSwgb3B0aW9ucyk7XG4gICAgfTtcblxuICAgIC8vXG4gICAgYXBpLnJlbW92ZSA9IGZ1bmN0aW9uIHJlbW92ZShvcHRpb25zKSB7XG4gICAgICByZXR1cm4gc3RvcmVBcGkucmVtb3ZlKHR5cGUsIGlkLCBvcHRpb25zKTtcbiAgICB9O1xuICB9XG5cbiAgLy9cbiAgYXBpLmRlY29yYXRlUHJvbWlzZXMgPSBzdG9yZUFwaS5kZWNvcmF0ZVByb21pc2VzO1xuICBhcGkudmFsaWRhdGUgPSBzdG9yZUFwaS52YWxpZGF0ZTtcblxuICByZXR1cm4gYXBpO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGhvb2RpZVNjb3BlZFN0b3JlQXBpO1xuIiwiLy8gU3RvcmVcbi8vID09PT09PT09PT09PVxuXG4vLyBUaGlzIGNsYXNzIGRlZmluZXMgdGhlIEFQSSB0aGF0IGhvb2RpZS5zdG9yZSAobG9jYWwgc3RvcmUpIGFuZCBob29kaWUub3BlblxuLy8gKHJlbW90ZSBzdG9yZSkgaW1wbGVtZW50IHRvIGFzc3VyZSBhIGNvaGVyZW50IEFQSS4gSXQgYWxzbyBpbXBsZW1lbnRzIHNvbWVcbi8vIGJhc2ljIHZhbGlkYXRpb25zLlxuLy9cbi8vIFRoZSByZXR1cm5lZCBBUEkgcHJvdmlkZXMgdGhlIGZvbGxvd2luZyBtZXRob2RzOlxuLy9cbi8vICogdmFsaWRhdGVcbi8vICogc2F2ZVxuLy8gKiBhZGRcbi8vICogZmluZFxuLy8gKiBmaW5kT3JBZGRcbi8vICogZmluZEFsbFxuLy8gKiB1cGRhdGVcbi8vICogdXBkYXRlQWxsXG4vLyAqIHJlbW92ZVxuLy8gKiByZW1vdmVBbGxcbi8vICogZGVjb3JhdGVQcm9taXNlc1xuLy8gKiB0cmlnZ2VyXG4vLyAqIG9uXG4vLyAqIHVuYmluZFxuLy9cbi8vIEF0IHRoZSBzYW1lIHRpbWUsIHRoZSByZXR1cm5lZCBBUEkgY2FuIGJlIGNhbGxlZCBhcyBmdW5jdGlvbiByZXR1cm5pbmcgYVxuLy8gc3RvcmUgc2NvcGVkIGJ5IHRoZSBwYXNzZWQgdHlwZSwgZm9yIGV4YW1wbGVcbi8vXG4vLyAgICAgdmFyIHRhc2tTdG9yZSA9IGhvb2RpZS5zdG9yZSgndGFzaycpO1xuLy8gICAgIHRhc2tTdG9yZS5maW5kQWxsKCkudGhlbiggc2hvd0FsbFRhc2tzICk7XG4vLyAgICAgdGFza1N0b3JlLnVwZGF0ZSgnaWQxMjMnLCB7ZG9uZTogdHJ1ZX0pO1xuLy9cblxuLy9cbnZhciBob29kaWVTY29wZWRTdG9yZUFwaSA9IHJlcXVpcmUoJy4vc2NvcGVkX3N0b3JlJyk7XG52YXIgaG9vZGllRXZlbnRzID0gcmVxdWlyZSgnLi9ldmVudHMnKTtcbnZhciBIb29kaWVFcnJvciA9IHJlcXVpcmUoJy4vZXJyb3InKTtcbnZhciBIb29kaWVPYmplY3RUeXBlRXJyb3IgPSByZXF1aXJlKCcuL2Vycm9yL29iamVjdF90eXBlJyk7XG52YXIgSG9vZGllT2JqZWN0SWRFcnJvciA9IHJlcXVpcmUoJy4vZXJyb3Ivb2JqZWN0X2lkJyk7XG5cbi8vXG5mdW5jdGlvbiBob29kaWVTdG9yZUFwaShob29kaWUsIG9wdGlvbnMpIHtcblxuICAvLyBwZXJzaXN0YW5jZSBsb2dpY1xuICB2YXIgYmFja2VuZCA9IHt9O1xuXG4gIC8vIGV4dGVuZCB0aGlzIHByb3BlcnR5IHdpdGggZXh0cmEgZnVuY3Rpb25zIHRoYXQgd2lsbCBiZSBhdmFpbGFibGVcbiAgLy8gb24gYWxsIHByb21pc2VzIHJldHVybmVkIGJ5IGhvb2RpZS5zdG9yZSBBUEkuIEl0IGhhcyBhIHJlZmVyZW5jZVxuICAvLyB0byBjdXJyZW50IGhvb2RpZSBpbnN0YW5jZSBieSBkZWZhdWx0XG4gIHZhciBwcm9taXNlQXBpID0ge1xuICAgIGhvb2RpZTogaG9vZGllXG4gIH07XG5cbiAgLy8gbmFtZVxuICB2YXIgc3RvcmVOYW1lID0gb3B0aW9ucy5uYW1lIHx8ICdzdG9yZSc7XG5cbiAgLy8gcHVibGljIEFQSVxuICB2YXIgYXBpID0gZnVuY3Rpb24gYXBpKHR5cGUsIGlkKSB7XG4gICAgdmFyIHNjb3BlZE9wdGlvbnMgPSAkLmV4dGVuZCh0cnVlLCB7dHlwZTogdHlwZSwgaWQ6IGlkfSwgb3B0aW9ucyk7XG4gICAgcmV0dXJuIGhvb2RpZVNjb3BlZFN0b3JlQXBpKGhvb2RpZSwgYXBpLCBzY29wZWRPcHRpb25zKTtcbiAgfTtcblxuICAvLyBhZGQgZXZlbnQgQVBJXG4gIGhvb2RpZUV2ZW50cyhob29kaWUsIHsgY29udGV4dDogYXBpLCBuYW1lc3BhY2U6IHN0b3JlTmFtZSB9KTtcblxuXG4gIC8vIFZhbGlkYXRlXG4gIC8vIC0tLS0tLS0tLS0tLS0tXG5cbiAgLy8gYnkgZGVmYXVsdCwgd2Ugb25seSBjaGVjayBmb3IgYSB2YWxpZCB0eXBlICYgaWQuXG4gIC8vIHRoZSB2YWxpZGF0ZSBtZXRob2QgY2FuIGJlIG92ZXJ3cml0ZW4gYnkgcGFzc2luZ1xuICAvLyBvcHRpb25zLnZhbGlkYXRlXG4gIC8vXG4gIC8vIGlmIGB2YWxpZGF0ZWAgcmV0dXJucyBub3RoaW5nLCB0aGUgcGFzc2VkIG9iamVjdCBpc1xuICAvLyB2YWxpZC4gT3RoZXJ3aXNlIGl0IHJldHVybnMgYW4gZXJyb3JcbiAgLy9cbiAgYXBpLnZhbGlkYXRlID0gb3B0aW9ucy52YWxpZGF0ZTtcblxuICBpZiAoIW9wdGlvbnMudmFsaWRhdGUpIHtcbiAgICBhcGkudmFsaWRhdGUgPSBmdW5jdGlvbihvYmplY3QgLyosIG9wdGlvbnMgKi8pIHtcblxuICAgICAgaWYgKCFvYmplY3QpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBIb29kaWVFcnJvcih7XG4gICAgICAgICAgbmFtZTogJ0ludmFsaWRPYmplY3RFcnJvcicsXG4gICAgICAgICAgbWVzc2FnZTogJ05vIG9iamVjdCBwYXNzZWQuJ1xuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICAgIGlmIChIb29kaWVPYmplY3RUeXBlRXJyb3IuaXNJbnZhbGlkKG9iamVjdC50eXBlLCB2YWxpZElkT3JUeXBlUGF0dGVybikpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBIb29kaWVPYmplY3RUeXBlRXJyb3Ioe1xuICAgICAgICAgIHR5cGU6IG9iamVjdC50eXBlLFxuICAgICAgICAgIHJ1bGVzOiB2YWxpZElkT3JUeXBlUnVsZXNcbiAgICAgICAgfSk7XG4gICAgICB9XG5cbiAgICAgIGlmICghb2JqZWN0LmlkKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgaWYgKEhvb2RpZU9iamVjdElkRXJyb3IuaXNJbnZhbGlkKG9iamVjdC5pZCwgdmFsaWRJZE9yVHlwZVBhdHRlcm4pKSB7XG4gICAgICAgIHJldHVybiBuZXcgSG9vZGllT2JqZWN0SWRFcnJvcih7XG4gICAgICAgICAgaWQ6IG9iamVjdC5pZCxcbiAgICAgICAgICBydWxlczogdmFsaWRJZE9yVHlwZVJ1bGVzXG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH07XG4gIH1cblxuICAvLyBTYXZlXG4gIC8vIC0tLS0tLS0tLS0tLS0tXG5cbiAgLy8gY3JlYXRlcyBvciByZXBsYWNlcyBhbiBhbiBldmVudHVhbGx5IGV4aXN0aW5nIG9iamVjdCBpbiB0aGUgc3RvcmVcbiAgLy8gd2l0aCBzYW1lIHR5cGUgJiBpZC5cbiAgLy9cbiAgLy8gV2hlbiBpZCBpcyB1bmRlZmluZWQsIGl0IGdldHMgZ2VuZXJhdGVkIGFuZCBhIG5ldyBvYmplY3QgZ2V0cyBzYXZlZFxuICAvL1xuICAvLyBleGFtcGxlIHVzYWdlOlxuICAvL1xuICAvLyAgICAgc3RvcmUuc2F2ZSgnY2FyJywgdW5kZWZpbmVkLCB7Y29sb3I6ICdyZWQnfSlcbiAgLy8gICAgIHN0b3JlLnNhdmUoJ2NhcicsICdhYmM0NTY3Jywge2NvbG9yOiAncmVkJ30pXG4gIC8vXG4gIGFwaS5zYXZlID0gZnVuY3Rpb24gc2F2ZSh0eXBlLCBpZCwgcHJvcGVydGllcywgb3B0aW9ucykge1xuXG4gICAgaWYgKCBvcHRpb25zICkge1xuICAgICAgb3B0aW9ucyA9ICQuZXh0ZW5kKHRydWUsIHt9LCBvcHRpb25zKTtcbiAgICB9IGVsc2Uge1xuICAgICAgb3B0aW9ucyA9IHt9O1xuICAgIH1cblxuICAgIC8vIGRvbid0IG1lc3Mgd2l0aCBwYXNzZWQgb2JqZWN0XG4gICAgdmFyIG9iamVjdCA9ICQuZXh0ZW5kKHRydWUsIHt9LCBwcm9wZXJ0aWVzLCB7dHlwZTogdHlwZSwgaWQ6IGlkfSk7XG5cbiAgICAvLyB2YWxpZGF0aW9uc1xuICAgIHZhciBlcnJvciA9IGFwaS52YWxpZGF0ZShvYmplY3QsIG9wdGlvbnMgfHwge30pO1xuICAgIGlmKGVycm9yKSB7IHJldHVybiBob29kaWUucmVqZWN0V2l0aChlcnJvcik7IH1cblxuICAgIHJldHVybiBkZWNvcmF0ZVByb21pc2UoIGJhY2tlbmQuc2F2ZShvYmplY3QsIG9wdGlvbnMgfHwge30pICk7XG4gIH07XG5cblxuICAvLyBBZGRcbiAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG4gIC8vIGAuYWRkYCBpcyBhbiBhbGlhcyBmb3IgYC5zYXZlYCwgd2l0aCB0aGUgZGlmZmVyZW5jZSB0aGF0IHRoZXJlIGlzIG5vIGlkIGFyZ3VtZW50LlxuICAvLyBJbnRlcm5hbGx5IGl0IHNpbXBseSBjYWxscyBgLnNhdmUodHlwZSwgdW5kZWZpbmVkLCBvYmplY3QpLlxuICAvL1xuICBhcGkuYWRkID0gZnVuY3Rpb24gYWRkKHR5cGUsIHByb3BlcnRpZXMsIG9wdGlvbnMpIHtcblxuICAgIGlmIChwcm9wZXJ0aWVzID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHByb3BlcnRpZXMgPSB7fTtcbiAgICB9XG5cbiAgICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcbiAgICByZXR1cm4gYXBpLnNhdmUodHlwZSwgcHJvcGVydGllcy5pZCwgcHJvcGVydGllcywgb3B0aW9ucyk7XG4gIH07XG5cblxuICAvLyBmaW5kXG4gIC8vIC0tLS0tLVxuXG4gIC8vXG4gIGFwaS5maW5kID0gZnVuY3Rpb24gZmluZCh0eXBlLCBpZCkge1xuXG4gICAgcmV0dXJuIGRlY29yYXRlUHJvbWlzZSggYmFja2VuZC5maW5kKHR5cGUsIGlkKSApO1xuICB9O1xuXG5cbiAgLy8gZmluZCBvciBhZGRcbiAgLy8gLS0tLS0tLS0tLS0tLVxuXG4gIC8vIDEuIFRyeSB0byBmaW5kIGEgc2hhcmUgYnkgZ2l2ZW4gaWRcbiAgLy8gMi4gSWYgc2hhcmUgY291bGQgYmUgZm91bmQsIHJldHVybiBpdFxuICAvLyAzLiBJZiBub3QsIGFkZCBvbmUgYW5kIHJldHVybiBpdC5cbiAgLy9cbiAgYXBpLmZpbmRPckFkZCA9IGZ1bmN0aW9uIGZpbmRPckFkZCh0eXBlLCBpZCwgcHJvcGVydGllcykge1xuXG4gICAgaWYgKHByb3BlcnRpZXMgPT09IG51bGwpIHtcbiAgICAgIHByb3BlcnRpZXMgPSB7fTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBoYW5kbGVOb3RGb3VuZCgpIHtcbiAgICAgIHZhciBuZXdQcm9wZXJ0aWVzO1xuICAgICAgbmV3UHJvcGVydGllcyA9ICQuZXh0ZW5kKHRydWUsIHtcbiAgICAgICAgaWQ6IGlkXG4gICAgICB9LCBwcm9wZXJ0aWVzKTtcbiAgICAgIHJldHVybiBhcGkuYWRkKHR5cGUsIG5ld1Byb3BlcnRpZXMpO1xuICAgIH1cblxuICAgIC8vIHByb21pc2UgZGVjb3JhdGlvbnMgZ2V0IGxvc3Qgd2hlbiBwaXBlZCB0aHJvdWdoIGB0aGVuYCxcbiAgICAvLyB0aGF0J3Mgd2h5IHdlIG5lZWQgdG8gZGVjb3JhdGUgdGhlIGZpbmQncyBwcm9taXNlIGFnYWluLlxuICAgIHZhciBwcm9taXNlID0gYXBpLmZpbmQodHlwZSwgaWQpLnRoZW4obnVsbCwgaGFuZGxlTm90Rm91bmQpO1xuICAgIHJldHVybiBkZWNvcmF0ZVByb21pc2UoIHByb21pc2UgKTtcbiAgfTtcblxuXG4gIC8vIGZpbmRBbGxcbiAgLy8gLS0tLS0tLS0tLS0tXG5cbiAgLy8gcmV0dXJucyBhbGwgb2JqZWN0cyBmcm9tIHN0b3JlLlxuICAvLyBDYW4gYmUgb3B0aW9uYWxseSBmaWx0ZXJlZCBieSBhIHR5cGUgb3IgYSBmdW5jdGlvblxuICAvL1xuICBhcGkuZmluZEFsbCA9IGZ1bmN0aW9uIGZpbmRBbGwodHlwZSwgb3B0aW9ucykge1xuXG4gICAgcmV0dXJuIGRlY29yYXRlUHJvbWlzZSggYmFja2VuZC5maW5kQWxsKHR5cGUsIG9wdGlvbnMpICk7XG4gIH07XG5cblxuICAvLyBVcGRhdGVcbiAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG4gIC8vIEluIGNvbnRyYXN0IHRvIGAuc2F2ZWAsIHRoZSBgLnVwZGF0ZWAgbWV0aG9kIGRvZXMgbm90IHJlcGxhY2UgdGhlIHN0b3JlZCBvYmplY3QsXG4gIC8vIGJ1dCBvbmx5IGNoYW5nZXMgdGhlIHBhc3NlZCBhdHRyaWJ1dGVzIG9mIGFuIGV4c3Rpbmcgb2JqZWN0LCBpZiBpdCBleGlzdHNcbiAgLy9cbiAgLy8gYm90aCBhIGhhc2ggb2Yga2V5L3ZhbHVlcyBvciBhIGZ1bmN0aW9uIHRoYXQgYXBwbGllcyB0aGUgdXBkYXRlIHRvIHRoZSBwYXNzZWRcbiAgLy8gb2JqZWN0IGNhbiBiZSBwYXNzZWQuXG4gIC8vXG4gIC8vIGV4YW1wbGUgdXNhZ2VcbiAgLy9cbiAgLy8gaG9vZGllLnN0b3JlLnVwZGF0ZSgnY2FyJywgJ2FiYzQ1NjcnLCB7c29sZDogdHJ1ZX0pXG4gIC8vIGhvb2RpZS5zdG9yZS51cGRhdGUoJ2NhcicsICdhYmM0NTY3JywgZnVuY3Rpb24ob2JqKSB7IG9iai5zb2xkID0gdHJ1ZSB9KVxuICAvL1xuICBhcGkudXBkYXRlID0gZnVuY3Rpb24gdXBkYXRlKHR5cGUsIGlkLCBvYmplY3RVcGRhdGUsIG9wdGlvbnMpIHtcblxuICAgIGZ1bmN0aW9uIGhhbmRsZUZvdW5kKGN1cnJlbnRPYmplY3QpIHtcbiAgICAgIHZhciBjaGFuZ2VkUHJvcGVydGllcywgbmV3T2JqLCB2YWx1ZTtcblxuICAgICAgLy8gbm9ybWFsaXplIGlucHV0XG4gICAgICBuZXdPYmogPSAkLmV4dGVuZCh0cnVlLCB7fSwgY3VycmVudE9iamVjdCk7XG5cbiAgICAgIGlmICh0eXBlb2Ygb2JqZWN0VXBkYXRlID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIG9iamVjdFVwZGF0ZSA9IG9iamVjdFVwZGF0ZShuZXdPYmopO1xuICAgICAgfVxuXG4gICAgICBpZiAoIW9iamVjdFVwZGF0ZSkge1xuICAgICAgICByZXR1cm4gaG9vZGllLnJlc29sdmVXaXRoKGN1cnJlbnRPYmplY3QpO1xuICAgICAgfVxuXG4gICAgICAvLyBjaGVjayBpZiBzb21ldGhpbmcgY2hhbmdlZFxuICAgICAgY2hhbmdlZFByb3BlcnRpZXMgPSAoZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciBfcmVzdWx0cyA9IFtdO1xuXG4gICAgICAgIGZvciAodmFyIGtleSBpbiBvYmplY3RVcGRhdGUpIHtcbiAgICAgICAgICBpZiAob2JqZWN0VXBkYXRlLmhhc093blByb3BlcnR5KGtleSkpIHtcbiAgICAgICAgICAgIHZhbHVlID0gb2JqZWN0VXBkYXRlW2tleV07XG4gICAgICAgICAgICBpZiAoKGN1cnJlbnRPYmplY3Rba2V5XSAhPT0gdmFsdWUpID09PSBmYWxzZSkge1xuICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIHdvcmthcm91bmQgZm9yIHVuZGVmaW5lZCB2YWx1ZXMsIGFzICQuZXh0ZW5kIGlnbm9yZXMgdGhlc2VcbiAgICAgICAgICAgIG5ld09ialtrZXldID0gdmFsdWU7XG4gICAgICAgICAgICBfcmVzdWx0cy5wdXNoKGtleSk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBfcmVzdWx0cztcbiAgICAgIH0pKCk7XG5cbiAgICAgIGlmICghKGNoYW5nZWRQcm9wZXJ0aWVzLmxlbmd0aCB8fCBvcHRpb25zKSkge1xuICAgICAgICByZXR1cm4gaG9vZGllLnJlc29sdmVXaXRoKG5ld09iaik7XG4gICAgICB9XG5cbiAgICAgIC8vYXBwbHkgdXBkYXRlXG4gICAgICByZXR1cm4gYXBpLnNhdmUodHlwZSwgaWQsIG5ld09iaiwgb3B0aW9ucyk7XG4gICAgfVxuXG4gICAgLy8gcHJvbWlzZSBkZWNvcmF0aW9ucyBnZXQgbG9zdCB3aGVuIHBpcGVkIHRocm91Z2ggYHRoZW5gLFxuICAgIC8vIHRoYXQncyB3aHkgd2UgbmVlZCB0byBkZWNvcmF0ZSB0aGUgZmluZCdzIHByb21pc2UgYWdhaW4uXG4gICAgdmFyIHByb21pc2UgPSBhcGkuZmluZCh0eXBlLCBpZCkudGhlbihoYW5kbGVGb3VuZCk7XG4gICAgcmV0dXJuIGRlY29yYXRlUHJvbWlzZSggcHJvbWlzZSApO1xuICB9O1xuXG5cbiAgLy8gdXBkYXRlT3JBZGRcbiAgLy8gLS0tLS0tLS0tLS0tLVxuXG4gIC8vIHNhbWUgYXMgYC51cGRhdGUoKWAsIGJ1dCBpbiBjYXNlIHRoZSBvYmplY3QgY2Fubm90IGJlIGZvdW5kLFxuICAvLyBpdCBnZXRzIGNyZWF0ZWRcbiAgLy9cbiAgYXBpLnVwZGF0ZU9yQWRkID0gZnVuY3Rpb24gdXBkYXRlT3JBZGQodHlwZSwgaWQsIG9iamVjdFVwZGF0ZSwgb3B0aW9ucykge1xuICAgIGZ1bmN0aW9uIGhhbmRsZU5vdEZvdW5kKCkge1xuICAgICAgdmFyIHByb3BlcnRpZXMgPSAkLmV4dGVuZCh0cnVlLCB7fSwgb2JqZWN0VXBkYXRlLCB7aWQ6IGlkfSk7XG4gICAgICByZXR1cm4gYXBpLmFkZCh0eXBlLCBwcm9wZXJ0aWVzLCBvcHRpb25zKTtcbiAgICB9XG5cbiAgICB2YXIgcHJvbWlzZSA9IGFwaS51cGRhdGUodHlwZSwgaWQsIG9iamVjdFVwZGF0ZSwgb3B0aW9ucykudGhlbihudWxsLCBoYW5kbGVOb3RGb3VuZCk7XG4gICAgcmV0dXJuIGRlY29yYXRlUHJvbWlzZSggcHJvbWlzZSApO1xuICB9O1xuXG5cbiAgLy8gdXBkYXRlQWxsXG4gIC8vIC0tLS0tLS0tLS0tLS0tLS0tXG5cbiAgLy8gdXBkYXRlIGFsbCBvYmplY3RzIGluIHRoZSBzdG9yZSwgY2FuIGJlIG9wdGlvbmFsbHkgZmlsdGVyZWQgYnkgYSBmdW5jdGlvblxuICAvLyBBcyBhbiBhbHRlcm5hdGl2ZSwgYW4gYXJyYXkgb2Ygb2JqZWN0cyBjYW4gYmUgcGFzc2VkXG4gIC8vXG4gIC8vIGV4YW1wbGUgdXNhZ2VcbiAgLy9cbiAgLy8gaG9vZGllLnN0b3JlLnVwZGF0ZUFsbCgpXG4gIC8vXG4gIGFwaS51cGRhdGVBbGwgPSBmdW5jdGlvbiB1cGRhdGVBbGwoZmlsdGVyT3JPYmplY3RzLCBvYmplY3RVcGRhdGUsIG9wdGlvbnMpIHtcbiAgICB2YXIgcHJvbWlzZTtcblxuICAgIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuXG4gICAgLy8gbm9ybWFsaXplIHRoZSBpbnB1dDogbWFrZSBzdXJlIHdlIGhhdmUgYWxsIG9iamVjdHNcbiAgICBzd2l0Y2ggKHRydWUpIHtcbiAgICBjYXNlIHR5cGVvZiBmaWx0ZXJPck9iamVjdHMgPT09ICdzdHJpbmcnOlxuICAgICAgcHJvbWlzZSA9IGFwaS5maW5kQWxsKGZpbHRlck9yT2JqZWN0cyk7XG4gICAgICBicmVhaztcbiAgICBjYXNlIGhvb2RpZS5pc1Byb21pc2UoZmlsdGVyT3JPYmplY3RzKTpcbiAgICAgIHByb21pc2UgPSBmaWx0ZXJPck9iamVjdHM7XG4gICAgICBicmVhaztcbiAgICBjYXNlICQuaXNBcnJheShmaWx0ZXJPck9iamVjdHMpOlxuICAgICAgcHJvbWlzZSA9IGhvb2RpZS5kZWZlcigpLnJlc29sdmUoZmlsdGVyT3JPYmplY3RzKS5wcm9taXNlKCk7XG4gICAgICBicmVhaztcbiAgICBkZWZhdWx0OiAvLyBlLmcuIG51bGwsIHVwZGF0ZSBhbGxcbiAgICAgIHByb21pc2UgPSBhcGkuZmluZEFsbCgpO1xuICAgIH1cblxuICAgIHByb21pc2UgPSBwcm9taXNlLnRoZW4oZnVuY3Rpb24ob2JqZWN0cykge1xuICAgICAgLy8gbm93IHdlIHVwZGF0ZSBhbGwgb2JqZWN0cyBvbmUgYnkgb25lIGFuZCByZXR1cm4gYSBwcm9taXNlXG4gICAgICAvLyB0aGF0IHdpbGwgYmUgcmVzb2x2ZWQgb25jZSBhbGwgdXBkYXRlcyBoYXZlIGJlZW4gZmluaXNoZWRcbiAgICAgIHZhciBvYmplY3QsIF91cGRhdGVQcm9taXNlcztcblxuICAgICAgaWYgKCEkLmlzQXJyYXkob2JqZWN0cykpIHtcbiAgICAgICAgb2JqZWN0cyA9IFtvYmplY3RzXTtcbiAgICAgIH1cblxuICAgICAgX3VwZGF0ZVByb21pc2VzID0gKGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgX2ksIF9sZW4sIF9yZXN1bHRzO1xuICAgICAgICBfcmVzdWx0cyA9IFtdO1xuICAgICAgICBmb3IgKF9pID0gMCwgX2xlbiA9IG9iamVjdHMubGVuZ3RoOyBfaSA8IF9sZW47IF9pKyspIHtcbiAgICAgICAgICBvYmplY3QgPSBvYmplY3RzW19pXTtcbiAgICAgICAgICBfcmVzdWx0cy5wdXNoKGFwaS51cGRhdGUob2JqZWN0LnR5cGUsIG9iamVjdC5pZCwgb2JqZWN0VXBkYXRlLCBvcHRpb25zKSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIF9yZXN1bHRzO1xuICAgICAgfSkoKTtcblxuICAgICAgcmV0dXJuICQud2hlbi5hcHBseShudWxsLCBfdXBkYXRlUHJvbWlzZXMpO1xuICAgIH0pO1xuXG4gICAgcmV0dXJuIGRlY29yYXRlUHJvbWlzZSggcHJvbWlzZSApO1xuICB9O1xuXG5cbiAgLy8gUmVtb3ZlXG4gIC8vIC0tLS0tLS0tLS0tLVxuXG4gIC8vIFJlbW92ZXMgb25lIG9iamVjdCBzcGVjaWZpZWQgYnkgYHR5cGVgIGFuZCBgaWRgLlxuICAvL1xuICAvLyB3aGVuIG9iamVjdCBoYXMgYmVlbiBzeW5jZWQgYmVmb3JlLCBtYXJrIGl0IGFzIGRlbGV0ZWQuXG4gIC8vIE90aGVyd2lzZSByZW1vdmUgaXQgZnJvbSBTdG9yZS5cbiAgLy9cbiAgYXBpLnJlbW92ZSA9IGZ1bmN0aW9uIHJlbW92ZSh0eXBlLCBpZCwgb3B0aW9ucykge1xuICAgIHJldHVybiBkZWNvcmF0ZVByb21pc2UoIGJhY2tlbmQucmVtb3ZlKHR5cGUsIGlkLCBvcHRpb25zIHx8IHt9KSApO1xuICB9O1xuXG5cbiAgLy8gcmVtb3ZlQWxsXG4gIC8vIC0tLS0tLS0tLS0tXG5cbiAgLy8gRGVzdHJveWUgYWxsIG9iamVjdHMuIENhbiBiZSBmaWx0ZXJlZCBieSBhIHR5cGVcbiAgLy9cbiAgYXBpLnJlbW92ZUFsbCA9IGZ1bmN0aW9uIHJlbW92ZUFsbCh0eXBlLCBvcHRpb25zKSB7XG4gICAgcmV0dXJuIGRlY29yYXRlUHJvbWlzZSggYmFja2VuZC5yZW1vdmVBbGwodHlwZSwgb3B0aW9ucyB8fCB7fSkgKTtcbiAgfTtcblxuXG4gIC8vIGRlY29yYXRlIHByb21pc2VzXG4gIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS1cblxuICAvLyBleHRlbmQgcHJvbWlzZXMgcmV0dXJuZWQgYnkgc3RvcmUuYXBpXG4gIGFwaS5kZWNvcmF0ZVByb21pc2VzID0gZnVuY3Rpb24gZGVjb3JhdGVQcm9taXNlcyhtZXRob2RzKSB7XG4gICAgcmV0dXJuICQuZXh0ZW5kKHByb21pc2VBcGksIG1ldGhvZHMpO1xuICB9O1xuXG5cblxuICAvLyByZXF1aXJlZCBiYWNrZW5kIG1ldGhvZHNcbiAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICBpZiAoIW9wdGlvbnMuYmFja2VuZCApIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ29wdGlvbnMuYmFja2VuZCBtdXN0IGJlIHBhc3NlZCcpO1xuICB9XG5cbiAgdmFyIHJlcXVpcmVkID0gJ3NhdmUgZmluZCBmaW5kQWxsIHJlbW92ZSByZW1vdmVBbGwnLnNwbGl0KCcgJyk7XG5cbiAgcmVxdWlyZWQuZm9yRWFjaCggZnVuY3Rpb24obWV0aG9kTmFtZSkge1xuXG4gICAgaWYgKCFvcHRpb25zLmJhY2tlbmRbbWV0aG9kTmFtZV0pIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignb3B0aW9ucy5iYWNrZW5kLicrbWV0aG9kTmFtZSsnIG11c3QgYmUgcGFzc2VkLicpO1xuICAgIH1cblxuICAgIGJhY2tlbmRbbWV0aG9kTmFtZV0gPSBvcHRpb25zLmJhY2tlbmRbbWV0aG9kTmFtZV07XG4gIH0pO1xuXG5cbiAgLy8gUHJpdmF0ZVxuICAvLyAtLS0tLS0tLS1cblxuICAvLyAvIG5vdCBhbGxvd2VkIGZvciBpZFxuICB2YXIgdmFsaWRJZE9yVHlwZVBhdHRlcm4gPSAvXlteXFwvXSskLztcbiAgdmFyIHZhbGlkSWRPclR5cGVSdWxlcyA9ICcvIG5vdCBhbGxvd2VkJztcblxuICAvL1xuICBmdW5jdGlvbiBkZWNvcmF0ZVByb21pc2UocHJvbWlzZSkge1xuICAgIHJldHVybiAkLmV4dGVuZChwcm9taXNlLCBwcm9taXNlQXBpKTtcbiAgfVxuXG4gIHJldHVybiBhcGk7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gaG9vZGllU3RvcmVBcGk7XG4iLCIvLyBIb29kaWUgQWRtaW5cbi8vIC0tLS0tLS0tLS0tLS1cbi8vXG4vLyB5b3VyIGZyaWVuZGx5IGxpYnJhcnkgZm9yIHBvY2tldCxcbi8vIHRoZSBIb29kaWUgQWRtaW4gVUlcbi8vXG52YXIgaG9vZGllRXZlbnRzID0gcmVxdWlyZSgnLi4vbm9kZV9tb2R1bGVzL2hvb2RpZS9zcmMvaG9vZGllL2V2ZW50cycpO1xudmFyIGhvb2RpZVByb21pc2VzID0gcmVxdWlyZSgnLi4vbm9kZV9tb2R1bGVzL2hvb2RpZS9zcmMvaG9vZGllL3Byb21pc2VzJyk7XG52YXIgaG9vZGllUmVxdWVzdCA9IHJlcXVpcmUoJy4uL25vZGVfbW9kdWxlcy9ob29kaWUvc3JjL2hvb2RpZS9yZXF1ZXN0Jyk7XG52YXIgaG9vZGllT3BlbiA9IHJlcXVpcmUoJy4uL25vZGVfbW9kdWxlcy9ob29kaWUvc3JjL2hvb2RpZS9vcGVuJyk7XG5cbnZhciBob29kaWVBZG1pbkFjY291bnQgPSByZXF1aXJlKCcuL2hvb2RpZS5hZG1pbi9hY2NvdW50Jyk7XG52YXIgaG9vZGllQWRtaW5QbHVnaW5zID0gcmVxdWlyZSgnLi9ob29kaWUuYWRtaW4vcGx1Z2lucycpO1xuXG4vLyBDb25zdHJ1Y3RvclxuLy8gLS0tLS0tLS0tLS0tLVxuXG4vLyBXaGVuIGluaXRpYWxpemluZyBhIGhvb2RpZSBpbnN0YW5jZSwgYW4gb3B0aW9uYWwgVVJMXG4vLyBjYW4gYmUgcGFzc2VkLiBUaGF0J3MgdGhlIFVSTCBvZiB0aGUgaG9vZGllIGJhY2tlbmQuXG4vLyBJZiBubyBVUkwgcGFzc2VkIGl0IGRlZmF1bHRzIHRvIHRoZSBjdXJyZW50IGRvbWFpbi5cbi8vXG4vLyAgICAgLy8gaW5pdCBhIG5ldyBob29kaWUgaW5zdGFuY2Vcbi8vICAgICBob29kaWUgPSBuZXcgSG9vZGllXG4vL1xuZnVuY3Rpb24gSG9vZGllQWRtaW4oYmFzZVVybCkge1xuICB2YXIgaG9vZGllQWRtaW4gPSB0aGlzO1xuXG4gIC8vIGVuZm9yY2UgaW5pdGlhbGl6YXRpb24gd2l0aCBgbmV3YFxuICBpZiAoIShob29kaWVBZG1pbiBpbnN0YW5jZW9mIEhvb2RpZUFkbWluKSkge1xuICAgIHRocm93IG5ldyBFcnJvcigndXNhZ2U6IG5ldyBIb29kaWVBZG1pbih1cmwpOycpO1xuICB9XG5cbiAgaWYgKGJhc2VVcmwpIHtcbiAgICAvLyByZW1vdmUgdHJhaWxpbmcgc2xhc2hlc1xuICAgIGhvb2RpZUFkbWluLmJhc2VVcmwgPSBiYXNlVXJsLnJlcGxhY2UoL1xcLyskLywgJycpO1xuICB9XG5cblxuICAvLyBob29kaWVBZG1pbi5leHRlbmRcbiAgLy8gLS0tLS0tLS0tLS0tLS0tXG5cbiAgLy8gZXh0ZW5kIGhvb2RpZUFkbWluIGluc3RhbmNlOlxuICAvL1xuICAvLyAgICAgaG9vZGllQWRtaW4uZXh0ZW5kKGZ1bmN0aW9uKGhvb2RpZUFkbWluKSB7fSApXG4gIC8vXG4gIGhvb2RpZUFkbWluLmV4dGVuZCA9IGZ1bmN0aW9uIGV4dGVuZChleHRlbnNpb24pIHtcbiAgICBleHRlbnNpb24oaG9vZGllQWRtaW4pO1xuICB9O1xuXG4gIC8vXG4gIC8vIEV4dGVuZGluZyBob29kaWUgYWRtaW4gY29yZVxuICAvL1xuXG4gIC8vICogaG9vZGllQWRtaW4uYmluZFxuICAvLyAqIGhvb2RpZUFkbWluLm9uXG4gIC8vICogaG9vZGllQWRtaW4ub25lXG4gIC8vICogaG9vZGllQWRtaW4udHJpZ2dlclxuICAvLyAqIGhvb2RpZUFkbWluLnVuYmluZFxuICAvLyAqIGhvb2RpZUFkbWluLm9mZlxuICBob29kaWVBZG1pbi5leHRlbmQoaG9vZGllRXZlbnRzKTtcblxuXG4gIC8vICogaG9vZGllQWRtaW4uZGVmZXJcbiAgLy8gKiBob29kaWVBZG1pbi5pc1Byb21pc2VcbiAgLy8gKiBob29kaWVBZG1pbi5yZXNvbHZlXG4gIC8vICogaG9vZGllQWRtaW4ucmVqZWN0XG4gIC8vICogaG9vZGllQWRtaW4ucmVzb2x2ZVdpdGhcbiAgLy8gKiBob29kaWVBZG1pbi5yZWplY3RXaXRoXG4gIGhvb2RpZUFkbWluLmV4dGVuZChob29kaWVQcm9taXNlcyApO1xuXG4gIC8vICogaG9vZGllQWRtaW4ucmVxdWVzdFxuICBob29kaWVBZG1pbi5leHRlbmQoaG9vZGllUmVxdWVzdCk7XG5cbiAgLy8gKiBob29kaWVBZG1pbi5vcGVuXG4gIGhvb2RpZUFkbWluLmV4dGVuZChob29kaWVPcGVuKTtcblxuICAvLyAqIGhvb2RpZUFkbWluLmFjY291bnRcbiAgaG9vZGllQWRtaW4uZXh0ZW5kKGhvb2RpZUFkbWluQWNjb3VudCk7XG5cbiAgLy8gKiBob29kaWVBZG1pbi5wbHVnaW5zXG4gIGhvb2RpZUFkbWluLmV4dGVuZChob29kaWVBZG1pblBsdWdpbnMpO1xuXG4gIC8vXG4gIC8vIGxvYWRpbmcgdXNlciBleHRlbnNpb25zXG4gIC8vXG4gIGFwcGx5RXh0ZW5zaW9ucyhIb29kaWVBZG1pbik7XG59XG5cbi8vIEV4dGVuZGluZyBIb29kaWVBZG1pblxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG4vLyBZb3UgY2FuIGV4dGVuZCB0aGUgSG9vZGllIGNsYXNzIGxpa2Ugc286XG4vL1xuLy8gSG9vZGllLmV4dGVuZChmdW5jaW9uKEhvb2RpZUFkbWluKSB7IEhvb2RpZUFkbWluLm15TWFnaWMgPSBmdW5jdGlvbigpIHt9IH0pXG4vL1xuXG52YXIgZXh0ZW5zaW9ucyA9IFtdO1xuXG5Ib29kaWVBZG1pbi5leHRlbmQgPSBmdW5jdGlvbihleHRlbnNpb24pIHtcbiAgZXh0ZW5zaW9ucy5wdXNoKGV4dGVuc2lvbik7XG59O1xuXG4vL1xuLy8gZGV0ZWN0IGF2YWlsYWJsZSBleHRlbnNpb25zIGFuZCBhdHRhY2ggdG8gSG9vZGllIE9iamVjdC5cbi8vXG5mdW5jdGlvbiBhcHBseUV4dGVuc2lvbnMoaG9vZGllKSB7XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgZXh0ZW5zaW9ucy5sZW5ndGg7IGkrKykge1xuICAgIGV4dGVuc2lvbnNbaV0oaG9vZGllKTtcbiAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IEhvb2RpZUFkbWluO1xuIiwiLy8gSG9vZGllQWRtaW4gQWNjb3VudFxuLy8gPT09PT09PT09PT09PT09PT09PVxuXG52YXIgaG9vZGllRXZlbnRzID0gcmVxdWlyZSgnLi4vLi4vbm9kZV9tb2R1bGVzL2hvb2RpZS9zcmMvaG9vZGllL2V2ZW50cycpO1xuXG5mdW5jdGlvbiBob29kaWVBY2NvdW50IChob29kaWVBZG1pbikge1xuXG4gIC8vIHB1YmxpYyBBUElcbiAgdmFyIGFjY291bnQgPSB7fTtcblxuICAvLyBhZGQgZXZlbnRzIEFQSVxuICBob29kaWVFdmVudHMoaG9vZGllQWRtaW4sIHsgY29udGV4dDogYWNjb3VudCwgbmFtZXNwYWNlOiAnYWNjb3VudCd9KTtcblxuICBcbiAgLy8gc2lnbiBpbiB3aXRoIHBhc3N3b3JkXG4gIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuICAvLyB1c2VybmFtZSBpcyBoYXJkY29kZWQgdG8gXCJhZG1pblwiXG4gIGFjY291bnQuc2lnbkluID0gZnVuY3Rpb24gc2lnbkluKC8qcGFzc3dvcmQqLykge1xuICAgIHJldHVybiBob29kaWVBZG1pbi5yZWplY3RXaXRoKCdub3QgeWV0IGltcGxlbWVudGVkJyk7XG4gIH07XG5cblxuICAvLyBzaWduIG91dFxuICAvLyAtLS0tLS0tLS1cblxuICAvL1xuICBhY2NvdW50LnNpZ25PdXQgPSBmdW5jdGlvbiBzaWduT3V0KCkge1xuICAgIHJldHVybiBob29kaWVBZG1pbi5yZWplY3RXaXRoKCdub3QgeWV0IGltcGxlbWVudGVkJyk7XG4gIH07XG5cbiAgaG9vZGllQWRtaW4uYWNjb3VudCA9IGFjY291bnQ7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gaG9vZGllQWNjb3VudDtcbiIsImZ1bmN0aW9uIGhvb2RpZUFkbWluUGx1Z2lucyggaG9vZGllQWRtaW4gKSB7XG4gIGhvb2RpZUFkbWluLnBsdWdpbnMgPSBob29kaWVBZG1pbi5vcGVuKCdwbHVnaW5zJyk7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gaG9vZGllQWRtaW5QbHVnaW5zO1xuIl19
(11)
});
;