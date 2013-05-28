**NOTE**: Current in early early *early* beta! Use with caution. The methods and
code below will be changing frequently. In fact, this documentation will
probably be out of date by the time you read it :)

WHAT IT DOES
------------

RESTstop makes it easy to create RESTful APIs built on top of Meteor, for use with legacy 
systems (or if you're just too lazy to get DDP+SRP working).

It's a psuedo-fork of [Meteor Router](https://github.com/tmeasday/meteor-router)'s, 
with a few major differences:

  * It doesn't come with all the front-end routing.
  * It makes sure it's run higher in the stack so that your routes aren't ignored.
  * You can authenticate users via the API (although you could probably get this working with Router).
  * It has some API-specific features

INSTALLATION
------------

Currently not in Atmosphere (not yet stable), so you have to install it manually:

    cd your-meteor-project
    git submodule add git@github.com:gkoberger/meteor-reststop.git packages/reststop

WRITING AN API
--------------

Here's some simple API methods:

    if (Meteor.isServer) {
      Meteor.RESTstop.route('get_user', {}, function() {
        if(!this.user) {
          return {'is_loggedin': false};
        }
        return {
          'is_loggedin': true, 
          'username': this.user.username
        };
      });

      Meteor.RESTstop.route('posts', {require_login: true}, function() {
        var posts = [];
        Posts.find({owner_id: this.user._id}).forEach(function(post) {

          // Modify the post here...

          posts.push(post);
        });
        return posts
      });
    }

Note how the second one uses `require_login`, which will return a 403 and an error message (`{error: 'You need to be logged in'}`).

USING THE API YOU CREATED
-------------------------

To log in, use the (included-with-RESTstop) "login" method. User can be an email address
or a username. Make sure you're using HTTPS; otherwise it's insecure. (Really, you
shouldn't be using this at all and instead should be using SRP.. but alas, the point
of this is to make it work with legacy systems.)

    curl --data "password=testpassword&user=test" http://localhost:3000/api/login/

This will return a user id and token, which you must save (and include in future requests):

    {"token":"f2KpRW7KeN9aPmjSZ","id":"fbdpsNf4oHiX79vMJ"}

Then, you can call the API method, "get_user", that we wrote above. Note the `/api/` (eventually it'll be an option).

    curl --data "loginToken=3QzDtgZEaEAKc5JRS&userId=fbdpsNf4oHiX79vMJ" http://localhost:3000/api/get_user/

THANKS TO
---------
Thanks to the following projects, which I borrowed ideas and code from:

  * [tmeasday/meteor-router](https://github.com/tmeasday/meteor-router)
  * [crazytoad/meteor-collectionapi](https://github.com/crazytoad/meteor-collectionapi)

