// This file is part of Seastorm
// Copyright 2014 Jakob Kallin

'use strict';

seastorm.AuthController = function($scope, $rootScope, $exceptionHandler, clearinghouse, externalFilesystem) {
	function start() {
		if ( localStorage.credentials ) {
			$scope.model.credentials = JSON.parse(localStorage.credentials);
		} else {
			$scope.model.credentials = {
				username: '',
				apiKey: ''
			};
		}
		
		$scope.model.login = {
			inProgress: false,
			successful: false
		}
	}
	
	$scope.login = function() {
		return Promise.all([
			seastorm.repyPromise,
			externalFilesystem.exists().then(function(exists) {
				$scope.$apply(function() {
					$scope.model.filesystemEventSource = exists;
				});
			}),
			clearinghouse.loadVessels(
				$scope.model.credentials.username,
				$scope.model.credentials.apiKey
			)
			.then(function(vessels) {
				$scope.$apply(function() {
					$rootScope.$emit('vesselsLoaded', vessels);
				});
			})
		])
		.then(function() {
			$scope.$apply(function() {
				$scope.model.login.successful = true;
			});
		})
		.catch($exceptionHandler);
	};
	
	start();
	window.addEventListener('beforeunload', function() {
		localStorage.credentials = angular.toJson($scope.model.credentials);
	});
};