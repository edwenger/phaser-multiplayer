var GAME_WIDTH = 800*2;
var GAME_HEIGHT = 600*2;
var CAMERA_WIDTH = 800;
var CAMERA_HEIGHT = 600;

var config = {
  type: Phaser.AUTO,
  parent: 'phaser-example',
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  physics: {
    default: 'arcade',
    arcade: {
      debug: false,
      gravity: { y: 0 }
    }
  },
  scene: {
    preload: preload,
    create: create,
    update: update
  }
};

var game = new Phaser.Game(config);

function preload() {
    this.load.image('ship', 'assets/spaceShips_001.png');
    this.load.image('otherPlayer', 'assets/enemyBlack5.png');
    this.load.image('star', 'assets/star_gold.png');
    this.load.image('background', 'assets/background-texture.png')
}

function create() {
  var self = this;
  this.socket = io();
  this.otherPlayers = this.physics.add.group();

  this.physics.world.setBounds(0, 0, GAME_WIDTH, GAME_HEIGHT);

  this.cameras.main
      .setBounds(0, 0, GAME_WIDTH, GAME_HEIGHT)
      .setViewport(0, 0, CAMERA_WIDTH, CAMERA_HEIGHT);

  this.socket.on('currentPlayers', function (players) {
    Object.keys(players).forEach(function (id) {
      if (players[id].playerId === self.socket.id) {
        addPlayer(self, players[id]);
      } else {
        addOtherPlayers(self, players[id]);
      }
    });
  });

  this.socket.on('newPlayer', function (playerInfo) {
    addOtherPlayers(self, playerInfo);
  });

  this.socket.on('disconnect', function (playerId) {
    self.otherPlayers.getChildren().forEach(function (otherPlayer) {
      if (playerId === otherPlayer.playerId) {
        otherPlayer.destroy();
      }
    });
  });

  this.socket.on('playerMoved', function (playerInfo) {
    self.otherPlayers.getChildren().forEach(function (otherPlayer) {
      if (playerInfo.playerId === otherPlayer.playerId) {
        otherPlayer.setRotation(playerInfo.rotation);
        otherPlayer.setPosition(playerInfo.x, playerInfo.y);
      }
    });
  });

  this.cursors = this.input.keyboard.createCursorKeys();

  background = this.add.tileSprite(GAME_WIDTH/2, GAME_HEIGHT/2, GAME_WIDTH, GAME_HEIGHT, 'background');

  this.blueScoreText = this.add.text(16, 16, '', { fontSize: '32px', fill: '#0000FF' })
                               .setScrollFactor(0);
  this.redScoreText = this.add.text(CAMERA_WIDTH - 170, 16, '', { fontSize: '32px', fill: '#FF0000' })
                              .setScrollFactor(0);  // TODO: right align + use consistent padding above?

  this.socket.on('scoreUpdate', function (scores) {
      self.blueScoreText.setText('Blue: ' + scores.blue);
      self.redScoreText.setText('Red: ' + scores.red);
  });

  this.socket.on('starLocation', function (starLocation) {
    if (self.star) self.star.destroy();
    self.star = self.physics.add.image(starLocation.x, starLocation.y, 'star');
    self.physics.add.overlap(self.ship, self.star, function () {
      this.socket.emit('starCollected');
    }, null, self);
  });
}

function update() {
    if (this.ship) {
        if (this.cursors.left.isDown) {
          this.ship.setAngularVelocity(-150);
        } else if (this.cursors.right.isDown) {
          this.ship.setAngularVelocity(150);
        } else {
          this.ship.setAngularVelocity(0);
        }

        if (this.cursors.up.isDown) {
          this.physics.velocityFromRotation(this.ship.rotation + 1.5, 100, this.ship.body.acceleration);
        } else {
          this.ship.setAcceleration(0);
        }

        // emit player movement
        var x = this.ship.x;
        var y = this.ship.y;
        var r = this.ship.rotation;
        if (this.ship.oldPosition && (x !== this.ship.oldPosition.x || y !== this.ship.oldPosition.y || r !== this.ship.oldPosition.rotation)) {
          this.socket.emit('playerMovement', { x: this.ship.x, y: this.ship.y, rotation: this.ship.rotation });
        }

        // save old position data
        this.ship.oldPosition = {
          x: this.ship.x,
          y: this.ship.y,
          rotation: this.ship.rotation
        };

    }
}

function addPlayer(self, playerInfo) {
  self.ship = self.physics.add.image(playerInfo.x, playerInfo.y, 'ship').setOrigin(0.5, 0.5).setDisplaySize(53, 40);
  if (playerInfo.team === 'blue') {
    self.ship.setTint(0x0000ff);
  } else {
    self.ship.setTint(0xff0000);
  }
  self.ship.setDrag(100)
           .setAngularDrag(100)
           .setMaxVelocity(200)
           .setCollideWorldBounds(true);
  self.cameras.main.startFollow(self.ship, true, 0.05, 0.05);
}

function addOtherPlayers(self, playerInfo) {
  const otherPlayer = self.add.sprite(playerInfo.x, playerInfo.y, 'otherPlayer').setOrigin(0.5, 0.5).setDisplaySize(53, 40);
  if (playerInfo.team === 'blue') {
    otherPlayer.setTint(0x0000ff);
  } else {
    otherPlayer.setTint(0xff0000);
  }
  otherPlayer.playerId = playerInfo.playerId;
  self.otherPlayers.add(otherPlayer);
}
