window.requestAnimFrame = (function(){
    return  window.requestAnimationFrame       ||
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
}

AssetManager.prototype.queueDownload = function (path) {
  this.downloadQueue.push(path);
}

AssetManager.prototype.isDone = function () {
  return (this.downloadQueue.length == this.successCount + this.errorCount);
}

AssetManager.prototype.downloadAll = function (callback) {
  for (var i = 0; i < this.downloadQueue.length; i++) {
    var path = this.downloadQueue[i];
    var img = new Image();
    var that = this;
    img.addEventListener("load", function () {
      that.successCount += 1;
      if (that.isDone()) { callback(); }
    });
    img.addEventListener("error", function () {
      that.errorCount += 1;
      if (that.isDone()) { callback(); }
    });
    img.src = path;
    this.cache[path] = img;
  }
}

AssetManager.prototype.getAsset = function (path) {
  return this.cache[path];
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
  this.ctx = null;
  this.lastUpdateTimestamp = null;
  this.timer = new Timer();
  this.surfaceWidth = null;
  this.surfaceHeight = null;
  this.halfSurfaceWidth = null;
  this.halfSurfaceHeight = null;
  this.startInput();
}

GameEngine.prototype.init = function (ctx) {
  console.log('game initialized');
  this.ctx = ctx;
  this.surfaceWidth = this.ctx.canvas.width;
  this.surfaceHeight = this.ctx.canvas.height;
  this.halfSurfaceWidth = this.surfaceWidth/2;
  this.halfSurfaceHeight = this.surfaceHeight/2;
}

GameEngine.prototype.start = function() {
  var that = this;
  (function gameLoop() {
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
}

GameEngine.prototype.addEntity = function (entity) {
  this.entities.push(entity);
}

GameEngine.prototype.draw = function(callback) {
  this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
  for (var i = 0; i < this.entities.length; i++) {
    this.entities[i].draw(this.ctx);
  }
  if (callback) {
    callback(this);
  }
}

GameEngine.prototype.update = function() {
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

GameEngine.prototype.loop = function() {
  this.clockTick = this.timer.tick();
  this.update();
  this.draw();
  this.key = null;
}

function Entity(game, x, y) {
  this.game = game;
  this.x = x;
  this.y = y;
  this.removeFromWorld = false;
}

Entity.prototype.update = function() {}

Entity.prototype.draw = function() {}

Entity.prototype.drawSpriteCentered = function(ctx) {
  if (this.sprite && this.x && this.y) {
    var x = this.x - this.sprite.width/2;
    var y = this.y - this.sprite.height/2;
    ctx.drawImage(this.sprite, x, y);
  }
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
    this.x -= this.speed;
  } else if (key === RIGHT) {
    this.x += this.speed;
  }
  if (this.x - this.sprite.width / 2 < 0) {
    this.x = 1 + this.sprite.width / 2;
  }
  if (this.x + this.sprite.width / 2 > this.game.surfaceWidth) {
    this.x = this.game.surfaceWidth - 1 - this.sprite.width / 2;
  }
  Entity.prototype.update.call(this);
}

Player.prototype.draw = function (ctx) {
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
  this.x = x || getRandom(0, this.game.surfaceWidth);
  this.y = y || -this.sprite.height;
  this.m = m || getRandom(1, 5);
  if (this.x > this.game.surfaceWidth/2) this.m *= -1;
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
  }
  Entity.prototype.update.call(this);
}

Asteroid.prototype.outsideScreen = function () {
  return (this.x > this.game.surfaceWidth || this.x < 0 ||
    this.y > this.game.surfaceHeight);
}

function FallingAsteroids() {
  GameEngine.call(this);
}
FallingAsteroids.prototype = new GameEngine();
FallingAsteroids.prototype.constructor = FallingAsteroids;

FallingAsteroids.prototype.start = function () {
  this.player = new Player(this);
  this.addEntity(this.player);
  GameEngine.prototype.start.call(this);
}

FallingAsteroids.prototype.update = function () {
  if (this.lastAsteroidAddedAt == null || (this.timer.gameTime - this.lastAsteroidAddedAt) > 1.5) {
    this.addEntity(new Asteroid(this, getRandom(1, 10) > 5));
    this.lastAsteroidAddedAt = this.timer.gameTime;
  }
  GameEngine.prototype.update.call(this);
}

FallingAsteroids.prototype.draw = function () {
  GameEngine.prototype.draw.call(this);
}

var canvas = document.getElementById('surface');
var ctx = canvas.getContext('2d');
var game = new FallingAsteroids();
var ASSET_MANAGER = new AssetManager();

ASSET_MANAGER.queueDownload('img/asteroidBig.png');
ASSET_MANAGER.queueDownload('img/asteroidSmall.png');
ASSET_MANAGER.queueDownload('img/player.png');

ASSET_MANAGER.downloadAll(function () {
  game.init(ctx);
  game.start();
});