// This file is part of Seastorm
// Copyright 2014 Jakob Kallin

'use strict';

angular.module('seastorm', [])

// Controllers
.controller('AppController', seastorm.AppController)
.controller('AuthController', seastorm.AuthController)
.controller('FileController', seastorm.FileController)
.controller('ProgramController', seastorm.ProgramController)

// Directives
.directive('seastormEditor', seastorm.Editor)
.directive('seastormProcessButton', seastorm.ProcessButton)
.directive('seastormTextButton', seastorm.TextButton)

// Services
.factory('clearinghouse', function() {
	return seastorm.clearinghouse;
})
// .factory('clearinghouse', function() {
// 	return seastorm.clearinghouseStub;
// })
.service('externalFilesystem', function() {
	return seastorm.ExternalFilesystem(5347);
})
.factory('functional', function() {
	return seastorm.functional;
})
.factory('Request', function() {
	return seastorm.Request;
})
.factory('seattle', function() {
	return seastorm.seattle;
})

.factory('$exceptionHandler', function() {
	return function(error, cause) {
		alert(error.message);
	};
})