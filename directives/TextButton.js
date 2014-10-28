// This file is part of Seastorm
// Copyright 2014 Jakob Kallin

'use strict';

seastorm.TextButton = function() {
	return {
		restrict: 'E',
		template:
			// We hardcode the `display` property because the user should not
			// need to know that a form is automatically inserted.
			'<form style="display: inline-block">' +
				'<button type="button" data-ng-transclude></button>' +
				'<input type="text" data-ng-model="ngModel">' +
			'</form>',
		replace: true,
		transclude: true,
		scope: {
			ngModel: '=ngModel',
			active: '=seastormActive'
		},
		link: function(scope, $form, attrs) {
			var form = $form[0];
			var button = form.querySelector('button');
			var input = form.querySelector('input');
			
			// We set visibility inside a watch instead of "show" and "hide"
			// directives because the directives take effect before the watch,
			// so we are not able to observe the width of the button before it's
			// hidden. Adding a click listener only works when a click activates
			// the input, but it can also be activated by a change to the
			// "active-when" attribute.
			scope.$watch('active', function(active) {
				if ( active ) {
					input.style.width = button.offsetWidth + 'px';
					button.style.display = 'none';
					input.style.display = '';
					
					// We must do this after Angular applies its own DOM
					// transformations.
					setTimeout(function() {
						input.focus();
						input.select();
					}, 0);
				} else {
					button.style.display = '';
					input.style.display = 'none';
				}
			});
			
			button.addEventListener('click', function(event) {
				scope.$apply(function() { scope.active = true; });
			});

			input.addEventListener('blur', function(event) {
				scope.$apply(function() { scope.active = false; });
			});
			
			form.addEventListener('submit', function(event) {
				scope.$apply(function() { scope.active = false; });
			});
		}
	};
};