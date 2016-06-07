'use strict';

angular.module('myApp.view1', ['ngRoute', 'ngLodash'])
    .config(['$routeProvider', function ($routeProvider) {
        $routeProvider.when('/view1', {
            templateUrl: 'view1/view1.html',
            controller: 'AudioCtrl'
        });
    }])
    .controller('AudioCtrl', ["$sce", "$http", "$scope", "$q", "$log", "lodash", function ($sce, $http, $scope, $q, $log, _) {
        var ctrl = this;
        ctrl.player1 = null;
        ctrl.player2 = null;
        ctrl.stateCheckTime = 30; //Ask for Habitat state starting @ 30 seconds from end of track
        ctrl.fadeTime = 15; //Begin crossfading @ 15 seconds
        ctrl.color = [0, 0, 0];
        ctrl.lockState = false; //True: Currently looking or have found Habitat State. Reset when tracks transition
        ctrl.fadeIn = null;
        ctrl.fadeOut = null;
        ctrl.vibes = null;
        ctrl.currentVibe = null;
        ctrl.nextVibe = null;

        this.config = {
            theme: "bower_components/videogular-themes-default/videogular.css",
            plugins: {
                poster: "http://www.videogular.com/assets/images/videogular.png"
            }
        };

        ctrl.init = function () {
            $log.log("Getting TrackLists");
            $q.all([

                ctrl.getTracklist("Moofi Futures"),
                ctrl.getTracklist("Neo Speakeasy"),
                ctrl.getTracklist("Space Beats")
            ]).then(function (trackSources) {
                $log.log("Tracks loaded!");
                $log.log(trackSources);
                var r = {playIndex: 0, tracks: trackSources[0]};
                var g = {playIndex: 0, tracks: trackSources[1]};
                var b = {playIndex: 0, tracks: trackSources[2]};
                ctrl.vibes = {"red": r, "green": g, "blue": b};
                ctrl.currentVibe = ctrl.randomVibe();
                $log.log("Current Vibe:");
                $log.log(ctrl.currentVibe);
                ctrl.player1.stop();

                $log.log(ctrl.currentVibe.tracks[ctrl.currentVibe.playIndex].sources);
                ctrl.config.source1 = ctrl.currentVibe.tracks[ctrl.currentVibe.playIndex].sources;


            }, function (reason) {
                // Error callback where reason is the value of the first rejected promise
                $log.error("Could not Load Tracks: did you host the right directory?");
                $log.error(reason);
            });
        };

        ctrl.onPlayer1Ready = function (API) {
            ctrl.player1 = API;
            ctrl.player1.setVolume(1);
            $log.log("player1 ready");
        };

        ctrl.onPlayer2Ready = function (API) {
            ctrl.player2 = API;
            ctrl.player2.setVolume(1);
            $log.log("player2 ready");
            ctrl.init();
        };

        ctrl.onTick = function (currentTime, duration) {
            var remaining = duration - currentTime;

            if (remaining <= ctrl.stateCheckTime && !ctrl.lockState) {
                ctrl.getVibe();
            }

            if (remaining <= ctrl.fadeTime && remaining > 0) {
                ctrl.crossfade(remaining);
            }
        };

        ctrl.crossfade = function (remaining) {
            if (ctrl.player1.currentState != "play") {
                ctrl.player1.setVolume(0);
                ctrl.player1.changeSource(ctrl.nextVibe.tracks);
                ctrl.player1.play();
                ctrl.fadeIn = ctrl.player1;
                ctrl.fadeOut = ctrl.player2;
            }

            if (ctrl.player2.currentState != "play") {
                ctrl.player2.setVolume(0);
                ctrl.player2.changeSource(ctrl.nextVibe.tracks);
                ctrl.player2.play();
                ctrl.fadeIn = ctrl.player2;
                ctrl.fadeOut = ctrl.player1;
            }

            ctrl.fadeIn.setVolume(1 - remaining / ctrl.fadeTime);
            ctrl.fadeOut.setVolume(remaining / ctrl.fadeTime);

        };

        ctrl.onComplete = function () {
            if (ctrl.fadeIn != null & ctrl.fadeOut != null) {
                ctrl.fadeIn.setVolume(1);
                ctrl.fadeOut.setVolume(0);
                ctrl.fadeOut.stop();
                ctrl.fadeIn = null;
                ctrl.fadeOut = null;
                ctrl.lockState = false;
                $log.log("Track Completed");
            }
        };


        /*
         * Combines multiple promises into a single promise
         * that will be resolved when all of the input promises are resolved
         */


        //HTTP Methods
        ctrl.getTracklist = function (listName) {
            var deferred = $q.defer();
            var trackRoot = "http://localhost:3000/" + listName + "/";

            $http.get(trackRoot, {headers: {'Accept': 'application/json'}}).then(function (response) {
                var sourceList = [];

                _.forEach((response.data), function (track) {
                    sourceList.push({
                        sources: [{
                            src: $sce.trustAsResourceUrl(trackRoot + track),
                            type: "audio/mp3"
                        }]
                    });
                });

                deferred.resolve(_.shuffle(sourceList));
            }, function (response) {
                deferred.reject(response);
            });

            return deferred.promise;
        };

        ctrl.getVibe = function () {
            ctrl.lockVibe = true;
            var uri = "http://habitat.local/vibe";
            $http.get(uri).then(function (response) {
                    ctrl.nextVibe = ctrl.vibes[response];
                },
                function (error) {
                    ctrl.nextVibe = ctrl.randomVibe();
                }
            );
        };

        ctrl.randomVibe = function () {
            var keys = Object.keys(ctrl.vibes);
            var key = keys[Math.floor((Math.random() * keys.length))];
            return ctrl.vibes[key];
        };


    }]);