// This file is part of Seastorm
// Copyright 2014 Jakob Kallin

'use strict';

seastorm.AppController = function($scope) {
	$scope.model = {};
	$scope.model.loading = true;
	$scope.model.serverOnline = false;
	
	lookForServer();
	
	// Start loading the Seastorm library as soon as the application starts.
	seastorm.repyFiles = {};
	seastorm.repyPromise = Promise.all(
		['seastorm_repy_wrapper.repy', 'dylink.repy'].map(function(filename) {
			var request = seastorm.Request();
			request.open('GET', filename);
			return request.send().then(function() {
				seastorm.repyFiles[filename] = request.responseText;
			});
		})
	);
	
	$scope.visualize = function(trace) {
		var visualizerWindow = document.getElementById('visualizer-frame').contentWindow;
		visualizerWindow.postMessage(trace, location.origin);
	};
	
	$scope.visualizerIsAttached = true;
	window.addEventListener('message', function(event) {
		if ( event.origin !== location.origin ) {
			return;
		}
		
		$scope.$apply(function() {
			if ( event.data === 'detach' ) {
				$scope.visualizerIsAttached = false;
			}
			else if ( event.data === 'attach' ) {
				$scope.visualizerIsAttached = true;
			}
		});
	});
	
	function lookForServer() {
		var request = seastorm.Request();
		request.open('HEAD', 'http://localhost:5345/');
		request.send().then(function() {
			$scope.$apply(function() {
				$scope.model.loading = false;
				$scope.model.serverOnline = true;
			});
		})
		.catch(function() {
			$scope.$apply(function() {
				$scope.model.loading = false;
				$scope.model.serverOnline = false;
			});
			setTimeout(lookForServer, 1000);
		});
	}
};