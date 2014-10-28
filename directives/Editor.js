// This file is part of Seastorm
// Copyright 2014 Jakob Kallin

'use strict';

seastorm.Editor = function() {
	var editorCount = 0;
	
	return {
		restrict: 'E',
		// The CSS below overrides the hardcoded Ace font size.
		template: '<div class="editor" style="font-size: 1rem !important"></div>',
		replace: true,
		require: 'ngModel',
		link: function(scope, $element, attrs, ngModel) {
			var element = $element[0];
			
			var editor = ace.edit(element);
			editor.setTheme('ace/theme/monokai');
			
			var session = editor.getSession();
			session.setMode('ace/mode/python');
			session.setNewLineMode('unix');
			session.setTabSize(2);
			session.setUseSoftTabs(true);
			
			setTimeout(function() {
				session.on('change', function() {
					var value = session.getValue();
					scope.$apply(function() {
						ngModel.$setViewValue(value);
					});
				});
			}, 0);
			
			ngModel.$render = function() {
				session.setValue(ngModel.$viewValue);
			};
		}
	}
};