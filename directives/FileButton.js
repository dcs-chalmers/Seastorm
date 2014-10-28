// This file is part of Seastorm
// Copyright 2014 Jakob Kallin

'use strict';

seastorm.FileButton = function() {
	return {
		restrict: 'E',
		template: '<button type="button" data-ng-click="showDialog()" data-ng-transclude></button>',
		transclude: true,
		replace: true,
		scope: true,
		require: 'ngModel',
		link: function(scope, $element, attrs, ngModel) {
			scope.showDialog = function() {
				var input = document.createElement('input');
				input.type = 'file';

				input.addEventListener('change', function() {
					if ( input.files.length > 0 ) {
						var file = input.files[0];
						var reader = new FileReader();
						reader.addEventListener('load', function() {
							var contents = reader.result;
							scope.$apply(function() {
								ngModel.$setViewValue(contents);
							});
						});
						reader.readAsText(file);
					}
				});

				input.click();
			};
		}
	};
};