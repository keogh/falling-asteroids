soundManager.url = '../swf/';
soundManager.flashVersion = 9;
soundManager.debugFlash = false;
soundManager.debugMode = false;

window.requestAnimFrame = (function () {
  return  window.requestAnimationFrame ||
    window.webkitRequestAnimationFrame ||
    window.mozRequestAnimationFrame    ||
    window.oRequestAnimationFrame      ||
    window.msRequestAnimationFrame     ||
    function(/* function */ callback, /* DOMElement */ element){
      window.setTimeout(callback, 1000 / 60);
    };
})();

LEFT = 37;
RIGHT = 39;
FIRE = 32;

function getRandom(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function AssetManager() {
  this.successCount = 0;
  this.errorCount = 0;
  this.cache = {};
  this.downloadQueue = [];
  this.soundsQueue = [];
}

AssetManager.prototype.queueDownload = function (path) {
  this.downloadQueue.push(path);
}

AssetManager.prototype.queueSound = function (id, path) {
  this.soundsQueue.push({id: id, path: path});
}

AssetManager.prototype.downloadAll = function (callback) {
  if (this.downloadQueue.length === 0 && this.soundsQueue.length === 0) {
    callback();
  }
  
  this.downloadSounds(callback);
  
  for (var i = 0; i < this.downloadQueue.length; i++) {
    var path = this.downloadQueue[i];
    var img = new Image();
    var that = this;
    img.addEventListener("load", function () {
      console.log(this.src + ' is loaded');
      that.successCount += 1;
      if (that.isDone()) {
          callback();
      }
    }, false);
    img.addEventListener("error", function () {
      that.errorCount += 1;
      if (that.isDone()) {
          callback();
      }
    }, false);
    img.src = path;
    this.cache[path] = img;
  }
}

AssetManager.prototype.downloadSounds = function (callback) {
  var that = this;
  soundManager.onready(function() {
    console.log('soundManager ready');
    for (var i = 0; i < that.soundsQueue.length; i++) {
      that.downloadSound(that.soundsQueue[i].id, that.soundsQueue[i].path, callback);
    }
  });
  soundManager.ontimeout(function() {
    console.log('SM2 did not start');
  });
}

AssetManager.prototype.downloadSound = function (id, path, callback) {
  var that = this;
  this.cache[path] = soundManager.createSound({
    id: id,
    autoLoad: true,
    url: path,
    onload: function() {
      console.log(this.url + ' is loaded');
      that.successCount += 1;
      if (that.isDone()) {
        callback();
      }
    }
  });
}

AssetManager.prototype.getSound = function (path) {
  return this.cache[path];
}

AssetManager.prototype.getAsset = function (path) {
  return this.cache[path];
}

AssetManager.prototype.isDone = function () {
  return ((this.downloadQueue.length + this.soundsQueue.length) == this.successCount + this.errorCount);
}

function Timer() {
  this.gameTime = 0;
  this.maxStep = 0.05;
  this.wallLastTimestamp = 0;
}

Timer.prototype.tick = function () {
  var wallCurrent = Date.now();
  var wallDelta = (wallCurrent - this.wallLastTimestamp) / 1000;
  this.wallLastTimestamp = wallCurrent;
  
  var gameDelta = Math.min(wallDelta, this.maxStep);
  this.gameTime += gameDelta;
  return gameDelta;
}

function GameEngine() {
  this.entities = [];
  this.key = null;
  this.timer = new Timer();
  this.surfaceWidth = null;
  this.surfaceHeight = null;
  this.halfSurfaceWidth = null;
  this.halfSurfaceHeight = null;
  this.stop = false;
  this.keyFire = false;
}

GameEngine.prototype.init = function (ctx) {
  console.log('game initialized');
  this.ctx = ctx;
  this.surfaceWidth = this.ctx.canvas.width;
  this.surfaceHeight = this.ctx.canvas.height;
  this.halfSurfaceWidth = this.surfaceWidth/2;
  this.halfSurfaceHeight = this.surfaceHeight/2;
  this.startInput();
}

GameEngine.prototype.start = function () {
  console.log("starting game");
  var that = this;
  (function gameLoop () {
    if (that.stop) return;
    that.loop();
    requestAnimFrame(gameLoop, that.ctx.canvas);
  })();
}

GameEngine.prototype.startInput = function () {
  var that = this;
  document.addEventListener("keydown", function (e) {
    var code = e.keyCode;
    if ([LEFT, RIGHT, FIRE].indexOf(code) !== -1) {
      that.key = code;
      e.stopPropagation();
      e.preventDefault();
    }
  });

  document.addEventListener("keyup", function (e) {
    var code = e.keyCode;
    if (code === FIRE) {
      that.keyFire = true;
      e.stopPropagation();
      e.preventDefault();
    }
  });
}

GameEngine.prototype.addEntity = function (entity) {
    this.entities.push(entity);
}

GameEngine.prototype.draw = function (callback) {
  this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
  for (var i = 0; i < this.entities.length; i++) {
    this.entities[i].draw(this.ctx);
  }
  if (callback) {
    callback(this);
  }
}

GameEngine.prototype.update = function () {
  var entitiesCount = this.entities.length;
  
  for (var i = 0; i < entitiesCount; i++) {
    var entity = this.entities[i];
    if (!entity.removeFromWorld) {
      entity.update();
    }
  }
  
  for (var i = this.entities.length-1; i >= 0; --i) {
    if (this.entities[i].removeFromWorld) {
      this.entities.splice(i, 1);
    }
  }
}

GameEngine.prototype.loop = function () {
  this.clockTick = this.timer.tick();
  this.update();
  this.draw();
  this.key = null;
  this.keyFire = false;
}

function Entity(game, x, y) {
  this.game = game;
  this.x = x;
  this.y = y;
  this.removeFromWorld = false;
}

Entity.prototype.update = function() {
}

Entity.prototype.draw = function(ctx) {
  if (this.game.showOutlines) {
    var halfWidth = this.sprite.width / 2;
    var halfHeight = this.sprite.height / 2;
    ctx.beginPath();
    ctx.rect(this.x - halfWidth, this.y - halfHeight, this.sprite.width, this.sprite.height);
    ctx.strokeStyle = "green";
    ctx.stroke();
    ctx.closePath();
  }
}

Entity.prototype.drawSpriteCentered = function(ctx) {
  if (this.sprite && this.x && this.y) {
    var x = this.x - this.sprite.width/2;
    var y = this.y - this.sprite.height/2;
    ctx.drawImage(this.sprite, x, y);
  }
}

Entity.prototype.outsideScreen = function() {
  return (this.x > this.game.surfaceWidth || this.x < 0 ||
    this.y > this.game.surfaceHeight || this.y < 0);
}


function Player(game) {
  var asset = ASSET_MANAGER.getAsset('img/player.png')
  Entity.call(this, game, game.surfaceWidth/2, game.surfaceHeight - asset.height/ 2  - 10);
  this.sprite = asset;
  this.speed = 30;
}
Player.prototype = new Entity();
Player.prototype.constructor = Player;

Player.prototype.update = function () {
  var key = this.game.key;
  if (key === LEFT) {
    this.x -= this.speed; //* this.game.clockTick;
  } else if (key === RIGHT) {
    this.x += this.speed; //* this.game.clockTick;
  }
  if (this.x - this.sprite.width / 2 < 0) {
    this.x = 1 + this.sprite.width / 2;
  }
  if (this.x + this.sprite.width / 2 > this.game.surfaceWidth) {
    this.x = this.game.surfaceWidth - 1 - this.sprite.width / 2;
  }
  if (this.game.keyFire) {
    this.shoot();
  }
  Entity.prototype.update.call(this);
}

Player.prototype.draw = function (ctx) {
  this.drawSpriteCentered(ctx);
  Entity.prototype.draw.call(this, ctx);
}

Player.prototype.shoot = function () {
  var bullet = new Bullet(this.game, this.x, this.y - this.sprite.height);
  this.game.addEntity(bullet);
  ASSET_MANAGER.getSound('audio/bullet.mp3').play();
}

Player.prototype.explode = function () {
  this.removeFromWorld = true;
  this.game.playerDies();
  ASSET_MANAGER.getSound('audio/player_boom.mp3').play();
}

function Bullet(game, x, y) {
  Entity.call(this, game, x, y);
  this.sprite = ASSET_MANAGER.getAsset('img/laserRed.png');
  this.speed = 580;
}
Bullet.prototype = new Entity();
Bullet.prototype.constructor = Bullet;

Bullet.prototype.update = function () {
  if (this.outsideScreen()) {
    this.removeFromWorld = true;
  } else {
    this.y -= this.speed * this.game.clockTick; 
  }

  for (var i = 0; i < this.game.entities.length; i++) {
    var asteroid = this.game.entities[i];
    if (asteroid instanceof Asteroid && this.collidesWith(asteroid)) {
      console.log('hit!');
      asteroid.explode();
      this.explode();
      this.game.score += 10;
    }
  }

  Entity.prototype.update.call(this);
}

Bullet.prototype.draw = function (ctx) {
  ctx.drawImage(this.sprite, this.x, this.y);
  Entity.prototype.draw.call(this, ctx);
}

Bullet.prototype.collidesWith = function (asteroid) {
  var aX = asteroid.x - asteroid.sprite.width/2;
  var aY = asteroid.y - asteroid.sprite.height/2;
  var aW = asteroid.sprite.width;
  var aH = asteroid.sprite.height;
  return this.x < aX + aW &&
    this.x + this.sprite.width > aX &&
    this.y < aY + aH &&
    this.y + this.sprite.height > aY;
}

Bullet.prototype.explode = function () {
  this.removeFromWorld = true;
  this.game.addEntity(new BulletExplosion(this.game, this.x, this.y));
}

function BulletExplosion(game, x, y) {
  Entity.call(this, game, x, y);
  this.sprite = ASSET_MANAGER.getAsset('img/laserRedShot.png');
  this.duration = 0.25;
  this.initialTime = Date.now();
}
BulletExplosion.prototype = new Entity();
BulletExplosion.prototype.constructor = BulletExplosion;

BulletExplosion.prototype.update = function () {
  var duration = (Date.now() - this.initialTime) / 1000;
  if (duration >= this.duration) {
    this.removeFromWorld = true;
  }
  Entity.prototype.update.call(this);
}

BulletExplosion.prototype.draw = function (ctx) {
  this.drawSpriteCentered(ctx);
  Entity.prototype.draw.call(this, ctx);
}


function Asteroid(game, isBig, x, y, m) {
  Entity.call(this, game);
  this.isBig = isBig || false;
  if (this.isBig) {
    this.sprite = ASSET_MANAGER.getAsset('img/asteroidBig.png');
  } else {
    this.sprite = ASSET_MANAGER.getAsset('img/asteroidSmall.png');
  }
  this.speed = getRandom(40, 100);
  this.x = x || getRandom(0, game.surfaceWidth);
  this.y = y || -this.sprite.height;
  this.m = m || Math.floor((this.game.player.y - this.y) / (this.game.player.x - this.x));
  if (this.m == 0) this.m = 1;
  else if (this.m > 0 && this.m > 5) this.m = 5;
  else if (this.m < 0 && this.m < -5) this.m = -5;
}
Asteroid.prototype = new Entity();
Asteroid.prototype.constructor = Asteroid;

Asteroid.prototype.draw = function (ctx) {
  this.drawSpriteCentered(ctx);
  Entity.prototype.draw.call(this, ctx);
}

Asteroid.prototype.update = function () {
  this.x += this.m  * this.speed/2 * this.game.clockTick;
  this.y += Math.abs(this.m) * this.speed * this.game.clockTick;
  if (this.outsideScreen()) {
    this.removeFromWorld = true;
  } else if (!this.removeFromWorld && this.collidesWith(this.game.player)) {
    this.removeFromWorld = true;
    this.game.player.explode();
  }
}

Asteroid.prototype.collidesWith = function (player) {
  var aX = this.x - this.sprite.width/2;
  var aY = this.y - this.sprite.height/2;
  var aW = this.sprite.width;
  var aH = this.sprite.height;
  var pX = player.x - player.sprite.width/2;
  var pY = player.y - player.sprite.height/2;
  var pW = player.sprite.width;
  var pH = player.sprite.height;
  return aX < pX + pW &&
    aX + aW > pX &&
    aY < pY + pH &&
    aY + aH > pY;
}

Asteroid.prototype.outsideScreen = function () {
  return (this.x > this.game.surfaceWidth || this.x < 0 ||
    this.y > this.game.surfaceHeight);
}

Asteroid.prototype.explode = function () {
  this.removeFromWorld = true;
  if (this.isBig) {
    this.game.addEntity(new Asteroid(this.game, false, this.x, this.y, this.m));
    this.game.addEntity(new Asteroid(this.game, false, this.x, this.y, this.m * -1));
  }
  ASSET_MANAGER.getSound('audio/asteroid_boom.mp3').play();
}


function FallingAsteroids() {
  GameEngine.call(this);
  this.showOutlines = false;
  this.lives = 0;
  this.score = 0;
}
FallingAsteroids.prototype = new GameEngine();
FallingAsteroids.prototype.constructor = FallingAsteroids;

FallingAsteroids.prototype.start = function () {
  this.resetPlayer();
  this.dying = false;
  this.startDying = null;
  GameEngine.prototype.start.call(this);
}

FallingAsteroids.prototype.update = function () {
  if (this.dying) {
    var delta = (Date.now() - this.startDying) / 1000;
    if (delta > 2) {
      this.resetPlayer();
    }
    if (delta < 4) return;
  }
  if (this.lastAsteroidAddedAt == null || (this.timer.gameTime - this.lastAsteroidAddedAt) > 1.5) {
    this.addEntity(new Asteroid(this, getRandom(1, 10) > 5));
    this.lastAsteroidAddedAt = this.timer.gameTime;
  }
  GameEngine.prototype.update.call(this);
}

FallingAsteroids.prototype.draw = function () {
  GameEngine.prototype.draw.call(this, function (game) {
    game.drawLives();
    game.drawScore();
  });
}

FallingAsteroids.prototype.drawLives = function () {
  if (this.lives == 0) return;
  var asset = ASSET_MANAGER.getAsset('img/life.png');
  for (var i = 0; i < this.lives; i++) {
    var x = i * asset.width;
    this.ctx.drawImage(asset, x, 1);
  }
}

FallingAsteroids.prototype.drawScore = function () {
  this.ctx.fillStyle = "red";
  this.ctx.font = "bold 2em Arial";
  this.ctx.fillText("Score: " + this.score, 1, 55);
}

FallingAsteroids.prototype.playerDies = function () {
  this.lives -= 1;
  this.dying = true;
  this.startDying = Date.now();
}

FallingAsteroids.prototype.resetPlayer = function () {
  this.dying = false;
  if (this.lives < 0) {
    this.gameOver();
    return;
  }
  this.player = new Player(this);
  this.addEntity(this.player);
}

FallingAsteroids.prototype.gameOver = function () {
  console.log('game over');
  var that = this;
  setTimeout(function () {
    that.ctx.fillStyle = "green";
    that.ctx.font = "bold 4em Arial";
    that.ctx.fillText("GAME OVER", that.surfaceWidth/2 - 200, 350);
  }, 100);
  this.stop = true;
}


var canvas = document.getElementById('surface');
var ctx = canvas.getContext('2d');
var game = new FallingAsteroids();
var ASSET_MANAGER = new AssetManager();

ASSET_MANAGER.queueDownload('img/asteroidBig.png');
ASSET_MANAGER.queueDownload('img/asteroidSmall.png');
ASSET_MANAGER.queueDownload('img/enemyShip.png');
ASSET_MANAGER.queueDownload('img/laserGreen.png');
ASSET_MANAGER.queueDownload('img/laserGreenShot.png');
ASSET_MANAGER.queueDownload('img/laserRed.png');
ASSET_MANAGER.queueDownload('img/laserRedShot.png');
ASSET_MANAGER.queueDownload('img/life.png');
ASSET_MANAGER.queueDownload('img/player.png');
ASSET_MANAGER.queueSound('asteroid-boom', 'audio/asteroid_boom.mp3');
ASSET_MANAGER.queueSound('bullet', 'audio/bullet.mp3');
ASSET_MANAGER.queueSound('player-boom', 'audio/player_boom.mp3');

ASSET_MANAGER.downloadAll(function() {
  console.log('complete');
  game.init(ctx);
  game.start();
});