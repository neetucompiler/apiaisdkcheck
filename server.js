'use strict'
var path = require('path')
var http = require('http')
var express = require('express')
var app = express()
var server = http.createServer(app)
var io = require('socket.io')(server)
var apiai = require('apiai')
var apiapp = apiai('dde8e7dda0a9453da17fcf25cd88765f')
var options = {
  sessionId: '1111'
}
app.use(express.Router())
app.use(express.static(path.join(__dirname, '/build/production')))
server.listen(process.env.PORT || 3000)
console.log(path.join(__dirname, '/build/production/index.html'))

app.get('/', function (req, res) {
  res.sendfile(path.join(__dirname, '/build/production/index.html'))
})

var soc
io.on('connection', function (socket) {
  console.log('A user is connected')
  soc = socket
  socket.on('assistance', function (data) {
    console.log('Hi: ' + data)
    sendToApiai(data)
  })
  socket.on('disconnect', function () {
    console.log('A user is disconnected')
  })
})

function sendToClient (response, session) {
  soc.emit('output', response)
  session.send(response)
}

function sendToApiai (userInput) {
  apiapp.textRequest(userInput, options)
    .on('response', function (response) {
      console.log(response)
      sendToClient(response)
    })
    .on('error', function (error) {
      console.log(error)
    })
}
