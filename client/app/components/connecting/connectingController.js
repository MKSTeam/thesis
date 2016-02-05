angular.module('connecting', [
  'utils'
])

.controller('connectingController', [
  '$scope',
  '$http',
  '$stateParams',
  '$rootScope',
  'fileTransfer',
  'webRTC',
  'packetHandlers',
  'fileUpload',
  'modals',
  'linkGeneration',
  function($scope, $http, $stateParams, $rootScope, fileTransfer, webRTC, packetHandlers, fileUpload, modals, linkGeneration) {
    console.log('connecting controller loaded');
    /**
     * if arriving from redirect,
     * sender has access to their own peer object,
     * becasue it's on the fileTransfer
     *
     * if arriving from a link,
     * follow the code below:
     */
    var savedClasses = 'btn btn-circle lightningHover';

    $('#lightningBoltButton').mouseenter(function() {
      savedClasses = $('#lightningBoltButton').attr('class');
      $('#lightningBoltButton').attr('class', 'btn btn-circle lightningHover');
    });

    $('#lightningBoltButton').mouseleave(function() {
      $('#lightningBoltButton').attr('class', savedClasses)
      savedClasses = 'btn btn-circle lightningHover';
    });


    $scope.openModal = modals.openModal;
     
    $('#lightningBoltButton').on('click', function() {
      linkGeneration.copyToClipboard(document.getElementById("currentUrl"));
      if (!savedClasses.includes('connectedToPeer')) {
        if (window.location.href.includes('/room/')) {
          savedClasses = 'btn btn-circle lightningHover waitingForConnection';
        }
      }
    });

    $('.currentUrlShow').removeClass('currentUrlHidden');

    setTimeout(function() {
      currentUrl.innerHTML = window.location.href;

    }, 0);

    var disconnectingReceiverId = null;

    $scope.incomingFileTransfers = fileTransfer.incomingFileTransfers;
    $scope.outgoingFileTransfers = fileTransfer.outgoingFileTransfers;
    $scope.acceptFileOffer = fileUpload.acceptFileOffer;
    $scope.rejectFileOffer = fileUpload.rejectFileOffer;
    $scope.offers = fileTransfer.offers;
    console.log('connecting scope', $scope.offers);

    if (!fileTransfer.peer) {
      $('#lightningBoltButton').addClass('waitingForConnection');
      fileTransfer.myItems = [];

      fileTransfer.conn = [];

      fileTransfer.peer = webRTC.createPeer();

      fileTransfer.peer.on('open', function(id) {
        disconnectingReceiverId = id;
        $('.currentConnectionState').text('Connecting...');
        $http({
            method: 'POST',
            url: '/api/webrtc/users',
            data: {
              hash: $stateParams.roomHash,
              recipientId: id
            }
          })
          .then(function(res) {
            // expect res.data === sender id
            var conn = fileTransfer.peer.connect(res.data.senderID);
            fileTransfer.conn.push(conn);
            conn.on('data', function(data) {
              console.log('incoming packet');
              $('#lightningBoltButton').addClass('connectedToPeer');
              $('.currentConnectionState').text('Connected!');
              if (data.type === 'file-accepted') {
                packetHandlers.accepted(data, conn, $rootScope);
              } else if (data.type === 'file-offer') {
                packetHandlers.offer(data, conn, $rootScope);
              } else if (data.type === 'file-chunk') {
                packetHandlers.chunk(data, $rootScope);
              }
            });
          });
      });

      window.onbeforeunload = function(e) {
        //stops notification from showing
        e.preventDefault();
      };

      window.addEventListener('beforeunload', function() {
        $http({
          method: 'POST',
          url: '/api/webrtc/deleteReceiverId',
          data: {
            hash: $stateParams.roomHash,
            id: disconnectingReceiverId
          }
        });
      });

      document.getElementById('filesId').addEventListener('change', function() {
        console.log('connecting input listener');
        var files = this.files;
        for (var i = 0; i < files.length; i++) {
          if (fileTransfer.myItems.indexOf(files[i]) > -1) {
            continue;
          }
          files[i].beenSent = false;
          fileTransfer.myItems.push(files[i]);
        }
        fileTransfer.conn.forEach(function(connection) {
          webRTC.clearQueue(fileTransfer.myItems, connection);
        });
        //TODO: send files back

      });
    }

  }
]);
