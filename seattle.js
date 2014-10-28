// This file is part of Seastorm
// Copyright 2014 Jakob Kallin

'use strict';

seastorm.seattle = {
	call: (function() {
		// This table keeps track of which parameter names to use for an API call.
		var signatures = {
			'GetVessels': [],
			'AddFileToVessel': ['vesselname', 'filename', 'filedata'],
			'ReadVesselLog': ['vesselname'],
			'RetrieveFileFromVessel': ['vesselname', 'filename'],
			'ResetVessel': ['vesselname'],
			'StartVessel': ['vesselname', 'args'],
			'StartVesselEx': ['vesselname', 'program_platform', 'args'],
			'StopVessel': ['vesselname']
		};
		
		return function(ip, port, methodName, argValues) {
			if ( !(methodName in signatures) ) {
				throw new Error(
					'Method ' + methodName + ' does not exist or is not supported.'
				);
			}
			
			var argNames = signatures[methodName];
			if ( argNames.length !== argValues.length ) {
				throw new Error(
					'Incorrect number of arguments given to ' + methodName + ': ' +
					argValues.length + ' instead of ' + argNames.length
				);
			}
			
			var params = objectFromLists(argNames, argValues);
			var url = createUrl(ip, port, methodName);
			
			var request = new seastorm.Request();
			request.open('POST', url);
			
			request.setRequestHeader('Content-Type', 'application/json');
			var body = JSON.stringify(params);
			
			return request.send(body)
			.then(function(event) {
				return event.target.responseText;
			});
		};
		
		function createUrl(nodeManagerIp, nodeManagerPort, methodName) {
			// Should we validate the IP and name here?
			var path =
				[nodeManagerIp, nodeManagerPort, methodName]
				.map(encodeURIComponent)
				.join('/');
			return 'http://localhost:5345/' + path;
		}
		
		// Before: ['a', 'b', 'c'], [1, 2, 3]
		// After: { a: 1, b: 2, c: 3 }
		function objectFromLists(keys, values) {
			if ( keys.length !== values.length ) {
				throw new Error("Keys and values are not same length.");
			}
			
			var object = {};
			values.forEach(function(value, index) {
				var key = keys[index];
				object[key] = value;
			});
			return object;
		}
	})(),
	
	readVesselStatus: function(vessel) {
		return seastorm.seattle.call(vessel.ip, vessel.port, 'GetVessels', [])
		.then(function(string) {
			var statuses = seastorm.seattle.parseVesselStatus(string);
			return statuses[vessel.name];
		})
		.catch(function() {
			return null;
		});
	},
	
	parseVesselStatus: function(nodeString) {
		var vesselStrings = nodeString.split('Name: ').slice(1);
		var result = {};
		vesselStrings.forEach(function(string) {
			var name = string.match(/^(.*)\n/)[1];
			var status = string.match(/Status: (.*)\n/)[1];
			result[name] = status;
		});
		return result;
	},
	
	vesselId: function(vessel) {
		return vessel.ip;
	}
};