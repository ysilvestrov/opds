var express = require('express');
var http = require('http');
var path = require('path');
var config = require('./config');
var mongoose = require('./libs/mongoose');
var log = require('./libs/log')(module);
var HttpError = require('./error').HttpError;

var app = express();
app.set('port', config.get('port'));

app.set('views', path.join(__dirname, '/views'));
app.set('view engine', 'jade');

app.use(express.favicon());

if (app.get('env') == 'development') {
  app.use(express.logger('dev'));
} else {
  app.use(express.logger('default'));
}
;

app.use(express.bodyParser());
app.use(express.cookieParser('stupid phrase'));

var MongoStore = require('connect-mongo')(express);
app.use(express.session({
  secret: config.get('session:secret'),
  key: config.get('session:key'),
  cookie: config.get('session:key'),
  store: new MongoStore({mongooseConnection: mongoose.connection})
}));


app.use(require('./middleware/sendHttpError'));
app.use(require('./middleware/loadUser'));
app.use(app.router);

require('./routes')(app);

app.use(express.static(path.join(__dirname, 'public')));

app.use(function (err, req, res, next) {
  if (typeof err == 'number') {
    err = new HttpError(err);
  }
  if (err instanceof HttpError) {
    res.sendHttpError(err);
  } else {
    if (app.get('env') == 'development') {
      express.errorHandler()(err, req, res, next);
    } else {
      log.error(err);
      err = new HttpError(500);
      res.sendHttpError(err);
    }
  }
});

var server = http.createServer(app);
server.listen(config.get('port'), function () {
  log.info('Express server listening on port ' + config.get('port'));
});
module.exports = app;