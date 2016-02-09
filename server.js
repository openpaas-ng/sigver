'use strict'
var WebSocketServer = require('ws').Server
var PORT = process.env.OPENSHIFT_NODEJS_PORT || 3000
var UNSUPPORTED_DATA = 1007
var POLICY_VIOLATION = 1008
var CLOSE_UNSUPPORTED = 1003

var server = new WebSocketServer({port: PORT})

server.on('connection', function (socket) {
  socket.on('message', function (data) {
    try {
      var msg = JSON.parse(data)
      var i, id, master
      if (msg.hasOwnProperty('key')) {
        for (i in server.clients) {
          master = server.clients[i]
          if (master.key === msg.key) {
            socket.close(POLICY_VIOLATION, 'The key already exists')
            return
          }
        }
        socket.key = msg.key
        socket.joiningClients = []
      } else if (msg.hasOwnProperty('id')) {
        for (var index in socket.joiningClients) {
          if (index == msg.id) {
            socket.joiningClients[index].send(JSON.stringify({data: msg.data}))
            return
          }
        }
        socket.close(POLICY_VIOLATION, 'Unknown id')
      } else if (msg.hasOwnProperty('join')) {
        for (i in server.clients) {
          master = server.clients[i]
          if (master.key === msg.join) {
            socket.master = master
            master.joiningClients.push(socket)
            id = master.joiningClients.length - 1
            master.send(JSON.stringify({id: id, data: msg.data}))
            return
          }
        }
        socket.close(POLICY_VIOLATION, 'Unknown key')
      } else if (msg.hasOwnProperty('data') && socket.hasOwnProperty('master')) {
        id = socket.master.joiningClients.indexOf(socket)
        socket.master.send(JSON.stringify({id: id, data: msg.data}))
      } else {
        socket.close(UNSUPPORTED_DATA, 'Unsupported message format')
      }
    } catch (event) {
      socket.close(CLOSE_UNSUPPORTED, 'Server accepts only JSON')
    }
  })

  socket.on('close', function (event) {
    if (socket.hasOwnProperty('joiningClients')) {
      for (var i in socket.joiningClients) {
        socket.joiningClients[i].close(POLICY_VIOLATION, 'The peer is no longer available')
      }
    }
  })
})

module.exports = server
