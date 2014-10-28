// This file is part of Seastorm
// Copyright 2014 Jakob Kallin

'use strict';

seastorm.LineFor = function($rootScope) {
	return {
		restrict: 'A',
		link: function(scope, $source, attrs) {
			setTimeout(function() {
				var source = $source[0];
				var event = scope.$eval(attrs.seastormLineFor);
				
				if ( event.type !== 'send' ) {
					return;
				}
				
				if ( event.arrival ) {
					var target = document.getElementById('event-' + event.arrival.number);
					var broken = false;
				} else {
					var id = 'event-slot-' + event.recipient.number + '-' + event.number;
					var target = document.getElementById(id);
					var broken = true;
				}
				
				if ( target && source ) {
					var line = seastorm.LineBetween(source, target, broken);
					window.addEventListener('resize', line.update);
					
					// Below, we update the arrow whenever they need to change
					// without a resize event taking place. We do this by
					// broadcasting an `updateArrows` event on the root scope.
					// This is not elegant at all, but how can it be done better
					// in Angular, or in JavaScript/DOM at all? As far as I
					// know, there is no "element changed dimensions" event to
					// hook into, so it doesn't seem feasible to keep everything
					// completely inside the directive.
					
					// Note that we use `setTimeout` below to make sure that the
					// source and target elements have "stabilized" before we
					// reposition the arrow between them.
					$rootScope.$on('updateArrows', setTimeout.bind(window, line.update, 0));
				}
			}, 0);
		}
	};
};