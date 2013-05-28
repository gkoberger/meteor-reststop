**NOTE**: Current in early early *early* beta! Use with caution. This documentation will
probably be out of date by the time you read it :)

WHAT IT DOES
------------

RESTstop makes it easy to create RESTful APIs built on top of Meteor, for use with legacy 
systems (or if you're just too lazy to get DDP+SRP working).

It's similar to (the far superior) [Meteor Router](https://github.com/tmeasday/meteor-router)'s server 
component, with a few major differences:

  * It makes sure it's run higher in the stack so that your routes aren't ignored.
  * It doesn't come with all the front-end routing.
  * You can authenticate users via the API (although you could probably get this working with Router).

In the (near) future, it's going to include a number of API-specific features.

INSTALLATION
------------

Currently not in Atmosphere (not yet stable), so you have to install it manually:

    cd your-meteor-project
    git submodule add git@github.com:gkoberger/meteor-reststop.git packages/reststop

WRITING AN API
--------------

Here's a simple API method that will return the user if logged in:

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
    }

USING THE API YOU CREATED
-------------------------

To log in, use the (included-with-RESTstop) "login" method. User can be an email address
or a username. Make sure you're using HTTPS; otherwise it's insecure. (Really, you
shouldn't be using this at all and instead should be using SRP.. but alas, the point
of this is to make it work with legacy systems.)

    curl --data "password=testpassword&user=test" http://localhost:3000/api/login/

This will return a user id and token, which you must save (and include in future requests):

    {"token":"f2KpRW7KeN9aPmjSZ","id":"fbdpsNf4oHiX79vMJ"}

Then, you can call the API method, "get_user", that we wrote above:

    curl --data "loginToken=3QzDtgZEaEAKc5JRS&userId=fbdpsNf4oHiX79vMJ" http://localhost:3000/api/get_user/

THANKS TO
---------
Thanks to the following projects, which I borrowed ideas and code from:

  * [tmeasday/meteor-router](https://github.com/tmeasday/meteor-router)
  * [crazytoad/meteor-collectionapi](https://github.com/crazytoad/meteor-collectionapi)

