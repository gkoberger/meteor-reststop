(function() {
  /* Set up RESTstop! */
  // TODO: A way to set the options
  var RESTstop = function(options) {
    var self = this;

    self.version = '0.1';
    self.options = {
      apiPath: 'api',
    };
    _.extend(self.options, options || {});

    self.routes = [];
    self.connect = (typeof(Npm) == "undefined") ? __meteor_bootstrap__.require("connect") : Npm.require("connect");
  };

  /* Authentication stuff */
  var userQueryValidator = Match.Where(function (user) {
    check(user, {
      id: Match.Optional(String),
      username: Match.Optional(String),
      email: Match.Optional(String)
    });
    if (_.keys(user).length !== 1)
      throw new Match.Error("User property must have exactly one field");
    return true;
  });

  var selectorFromUserQuery = function (user) {
    if (user.id)
      return {_id: user.id};
    else if (user.username)
      return {username: user.username};
    else if (user.email)
      return {"emails.address": user.email};
    throw new Error("shouldn't happen (validation missed something)");
  };

  var loginWithPassword = function (options) {
    if (!options.password || !options.user)
      return undefined; // don't handle

    check(options, {user: userQueryValidator, password: String});

    var selector = selectorFromUserQuery(options.user);
    var user = Meteor.users.findOne(selector);
    if (!user)
      throw new Meteor.Error(403, "User not found");

    if (!user.services || !user.services.password ||
    !user.services.password.srp)
    throw new Meteor.Error(403, "User has no password set");

    // Just check the verifier output when the same identity and salt
    // are passed. Don't bother with a full exchange.
    var verifier = user.services.password.srp;
    var newVerifier = Meteor._srp.generateVerifier(options.password, {
      identity: verifier.identity, salt: verifier.salt});

      if (verifier.verifier !== newVerifier.verifier)
        throw new Meteor.Error(403, "Incorrect password");

      var stampedLoginToken = Accounts._generateStampedLoginToken();
      Meteor.users.update(
      user._id, {$push: {'services.resume.loginTokens': stampedLoginToken}});

      return {token: stampedLoginToken.token, id: user._id};
  };

  /* Add a route */

  RESTstop.prototype.route = function(route, options, fn) {
    var self = this;

    var route_final = '/' + this.options.apiPath + '/' + route;

    if(!self.routes.length) { // Only run the first time
      __meteor_bootstrap__.app.stack.splice(0, 0, {route: '', handle: self.connect.query()});
      __meteor_bootstrap__.app.stack.splice(1, 0, {route: '', handle: self.connect.bodyParser()});
    }

    // TODO: Only run this once; match routes using self.routes
    __meteor_bootstrap__.app.stack.splice(2, 0, {
      route: route_final,
      handle: function (req,res, next) {
        var context = {
          request: req, 
          response: res, 
          params: req.body,
          user: false
        };

        if(typeof(Fiber)=="undefined") Fiber = Npm.require('fibers');
        Fiber(function() {

          if(context.params.userId && context.params.loginToken) { // TODO: rename these (and probably get from headers?)
            context.user = Meteor.users.findOne({
              _id:context.params.userId, 
              "services.resume.loginTokens.token":context.params.loginToken
            });
          }

          var output = fn.apply(context);

          if(output === false) {
            next();
          } else {
            res.writeHead(200, {'Content-Type': 'text/json'});
            res.end(JSON.stringify(output));
          }
          return;
        }).run();
      }.future ()
    });
  };

  // Make it available globally
  Meteor.RESTstop = new RESTstop();

  // Define authentication
  Meteor.RESTstop.route('login', {}, function() {
    // TODO: accept a username OR email
    return loginWithPassword({
      'user': {username: this.params.username},
      'password': this.params.password
    });
  });
}());

