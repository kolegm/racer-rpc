# racer-rpc
Racer/Derby plugin for enabling RPC

How to use
==========
After adding the plugin:
```javascript
racer.use(require('racer-rpc'));
```

Use it below API:

API
========

On server:
```javascript
// With callback
var backend = racer.createBackend(...);
backend.rpc.on('rpc-with-callback', function (arg1, arg2, cb) {
  arg1 === 'arg1' // true
  arg2 === 'arg2' // true
  cb(null, 'arg3', 'arg4');
});

// Without callback
backend.rpc.on('rpc-without-callback', function (arg1, arg2) {
  arg1 === 'arg1' // true
  arg2 === 'arg2' // true
});
```javascript

On client:
```javascript
// With callback
model.call('rpc-with-callback', 'arg1', 'arg2', function (err, arg3, arg4) {
  arg3 === 'arg3' // true
  arg4 === 'arg4' // true
});

// Without callback
model.call('rpc-withour-callback', 'arg1', 'arg2');
```javascript
