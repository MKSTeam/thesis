angular.module('utils.packetHandlers', ['utils.webRTC', 'utils.fileUpload', 'utils.linkGeneration'])


.factory('packetHandlers', ['webRTC', 'fileUpload', 'linkGeneration', function(webRTC, fileUpload, linkGeneration) {
  var packetHandlerObj = {};

  packetHandlerObj.accepted = function(data, conn, scope) {
    var fileKey = linkGeneration.fuid()

    scope.myItems.forEach(function(val) {
      if (val.name === data.name && val.size === data.size) {
        webRTC.sendDataInChunks(conn, {
          file: val,
          name: data.name,
          size: data.size,
          id: fileKey,
          scopeRef: scope
        });
      }
    })
  }

  packetHandlerObj.offer = function(data, conn) {
    var answer = confirm('do you wish to receive ' + data.name + "?");
    if (answer) {
      conn.send({
        name: data.name,
        size: data.size,
        type: 'file-accepted'
      });
    }
  }

  packetHandlerObj.chunk = function(data, scope) {
    var bar = document.getElementById('progressBar');
    if (data.count === 0) {
      scope.activeFileTransfers[data.id] = {
        buffer: [],
        id: data.id,
        name: data.name,
        size: data.size,
        progress: 0
      };
      bar.max = data.size;
    }
    var transferObj = scope.activeFileTransfers[data.id];
    transferObj.buffer[data.count] = data.chunk;
    transferObj.progress += 16348;
    bar.value = transferObj.progress;
    if (data.last) {
      console.log('last chunk', transferObj);
      var newFile = fileUpload.convertFromBinary({
        file: transferObj.buffer,
        name: transferObj.name,
        size: transferObj.size
      });
      scope.finishedTransfers.push(newFile);
      transferObj.buffer = [];
      var downloadAnchor = document.getElementById('fileLink');
      downloadAnchor.download = newFile.name;
      downloadAnchor.href = newFile.href;
    }
  }

  return packetHandlerObj;

}]);