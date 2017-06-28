'use strict'
var path = require('path')
var http = require('http')
var express = require('express')
var app = express()
var server = http.createServer(app)
var io = require('socket.io')(server)
var apiapp = require('apiai')('dde8e7dda0a9453da17fcf25cd88765f')
var bodyParser = require('body-parser')
var cookieParser = require('cookie-parser')
var azure = require('azure-storage');
var json2csv = require('json2csv');
var fs = require('fs');
var Promise = require('promise'); //Synchronous execution flow
var newLine = "\r\n";
var fields = ['comment', 'rating'];
// Azure Blob Connecting string
var blobService = azure.createBlobService("DefaultEndpointsProtocol=https;AccountName=bottest;AccountKey=x3UGY+Yk0pluV32GH6FwWwY3Ys7Jphc2o+0z392HeXBgcEWDv/Bp/OnnITr5BQ54IlJbV6eVjZt+qpwHbzzUng==;EndpointSuffix=core.windows.net");
const pg = require('pg');
var options = {
  sessionId: '1111'
}
var soc
app.use(express.Router())
app.use(express.static(path.join(__dirname, '/build/production')))

// BodyParser Middleware
app.use(bodyParser.urlencoded({
  extended: false
}))
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
      if (str.indexOf('bye') > -1) {
        console.log('found bye');
        var userend = "true"
        soc.emit('end', userend)
        sendToClient(response.result.fulfillment.speech)
      } else {
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
    var appendThis = [
    {
        'Rating': '1',
        'Feedback': 'It is not so good'
    },
    {
        'Rating': '3',
        'Feedback': 'It seems to be okayyyyy.'
    }
  ];
    var toCsv = {
      data: data,
      fields: fields,
      hasCSVColumnTitle: false
    };
    //Download Promise variable
    var downloadPromise = new Promise(function(resolve, reject) {
      // blobService.getBlobToStream('bottest','feedback', fs.createWriteStream('feedback.csv'), function(error, result, response) {
      // Downloading the file in writestream 
      blobService.getBlobToStream('feedback', 'taskblob', fs.createWriteStream('userfeedback.csv'), function(error, result, response) {
        if (!error) {
          console.log('write stream')
          resolve(result);
        } else {
          reject(error);
        }
      });
    })

    //Append and UPload promise variable
    var append = function(phone) {
      return new Promise(
        function(resolve, reject) {
          fs.stat('userfeedback.csv', function(err, stat) {
            if (err == null) {
              console.log('File exists');

              //write the actual data and end with newline
              var csv = json2csv(toCsv) + newLine;

              fs.appendFile('userfeedback.csv', csv, function(err) {
                if (err) {
                  let error = new Error('reject')
                  reject(error);
                } else {
                  console.log('The "data to append" was appended to file!');
                  blobService.createBlockBlobFromLocalFile('feedback', 'taskblob', 'userfeedback.csv', function(error, result, response) {
                    if (!error) {
                      console.log("file uploaded");
                      resolve("file uploaded")
                    }
                  });
                }
              })
            }
          })
        }
      );
    };

    // chaining promises and calling them
    var task = function() {
      downloadPromise
        .then(function(fulfilled) {
          console.log("file downloaded");
        })
        .then(append)
        .catch(function(error) {
          console.log(error.message);
        });
    };
    // calling the task 
    task();
  })
})

app.set('port', (process.env.PORT || 3000))
server.listen(app.get('port'), function() {
  console.log('Server started on port: ' + app.get('port'))
})