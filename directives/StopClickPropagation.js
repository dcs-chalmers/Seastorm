// This file is part of Seastorm
// Copyright 2014 Jakob Kallin

'use strict';

seastorm.StopClickPropagation = function() {
	return {
		restrict: 'A',
		link: function(scope, $element, attrs) {
			var element = $element[0];
			element.addEventListener('click', function(event) {
				event.stopPropagation();
			});
		}
	};
};