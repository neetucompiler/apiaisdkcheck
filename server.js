'use strict'
var path = require('path')
var http = require('http')
var express = require('express')
var app = express()
var server = http.createServer(app)
var io = require('socket.io')(server)
var apiai = require('apiai')
var apiapp = apiai('dde8e7dda0a9453da17fcf25cd88765f')
var bodyParser = require('body-parser')
var cookieParser = require('cookie-parser')
const pg = require('pg');
var con = "postgres://mxqwsrophwcebu:41a7aa3ef1bf3e836796b883a2c0b78b03397ab2239fc8fc48caee1d5b32e854@ec2-54-83-49-44.compute-1.amazonaws.com:5432/dd0kuebp12emms"; 
var options = {
  sessionId: '1111'
}
var soc
app.use(express.Router())
app.use(express.static(path.join(__dirname, '/build/production')))

// BodyParser Middleware
app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())
app.use(cookieParser())

console.log(path.join(__dirname, '/build/production/index.html'))

app.get('/', function(req, res) {
  res.sendfile(path.join(__dirname, '/build/production/index.html'))
})

// app.post('/feedback', function(req, res){
//     console.log("someone came in here");
//     console.log(req.body);
// });

function sendToClient(response, session) {
  soc.emit('output', response)
    //   session.send(response)
}

function sendToApiai(userInput) {
  console.log('user input: ' + userInput)
  apiapp.textRequest(userInput, options)
    .on('response', function(response) {
      console.log(typeof(response))
      var str = JSON.stringify(response)
      if(str.indexOf('bye') > -1)
        {
          console.log('found bye');
          var userend ="true"
          soc.emit('end',userend)
          sendToClient(response.result.fulfillment.speech)
        }
      else
        {
          sendToClient(response.result.fulfillment.speech)  
        }
    })
    .on('error', function(error) {
      console.log('ERROR:: ' + error)
    })
    .end()
}

io.on('connection', function(socket) {
  console.log('A user is connected')
  soc = socket
  socket.on('assistance', function(data) {
    console.log('Hi: ' + data)
    sendToApiai(data)
  })
  socket.on('disconnect', function() {
    console.log('A user is disconnected')
  })
  socket.on('feedback', function(data) {
    console.log("someone came in here")
    console.log(data)
    // pg connection
    pg.defaults.ssl = true;
    pg.connect(con, function(err, client) {
      if (err) {
        console.log (err);
        console.log ("POSTGRES FAILED TO CONNECT");
      }
      console.log('Connected to postgres! Getting schemas...');
      client
      .query('CREATE TABLE Bottest(rating int,feedback text);')
      .on('row', function(row) {
        console.log ("table created");
       });
    });   
    // pg connection end
  })
})

app.set('port', (process.env.PORT || 3000))
server.listen(app.get('port'), function(){
  console.log('Server started on port: ' + app.get('port'))
})