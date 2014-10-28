// This file is part of Seastorm
// Copyright 2014 Jakob Kallin

'use strict';

// Without full support for proxies (which are coming to JavaScript), we will
// have to allow only a select group of methods. This may not be as concise and
// flexible, but it should only be a problem if the Clearinghouse API changes.
seastorm.XmlRpcClient = function(url, methodNames) {
	var client = {};
	
	methodNames.forEach(function(methodName) {
		client[methodName] = Method(methodName);
	});
	
	return client;
	
	function Method(name) {
		return function() {
			var params = [].slice.call(arguments);
			var dom = seastorm.xmlRpcSerialize(name, params);
			var xml = (new XMLSerializer()).serializeToString(dom);
			
			var request = seastorm.Request();
			request.open('POST', url);
			request.setRequestHeader('Content-Type', 'text/xml');
			
			return request.send(xml)
			.then(function(event) {
				var dom = event.target.responseXML;
				var value = seastorm.xmlRpcParse(dom);
				if ( value instanceof Error ) {
					throw new Error(value.message);
				} else {
					return value;
				}
			});
		};
	}
};