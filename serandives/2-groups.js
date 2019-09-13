var log = require('logger')('initializers:serandives:groups');

var utils = require('utils');
var Users = require('model-users');
var Groups = require('model-groups');
var Workflows = require('model-workflows');

var email = utils.root();

module.exports = function (done) {
  Users.findOne({email: email}, function (err, user) {
    if (err) {
      return done(err);
    }
    Workflows.findOne({user: user, name: 'model'}, function (err, workflow) {
      if (err) {
        return done(err);
      }
      Groups.create({
        user: user,
        name: 'admin',
        description: 'serandives.com admin group',
        workflow: workflow,
        status: workflow.start,
        _: {}
      }, function (err, admin) {
        if (err) {
          return done(err);
        }
        Groups.update({_id: admin._id}, {
          permissions: [{
            user: user._id,
            actions: ['read', 'update', 'delete']
          }, {
            group: admin._id,
            actions: ['read', 'update', 'delete']
          }],
          visibility: {
            '*': {
              users: [user._id],
              groups: [admin._id]
            }
          }
        }, function (err) {
          if (err) {
            return done(err);
          }
          Groups.create({
            user: user,
            name: 'public',
            description: 'serandives.com public group',
            workflow: workflow,
            status: workflow.start,
            _: {}
          }, function (err, pub) {
            if (err) {
              return done(err);
            }
            Groups.update({_id: pub._id}, {
              permissions: [{
                user: user._id,
                actions: ['read', 'update', 'delete']
              }, {
                group: admin._id,
                actions: ['read', 'update', 'delete']
              }, {
                group: pub._id,
                actions: ['read']
              }],
              visibility: {
                '*': {
                  users: [user._id],
                  groups: [admin._id]
                }
              }
            }, function (err) {
              if (err) {
                return done(err);
              }
              Users.update({_id: user.id}, {
                groups: [admin.id, pub.id]
              }, function (err) {
                if (err) {
                  return done(err);
                }
                Groups.create({
                  user: user,
                  name: 'anonymous',
                  description: 'serandives.com anonymous group',
                  workflow: workflow,
                  status: workflow.start,
                  _: {}
                }, function (err, anon) {
                  if (err) {
                    return done(err);
                  }
                  Groups.update({_id: anon._id}, {
                    permissions: [{
                      user: user._id,
                      actions: ['read', 'update', 'delete']
                    }, {
                      group: admin._id,
                      actions: ['read', 'update', 'delete']
                    }, {
                      group: anon._id,
                      actions: ['read']
                    }],
                    visibility: {
                      '*': {
                        users: [user._id],
                        groups: [admin._id]
                      }
                    }
                  }, function (err) {
                    if (err) {
                      return done(err);
                    }
                    log.info('groups:created');
                    done();
                  });
                });
              });
            });
          });
        });
      });
    });
  });
};