// This file is part of Seastorm
// Copyright 2014 Jakob Kallin

'use strict';

seastorm.ProcessButton = function($exceptionHandler) {
	return {
		restrict: 'E',
		scope: {
			startProcess: '=process',
			isBusy: '=busy',
			isDisabled: '=disabled'
		},
		templateUrl: 'directives/ProcessButton.html',
		replace: true,
		transclude: true,
		link: function(scope, $element, attrs) {
			scope.buttonType = 'submit' in attrs ? 'submit' : 'button';
			
			scope.start = function() {
				var promise = scope.startProcess();
				
				if ( !promise ) {
					throw new Error('Process "' + attrs.process + '" did not return promise as required.');
				}
				
				promise.then(function() {
					scope.$apply(function() {
						scope.isBusy = false;
					});
				})
				.catch(function(error) {
					scope.$apply(function() {
						scope.isBusy = false;
						$exceptionHandler(error);
					});
				});
				
				scope.isBusy = true;
			};
		}
	};
};