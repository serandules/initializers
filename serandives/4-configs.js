var log = require('logger')('initializers:serandives:configs');
var _ = require('lodash');
var nconf = require('nconf');
var async = require('async');
var utils = require('utils');
var Configs = require('model-configs');
var Groups = require('model-groups');
var Clients = require('model-clients');
var Workflows = require('model-workflows');

var domain = utils.domain();

var create = function (user, config, added) {
  var name = config.name;
  var value = config.value;
  var permissions = config.permissions;
  var visibility = config.visibility;
  var workflow = config.workflow;
  var status = config.status;
  Configs.findOne({
    name: name
  }).exec(function (err, config) {
    if (err) {
      return added(err);
    }
    if (config) {
      return added();
    }
    Configs.create({
      user: user,
      name: name,
      value: JSON.stringify(value),
      permissions: permissions,
      visibility: visibility,
      workflow: workflow,
      status: status,
      _: {}
    }, function (err, config) {
      if (err) {
        return added(err);
      }
      log.info('configs:created', 'name:%s', name);
      added();
    });
  });
};

module.exports = function (done) {
  var configs = [];
  Clients.findOne({name: domain}).exec(function (err, client) {
    if (err) {
      return done(err);
    }
    if (!client) {
      return done('No client with name %s can be found.', domain);
    }
    Groups.find({user: client.user, name: {$in: ['public', 'admin', 'anonymous']}}, function (err, groups) {
      if (err) {
        return done(err);
      }
      Workflows.findOne({user: client.user, name: 'model'}, function (err, workflow) {
        if (err) {
          return done(err);
        }
        var facebookId = nconf.get('FACEBOOK_ID');
        var googleKey = nconf.get('GOOGLE_KEY');
        var staticsCDN = nconf.get('CDN_STATICS');
        var imagesCDN = nconf.get('CDN_IMAGES');
        var serandivesId = client.id;
        var groupz = {};
        groups.forEach(function (group) {
          groupz[group.name] = group;
        });
        var permissions = [{
          user: client.user,
          actions: ['read', 'update', 'delete']
        }, {
          group: groupz.admin._id,
          actions: ['read', 'update', 'delete']
        }, {
          group: groupz.public._id,
          actions: ['read']
        }, {
          group: groupz.anonymous._id,
          actions: ['read']
        }];
        var visibility = {
          '*': {
            users: [client.user._id],
            groups: [groupz.admin._id]
          },
          name: {
            groups: [groupz.public._id, groupz.anonymous._id]
          },
          value: {
            groups: [groupz.public._id, groupz.anonymous._id]
          }
        };
        // boots
        configs.push({
          user: client.user,
          name: 'boot',
          value: {
            clients: {
              facebook: facebookId,
              serandives: serandivesId
            },
            googleKey: googleKey,
            cdns: {
              statics: staticsCDN,
              images: imagesCDN
            }
          },
          permissions: permissions,
          visibility: visibility,
          workflow: workflow,
          status: workflow.start
        });
        // groups
        configs.push({
          user: client.user,
          name: 'groups',
          value: [{
            id: groupz.anonymous.id,
            name: groupz.anonymous.name,
            description: groupz.anonymous.description
          }, {
            id: groupz.public.id,
            name: groupz.public.name,
            description: groupz.public.description
          }, {
            id: groupz.admin.id,
            name: groupz.admin.name,
            description: groupz.admin.description
          }],
          permissions: permissions,
          visibility: visibility,
          workflow: workflow,
          status: workflow.start
        });
        async.each(configs, function (config, added) {
          create(client.user, config, added);
        }, done);
      });
    });
  });
};