'use strict';

angular.module('myApp.view1', ['ngRoute'])
    .constant('_', window._)
    .config(['$routeProvider', function ($routeProvider) {
        $routeProvider.when('/view1', {
            templateUrl: 'view1/view1.html',
            controller: 'AudioCtrl'
        });
    }])
    .controller('AudioCtrl', ["$sce", "$http", "$scope", function ($sce, $http, $scope) {
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
        ctrl.nextVibe = null;

        this.config = {
            source1: [
                {
                    src: $sce.trustAsResourceUrl("http://static.videogular.com/assets/videos/videogular.mp4"),
                    type: "video/mp4"
                }
            ],
            source2: [
                {
                    src: $sce.trustAsResourceUrl("http://0.0.0.0:3000/Milky Chance - Stolen Dance (Alex Brandt's Saxual Edit).mp3"),
                    type: "audio/mp3"
                }
            ],
            theme: "bower_components/videogular-themes-default/videogular.css",
            plugins: {
                poster: "http://www.videogular.com/assets/images/videogular.png"
            }
        };

        ctrl.init = function () {
            var r = {playIndex: 0, tracks: []};
            var g = {playIndex: 0, tracks: []};
            var b = {playIndex: 0, tracks: []};
            ctrl.vibes = {"red": r, "green": g, "blue": b};

            ctrl.getTracklist("Moofi futures", r);
            ctrl.getTracklist("Neo Speakeasy", g);
            ctrl.getTracklist("Assorted Psychedelic", b);

        };

        ctrl.onPlayer1Ready = function (API) {
            ctrl.player1 = API;
            ctrl.player1.setVolume(1);
        };

        ctrl.onPlayer2Ready = function (API) {
            ctrl.player2 = API;
            ctrl.player2.setVolume(1);
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
            }
        };

        //HTTP Methods
        ctrl.getTracklist = function (listName, vibe) {
            var host = "http://localhost:3000/";
            $http.get(host + listName, {headers: "Accept:application/json"}).then(function (response) {
                var sourceList = [];

                _.forEach((response), function (value) {
                    sourceList.push({src: $sce.trustAsResourceUrl(host + value), type: "audio/mp3"});
                });

                _.shuffle(sourceList);

                vibe.tracks = sourceList;
            });
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

        ctrl.init();
    }]);