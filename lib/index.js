module.exports = plugin;

function getLast(array) {
  var length = Array.isArray(array) ? array.length : 0;
  return length ? array[length - 1] : undefined;
}

function plugin(racer) {
  var Model = racer.Model;
  var ns = '$rpc';

  Model.prototype.call = function () {
    var args = Array.prototype.slice.call(arguments);
    var name = args.shift();

    if (!name) return new Error('RPCs must have a name!');

    var last = getLast(args);
    var cb = (typeof last === 'function') ? args.pop() : null;

    var data = {
      args: args,
      cb: !!cb
    };

    function callback(err, args) {
      if (err) {
        if (cb) return cb(err);
        else throw new Error(err);
      }

      args.unshift(null); // no error, everything is ok

      cb.apply(this, args);
    }

    var query = this.root.connection.createFetchQuery(name, data, {db: ns}, callback);

    // Overwrite _handleResponse in order to bypass adding docs etc. to model
    query._handleResponse = function (err, data, extra) {
      var callback = this.callback;
      this.callback = null;
      if (err) return this._finishResponse(err, callback);

      // Set args as results
      if (data && data[0] && data[0].data) {
        this.results = data[0].data;
      } else {
        this.results = [];
      }

      this._finishResponse(null, callback);
    };
  };

  backend(racer, ns);
};

function backend(racer, ns) {
  // Wrap createBackend in order to be able to listen to RPC calls
  // But only do it once (e.g. if we have many apps, we need to ensure we only wrap it once since otherwise we'll destroy the wrapping)
  if (racer._createBackend) return;

  racer._createBackend = racer.createBackend;
  racer.createBackend = function () {
    // Create backend using regular createBackend method
    var backend = this._createBackend.apply(this, arguments);
    var rpcDb = new RPC(backend);

    // Add RPC to backend for handling RPC calls
    // Including adding it as a special DB in order to utilize shardb's query mechanism
    backend.extraDbs[ns] = backend.rpc = rpcDb;

    return backend;
  };
}

// Our fake RPC DB for retrieving calls
function RPC(backend) {
  this.backend = backend;
  this.fnMap = {};
}

RPC.prototype.on = function (name, fn) {
  this.fnMap[name] = fn;
};

RPC.prototype.onMessage = RPC.prototype.query = function (name, data, fields, options, callback) {
  //var model = this.backend.createModel({fetchOnly: true});
  var fn = this.fnMap[name];

  if (!fn) return callback('No RPC named ' + name + ' exists!');

  var args = data.args || [];
  if (data.cb) args.push(reply);

  fn.apply({args: arguments, db: this}, args);

  if (!data.cb) return callback(null, [{v: 1, data: []}]);

  function reply(err) {
    if (err) return callback(err);

    var args = Array.prototype.slice.call(arguments);
    args.shift();

    callback(null, [{v: 1, data: args}]);
  }
};
