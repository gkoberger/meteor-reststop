(function() {
  // Route object taken from page.js, slightly stripped down
  //
  // Copyright (c) 2012 TJ Holowaychuk &lt;tj@vision-media.ca&gt;
  //
  /**
   * Initialize `Route` with the given HTTP `path`, and an array of `options`.
   *
   * Options:
   *
   *   - `methods`      the allowed methods. string ("POST") or array (["POST", "GET"]).
   *   - `sensitive`    enable case-sensitive routes
   *   - `strict`       enable strict matching for trailing slashes
   *
   * @param {String} path
   * @param {Object} options.
   * @api private
   */

  Meteor.RESTstop.Route = function(path, options) {
    this.options = options || {};
    this.path = path;
    this.method = this.options.method;

    if(this.method && !_.isArray(this.method)) {
        this.method = [this.method];
    }
    if(this.method) {
        this.method = _.map(this.method, function(s){ return s.toUpperCase(); });
    }

    this.regexp = pathtoRegexp(path
      , this.keys = []
      , this.options.sensitive
      , this.options.strict);
  }

  /**
   * Check if this route matches `path` and optional `method`, if so
   * populate `params`.
   *
   * @param {String} path
   * @param {String} method
   * @param {Array} params
   * @return {Boolean}
   * @api private
   */

  Meteor.RESTstop.Route.prototype.match = function(path, method, params){
    var keys, qsIndex, pathname, m;

    if(this.method && !_.contains(this.method, method)) return false;

    keys = this.keys;
    qsIndex = path.indexOf('?');
    pathname = ~qsIndex ? path.slice(0, qsIndex) : path;
    m = this.regexp.exec(pathname);
  
    if (!m) return false;

    for (var i = 1, len = m.length; i < len; ++i) {
      var key = keys[i - 1];

      var val = 'string' == typeof m[i]
        ? decodeURIComponent(m[i])
        : m[i];

      if (key) {
        params[key.name] = undefined !== params[key.name]
          ? params[key.name]
          : val;
      } else {
        params.push(val);
      }
    }

    return true;
  };

  /**
   * Normalize the given path string,
   * returning a regular expression.
   *
   * An empty array should be passed,
   * which will contain the placeholder
   * key names. For example "/user/:id" will
   * then contain ["id"].
   *
   * @param  {String|RegExp|Array} path
   * @param  {Array} keys
   * @param  {Boolean} sensitive
   * @param  {Boolean} strict
   * @return {RegExp}
   * @api private
   */

  function pathtoRegexp(path, keys, sensitive, strict) {
    if (path instanceof RegExp) return path;
    if (path instanceof Array) path = '(' + path.join('|') + ')';
    path = path
      .concat(strict ? '' : '/?')
      .replace(/\/\(/g, '(?:/')
      .replace(/\+/g, '__plus__')
      .replace(/(\/)?(\.)?:(\w+)(?:(\(.*?\)))?(\?)?/g, function(_, slash, format, key, capture, optional){
        keys.push({ name: key, optional: !! optional });
        slash = slash || '';
        return ''
          + (optional ? '' : slash)
          + '(?:'
          + (optional ? slash : '')
          + (format || '') + (capture || (format && '([^/.]+?)' || '([^/]+?)')) + ')'
          + (optional || '');
      })
      .replace(/([\/.])/g, '\\$1')
      .replace(/__plus__/g, '(.+)')
      .replace(/\*/g, '(.*)');
    
    return new RegExp('^' + path + '$', sensitive ? '' : 'i');
  };
  
  /// END Route object
  
  // Added by tom, lifted from mini-pages, with some modifications
  
  /**
    Given a context object, returns a url path with the values of the context
    object mapped over the path.
    
    Alternatively, supply the named parts of the paths as discrete arguments.
    
    @method pathWithContext
    @param [context] {Object} An optional context object to use for
    interpolation.

    @example
        // given a page with a path of "/posts/:_id/edit"
        var path = page.pathWithContext({ _id: 123 });
        // > /posts/123/edit
  */
  Meteor.RESTstop.Route.prototype.pathWithContext = function (context) {
    var self = this,
        path = self.path,
        parts,
        args = arguments;
        
    /* get an array of keys from the path to replace with context values.
    /* XXX Right now this comes from page-js. Remove dependency. 
     */
    parts = self.regexp.exec(self.path).slice(1);
    
    context = context || {};
    
    var replacePathPartWithContextValue = function (part, i) {
      var re = new RegExp(part, "g"),
          prop = part.replace(":", ""),
          val;
      
      if (_.isObject(context))
        val = context[prop]
      else
        val = args[i];
      
      path = path.replace(re, val || '');
    };
    
    _.each(parts, replacePathPartWithContextValue);

    return path;
  }
}());
