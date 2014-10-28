// This file is part of Seastorm
// Copyright 2014 Jakob Kallin

'use strict';

seastorm.functional = {
	get: function(property) {
		return function(object) {
			return object[property];
		};
	},
	invoke: function(property) {
		return function(object) {
			return object[property]();
		}
	},
	zip: function(mapping) {
		var zipList = [];
		for ( var property in mapping ) {
			var list = mapping[property];
			list.forEach(function(value, index) {
				if ( index >= zipList.length ) {
					zipList[index] = {};
				}
				var object = zipList[index];
				object[property] = value;
			});
		}
		return zipList;
	}
};