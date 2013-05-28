Package.describe({
  summary: "Add the ability to do RESTful APIs with Meteor."
});

Package.on_use(function (api) {
  api.add_files("server.js", "server");
});
