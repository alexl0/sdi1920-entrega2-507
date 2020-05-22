//Modulos
let express = require('express');
let app = express();

let rest = require('request');
app.set('rest', rest);

app.use(function (req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Credentials", "true");
    res.header("Access-Control-Allow-Methods", "POST, GET, DELETE, UPDATE, PUT");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, token");
    // Debemos especificar todas las headers que se aceptan. Content-Type , token
    next();
});

var jwt = require('jsonwebtoken');
app.set('jwt', jwt);

let fs = require('fs');
let https = require('http');

let expressSession = require('express-session');
app.use(expressSession({
    secret: 'abcdefg',
    resave: true,
    saveUninitialized: true
}));
let crypto = require('crypto');

let mongo = require('mongodb');
let swig = require('swig');
let bodyParser = require('body-parser');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));

let gestorBD = require("./modules/gestorBD.js");
gestorBD.init(app, mongo);

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));

// routerUsuarioToken
var routerUsuarioToken = express.Router();
routerUsuarioToken.use(function (req, res, next) {
    // obtener el token, vía headers (opcionalmente GET y/o POST).
    var token = req.headers['token'] || req.body.token || req.query.token;
    if (token != null) {
        // verificar el token
        jwt.verify(token, 'secreto', function (err, infoToken) {
            if (err || (Date.now() / 1000 - infoToken.tiempo) > 240) {
                res.status(403); // Forbidden
                res.json({
                    acceso: false,
                    error: 'Token invalido o caducado'
                });
                // También podríamos comprobar que intoToken.usuario existe
                return;

            } else {
                // dejamos correr la petición
                res.usuario = infoToken.usuario;
                next();
            }
        });

    } else {
        res.status(403); // Forbidden
        res.json({
            acceso: false,
            mensaje: 'No hay Token'
        });
    }
});

app.use('/api/amigos', routerUsuarioToken);
app.use('/api/usuarios', routerUsuarioToken);
app.use('/api/mensaje', routerUsuarioToken);

// routerUsuarioSession
let routerUsuarioSession = express.Router();
routerUsuarioSession.use(function (req, res, next) {
    //console.log("routerUsuarioSession");
    if (req.session.usuario) {
        // dejamos correr la petición
        next();
    } else {
        //console.log("va a : " + req.session.destino)
        res.redirect("/identificarse");
    }
});

app.use("/verUsuarios", routerUsuarioSession);
app.use("/invitaciones", routerUsuarioSession);
app.use("/amigos", routerUsuarioSession);
app.use("/usuario/invitar", routerUsuarioSession);
app.use("/usuario/aceptar", routerUsuarioSession);

app.use(express.static('public'));

// Variables
app.set('port', process.env.PORT || 8081);
app.set('db', process.env.bd_connection || 'mongodb://admin:PLqB51Mua2tcF6Wh@tiendamusica-shard-00-00-4umpq.mongodb.net:27017,tiendamusica-shard-00-01-4umpq.mongodb.net:27017,tiendamusica-shard-00-02-4umpq.mongodb.net:27017/test?ssl=true&replicaSet=tiendamusica-shard-0&authSource=admin&retryWrites=true&w=majority');

app.set('clave', 'abcdefg');
app.set('crypto', crypto);

//Log
var log4js = require('log4js');
log4js.configure({
    appenders: {
        out: {
            type: 'stdout',
            layout: {type: 'pattern', pattern: '%[[%d{dd-MM-yyyy hh:mm:ss}] [%p] - %]%m'}
        },
        file: {
            type: 'file', filename: 'log/FriendsManager.log',
            layout: {type: 'pattern', pattern: '[%d{dd-MM-yyyy hh:mm:ss}] [%p] - %m'}
        }
    },
    categories: {
        default: {appenders: ['out', 'file'], level: 'debug'}
    }
});
var log = log4js.getLogger();
var gestorLog = require("./modules/gestorLog.js");
gestorLog.init(app, log);

var gestorLogApi = require("./modules/gestorLogApi.js");
gestorLogApi.init(app, log);
app.set('gestorLog', gestorLog);
app.set('gestorLogApi', gestorLogApi);

//Rutas/controladores por lógica
require("./routes/rusuarios.js")(app, swig, gestorBD); // (app, param1, param2, etc.)
require("./routes/rerrores.js")(app, swig); // (app, param1, param2, etc.)
require("./routes/rapichat.js")(app, gestorBD);

app.get('/', function (req, res) {
    res.redirect('/verUsuarios');
})

app.use(function (err, req, res, next) {
    //console.log("Error producido: " + err);
    gestorLog.error(err);
    if (!res.headersSent) {
        res.status(400);
        //res.send("Recurso no disponible");
        res.redirect('/error/' + "Recurso no disponible");
    }
    res.redirect('/error/' + err);
});

https.createServer({
    key: fs.readFileSync('certificates/alice.key'),
    cert: fs.readFileSync('certificates/alice.crt')
}, app).listen(app.get('port'), function () {
    console.log("Servidor activo");
});

