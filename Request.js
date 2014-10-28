// This file is part of Seastorm
// Copyright 2014 Jakob Kallin

'use strict';

seastorm.Request = function() {
	var request = new XMLHttpRequest();
	var wrapper = Object.create(request);
	
	wrapper.send = function() {
		// Arguments inside the promise refers to `resolve` and `reject`, so we
		// need to store the arguments to `send` here.
		var args = arguments;
		return new Promise(function(resolve, reject) {
			request.addEventListener('load', function(event) {
				if ( request.status === 200 ) {
					resolve(event);
				} else {
					// Disregard other non-failure codes for now.
					reject(new Error(request.status + ': ' + request.responseText));
				}
			});
			
			request.addEventListener('abort', rejectWith('The request was aborted.'));
			request.addEventListener('error', rejectWith('Request error.'));
			request.addEventListener('timeout', rejectWith('The request timed out.'));
			
			request.send.apply(request, args);
			
			function rejectWith(message) {
				return function() {
					reject(new Error(message));
				};
			}
		});
	};
	
	// Metaprogramming is difficult with host objects, which are quite
	// particular about how they can be called. This object should wrap all of
	// the functionality provided by XMLHttpRequest, but for now we're keeping
	// it simple to avoid issues. It should also be noted that there seems to be
	// a different set of issues depending on which browser is used.
	wrapper.open = function(a, b) {
		return request.open(a, b);
	};
	
	wrapper.setRequestHeader = function(a, b) {
		return request.setRequestHeader(a, b);
	};
	
	Object.defineProperty(wrapper, 'responseText', {
		get: function() {
			return request.responseText;
		}
	});
	
	return wrapper;
};