(function() {
  RESTstop = function() {
    this._routes = [];
    this._config = {
        use_auth: false,
        api_path: 'api',
    };
    this._started = false;
  };

  // simply match this path to this function
  RESTstop.prototype.add = function(path, options, endpoint)  {
    var self = this;

    if(path[0] != "/") path = "/" + path;

    // Start serving on first add() call
    if(!this._started){
      this._start();
    }

    if (_.isObject(path) && ! _.isRegExp(path)) {
      _.each(path, function(endpoint, p) {
        self.add(p, endpoint);
      });
    } else {
      if (! endpoint) {
        // no options were supplied so 2nd parameter is the endpoint
        endpoint = options;
        options = null;
      }
      if (! _.isFunction(endpoint)) {
        endpoint = _.bind(_.identity, null, endpoint);
      }
      self._routes.push([new Meteor.RESTstop.Route(path, options), endpoint]);
    }
  };

  RESTstop.prototype.match = function(request, response) {
    for (var i = 0; i < this._routes.length; i++) {
      var params = [], route = this._routes[i];

      if (route[0].match(request.url, request.method, params)) {
        context = {request: request, response: response, params: params};

        var args = [];
        for (var key in context.params)
          args.push(context.params[key]);

        if(request.method == "POST") {
            context.parms = _.extend(context.params, request.body);
        }
        if(request.method == "GET") {
            context.parms = _.extend(context.params, request.query);
        }

        if(this._config.use_auth) {
          context.user = false;
          
          // Get the user object
          if(context.params.userId && context.params.loginToken) {
            context.user = Meteor.users.findOne({
              _id:context.params.userId, 
              "services.resume.loginTokens.token": context.params.loginToken
            });
          }

          // Return an error if no user and login required
          if(route[0].options.require_login && !context.user) {
            return [403, {error: "You must be logged in to do this."}];
          }
        }


        console.log('andddd');
        console.log(route[1].apply(context, args));

        return route[1].apply(context, args);
      }
    }

    return false;
  };

  RESTstop.prototype.configure = function(config){
    if(this._started){
      throw new Error("RESTstop.configure() has to be called before first call to RESTstop.add()");
    }

    this._config = _.extend(this._config, config);

    if(this._config.api_path[0] != "/") {
        this._config.api_path = "/"  +this._config.api_path;
    }
  };

  RESTstop.prototype._start = function(){
    var self = this;

    if(this._started){
      throw new Error("RESTstop has already been started");
    }

    this._started = true;

    // hook up the serving
    var connect = (typeof(Npm) == "undefined") ? __meteor_bootstrap__.require("connect") : Npm.require("connect");
    __meteor_bootstrap__.app.stack.splice(0, 0, {route: '', handle: connect.query()});
    __meteor_bootstrap__.app.stack.splice(1, 0, {route: '', handle: connect.bodyParser()});
    __meteor_bootstrap__.app.stack.splice(2, 0, {
      route: this._config.api_path,
      handle: function (req,res, next) {
        // need to wrap in a fiber in case they do something async
        // (e.g. in the database)
        if(typeof(Fiber)=="undefined") Fiber = Npm.require('fibers');

        Fiber(function() {
          var output = Meteor.RESTstop.match(req, res);

          if (output === false) {
            res.statusCode = 404;
            return res.end("{'error': 'API method not found'}");
          } else {
            // parse out the various type of response we can have

            // array can be
            // [content], [status, content], [status, headers, content]
            if (_.isArray(output)) {
              // copy the array so we aren't actually modifying it!
              output = output.slice(0);

              if (output.length === 3) {
                var headers = output.splice(1, 1)[0];
                _.each(headers, function(value, key) {
                  res.setHeader(key, value);
                });
              }

              if (output.length === 2) {
                res.statusCode = output.shift();
              }

              output = output[0];
            }

            if (_.isNumber(output)) {
              res.statusCode = output;
              output = '';
            }

            if(_.isObject(output)) {
              output = JSON.stringify(output);
            }

            return res.end(output);
          }
        }).run();
      }
    });

    if(this._config.use_auth) {
        Meteor.RESTstop.initAuth();
    }
  };

  // Make the router available
  Meteor.RESTstop = new RESTstop();
}());

// TODO: 
// √ put things in /api/ automatically
// √ "use_auth" as a setting
// √ if so, auto-load auth.js stuff
// √ pass in this.user
// √ Drop method, make it an object
// √ implement login_required
// √ Allow an object to be returned
// √ Don't return next(); return an error
// √ Allow multiple method types as an array
// √ Write a logout function
// * Login should accept username OR email
// * Better error if login is unsuccessful
// * Actually delete tokens on logout 
// * Also accept userID + loginToken as headers
// * Update README about all the above things (including the user_auth in config)

