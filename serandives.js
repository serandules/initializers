var log = require('logger')('initializer');
var async = require('async');
var mongoose = require('mongoose');

var mongourl = 'mongodb://localhost/serandives';

var plugins = ['roles', 'users', 'clients', 'configs'];

global.hub = function (model) {
    return require('./node_modules/hub/models/' + model)
}

mongoose.connect(mongourl);

var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function callback() {
    log.debug('connected to mongodb : ' + mongourl);
    var tasks = [];
    plugins.forEach(function (plugin) {
        tasks.push(function () {
            var args = Array.prototype.slice.call(arguments);
            var done = args.pop();
            var ctx = args.pop() || {};
            log.info('plugin : %s', plugin);
            require('./lib/serandives/' + plugin)(ctx, done);
        });
    });
    async.waterfall(tasks, function (err) {
        if (err) {
            log.error(err);
            return;
        }
    });
});