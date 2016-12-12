var secret = 'testtopkek321123'
var express     = require('express')
var fs          = require('fs')
var http        = require('http')
//var https       = require('https')
var path        = require('path')
var Session     = require('express-session')
var bodyParser  = require('body-parser')
var ios = require('socket.io-express-session')
var SessionStore = require('session-file-store')(Session);
var session = Session({store: new SessionStore({path: __dirname+'/tmp/sessions'}), secret: secret, resave: true, saveUninitialized: true});

/*var options = {
    key: fs.readFileSync('/etc/letsencrypt/live/cloud-59.skelabb.ltu.se/privkey.pem'),
    cert: fs.readFileSync('/etc/letsencrypt/live/cloud-59.skelabb.ltu.se/cert.pem'),
    ca: fs.readFileSync('/etc/letsencrypt/live/cloud-59.skelabb.ltu.se/chain.pem')
};*/

var app = express()

// app settings
app.set('view engine', 'ejs');
app.use(express.static(path.join(__dirname, '/../www')));
app.set('views', path.join(__dirname, '/../www'));
app.use(bodyParser.urlencoded({     // to support URL-encoded bodies
  extended: true
}));
app.use( bodyParser.json() );       // to support JSON-encoded bodies
app.use(session)

// start server
const port=80; 
const portSSL=443;
var io
var clients = {}
var sequence = 1;

var db = null;
var user = null;
var api = null;

function startServer(db_in, user_in, api_in) {

    db     = db_in
    user   = user_in
    api    = api_in

    /* legacy backup
    http.createServer(app).listen(port, function(){
        console.log("Express HTTP server listening on port " + port);
    });
    /*https.createServer(options, app).listen(portSSL, function(){
        console.log("Express HTTPS server listening on port " + portSSL);
    });*/
    var server = http.createServer(app);
    server.listen(port); // start listening

    io = require('socket.io')(server);
    io.use(ios(session));
    io.sockets.on('connection', function (socket) {
        //console.log("Session: ", session.idusers)
        console.info('New client connected (idusers=' + session.idusers +', id=' + socket.id + ')')
        //clients[session.idusers] = socket.id
        clients[session.idusers] = socket

        // When socket disconnects, remove it from the list
        socket.on('disconnect', function() {
            console.info('Client disconnected (id=' + socket.id + ')')
            delete clients[socket.id]
        });
    });
}
setInterval(function() {
    var message = { message: sequence++ }
    sendSocketMessage([1,2], 'message', message)
}, 1000);

/* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */
function sendSocketMessage(ids, type, message) {
    for(var i = 0; i < ids.length; i++) {
        if(clients[ids[i]]) {
            clients[ids[i]].emit(type, message);
        }
    }
}

function checkAuth(req, res, next) {
    if (!session.idusers) {
        res.redirect('/login');
    } else {
        next();
    }
}

function setSessionUserID(idusers, next_page, res) {
    session.idusers = idusers

    res.redirect(next_page);
}

/* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

/*app.use(function requireHTTPS(req, res, next) {
  if (!req.secure) {
    return res.redirect('https://' + req.headers.host + req.url);
  }
  next();
})*/

app.get('/', checkAuth, function (req, res) {
    req.session.test = 'test'
    res.render('index', { temp : 'ITS OVER 9000!!!!' })
})

app.get('/room/:idroom', checkAuth, function (req, res) {
    //req.params.idroom
    res.render('index', { idroom : req.params.idroom })
})

app.get('/room/:idroom/:nav', checkAuth, function (req, res) {
    //req.params.idroom
    res.render('index', { idroom : req.params.idroom, nav : req.params.nav })
})

app.get('/friend/:idchat', checkAuth, function (req, res) {
    //req.params.idchat
    res.render('index', { idchat : req.params.idchat })
})

app.get('/friend/:idchat/:nav', checkAuth, function (req, res) {
    //req.params.idchat
    res.render('index', { idchat : req.params.idchat, nav : req.params.nav })
})

app.get('/login', function (req, res) {
    res.render('login')
})

app.post('/login', function (req, res) {

    var email = req.body.email
    var password = req.body.password

    user.login(email, password, res)
})

app.get('/register', function (req, res) {
    res.render('register')
})

app.post('/register', function (req, res) {

    var email = req.body.email
    var fname = req.body.fname
    var lname = req.body.lname
    var password = req.body.password
    var confirmpassword = req.body.confirmpassword

    // control so that email is email

    if (password != confirmpassword)
        res.redirect('/register');

    user.register(email, fname, lname, password, res)
})

app.get('/logout', function (req, res) {
    session.idusers = undefined
    res.redirect('/');
})

app.get('/about', function (req, res) {
    res.render('about')
})

/* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

/*  {
    "method": "getFriends",
    "data": []
    }                                   
*/



app.post('/api', function (req, res) {

    api.handleRequest(req.body, res, session)
})

/* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

// Handle 404
app.use(function(req, res) {
    res.status(404).send('404: Page not Found')
});

// Handle 500
app.use(function(error, req, res, next) {
    res.status(500).send('500: Internal Server Error\n ' + error)
});


module.exports.startServer = startServer
module.exports.setSessionUserID = setSessionUserID