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

var canvas = document.getElementById('surface');
var ctx = canvas.getContext('2d');
var ASSET_MANAGER = new AssetManager();

ASSET_MANAGER.queueDownload('img/player.png');

ASSET_MANAGER.downloadAll(function () {
  var x = 435, y = 642;
  var sprite = ASSET_MANAGER.getAsset('img/player.png');
  
  // draw image centered
  ctx.drawImage(sprite, x - sprite.width/2, y - sprite.height/2);
});

