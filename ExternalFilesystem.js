// This file is part of Seastorm
// Copyright 2014 Jakob Kallin

'use strict';

seastorm.ExternalFilesystem = function(port) {
	var url = 'http://localhost:' + Number(port) + '/';
	
	return {
		exists: (function() {
			var request = seastorm.Request();
			request.open('HEAD', url);
			var promise = request.send().then(true).catch(function() {
				return false;
			});
			
			return function() {
				return promise;
			}
		})(),
		createEventSource: function() {
			return new EventSource(url);
		},
		downloadFile: function(filename) {
			var request = seastorm.Request();
			request.open('GET', url + filename);
			return request.send();
		}
	};
};