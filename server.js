'use strict';

const express = require('express');
const app = express();
const server = require('http').Server(app);
const io = require('socket.io').listen(server);

var players = {};

var villages = {
    0: {villageId: 0, x: 100, y: 400, immunity: 0},
    1: {villageId: 1, x: 500, y: 150, immunity: 0}
};

var star = {
  x: Math.floor(Math.random() * 700) + 50,
  y: Math.floor(Math.random() * 500) + 50
};

var scores = {
  blue: 0,
  red: 0
};

app.use(express.static(__dirname + '/public'));

app.get('/', function (req, res) {
  res.sendFile(__dirname + '/index.html');
});

io.on('connection', function (socket) {
  console.log('a user connected');
  // create a new player and add it to our players object
  players[socket.id] = {
    rotation: 0,
    firing: false,
    x: Math.floor(Math.random() * 700) + 50,
    y: Math.floor(Math.random() * 500) + 50,
    playerId: socket.id,
    team: (Math.floor(Math.random() * 2) == 0) ? 'red' : 'blue'
  };
  // send the village locations
  socket.emit('villageLocations', villages)
  // send the players object to the new player
  socket.emit('currentPlayers', players);
  // update all other players of the new player
  socket.broadcast.emit('newPlayer', players[socket.id]);
  // send the star object to the new player
  socket.emit('starLocation', star);
  // send the current scores
  socket.emit('scoreUpdate', scores);

  socket.on('disconnect', function () {
    console.log('user disconnected');
    // remove this player from our players object
    delete players[socket.id];
    // emit a message to all players to remove this player
    io.emit('disconnect', socket.id);
  });

  // when a player moves, update the player data
  socket.on('playerMovement', function (movementData) {
    players[socket.id].x = movementData.x;
    players[socket.id].y = movementData.y;
    players[socket.id].rotation = movementData.rotation;
    players[socket.id].firing = movementData.firing;
    // emit a message to all players about the player that moved
    socket.broadcast.emit('playerMoved', players[socket.id]);
  });

  socket.on('playerFiringUpdate', function (firingData) {
      players[socket.id].firing = firingData.firing;
      // if starting to fire, emit a message to all players about the firing player
      if (firingData.firing) {
          socket.broadcast.emit('playerFired', players[socket.id]);
      }
  })

  socket.on('starCollected', function () {
    if (players[socket.id].team === 'red') {
      scores.red += 10;
    } else {
      scores.blue += 10;
    }
    star.x = Math.floor(Math.random() * 700) + 50;
    star.y = Math.floor(Math.random() * 500) + 50;
    io.emit('starLocation', star);
    io.emit('scoreUpdate', scores);
  });

  socket.on('villageHit', function(villageId) {
      var village = villages[villageId];
      village.immunity += 0.5 * (1 - village.immunity);
      io.emit('villageUpdated', village);
  });

});

// Start the server
const PORT = process.env.PORT || 8080;
server.listen(PORT, function () {
  console.log(`App listening on ${server.address().port}`);
  console.log('Press Ctrl+C to quit.');
});
