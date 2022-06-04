const routes = require('next-routes')();

routes
    .add('/mint', '/mint')
    .add('/useritems', '/useritems')
    .add('/item/:itemId', '/item');

module.exports = routes;