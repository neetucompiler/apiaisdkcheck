'use strict'

var apiai = require('apiai')

var app = apiai('dde8e7dda0a9453da17fcf25cd88765f')

var options = {
  sessionId: '1111'
}

var request = app.textRequest('hello', options)

request.on('response', function (response) {
  console.log(response)
})

request.on('error', function (error) {
  console.log('Error:: ' + error)
})
