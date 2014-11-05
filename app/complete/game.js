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
  
  //this.downloadSounds(callback);
  
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
      that.loop();
      requestAnimFrame(gameLoop, that.ctx.canvas);
  })();
}

GameEngine.prototype.startInput = function () {
  
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
  // if (this.game.showOutlines && this.radius) {
  //   ctx.beginPath();
  //   ctx.strokeStyle = "green";
  //   ctx.arc(this.x, this.y, this.radius, 0, Math.PI*2, false);
  //   ctx.stroke();
  //   ctx.closePath();
  // }
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
  Entity.call(this, game, game.surfaceWidth/2, game.surfaceHeight - asset.height - 5);
  this.sprite = asset;
}
Player.prototype = new Entity();
Player.prototype.constructor = Player;

Player.prototype.update = function () {
  Entity.prototype.update.call(this);
}

Player.prototype.draw = function (ctx) {
  this.drawSpriteCentered(ctx);
  Entity.prototype.draw.call(this, ctx);
}

Player.prototype.shoot = function () {
  
}



var canvas = document.getElementById('surface');
var ctx = canvas.getContext('2d');
var game = null;
var ASSET_MANAGER = new AssetManager();

ASSET_MANAGER.queueDownload('img/enemyShip.png');
ASSET_MANAGER.queueDownload('img/laserGreen.png');
ASSET_MANAGER.queueDownload('img/laserGreenShot.png');
ASSET_MANAGER.queueDownload('img/laserRed.png');
ASSET_MANAGER.queueDownload('img/laserRedShot.png');
ASSET_MANAGER.queueDownload('img/life.png');
ASSET_MANAGER.queueDownload('img/player.png');

ASSET_MANAGER.downloadAll(function() {
  console.log('complete');
  //game.init(ctx);
  //game.start();
});