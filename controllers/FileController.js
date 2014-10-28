// This file is part of Seastorm
// Copyright 2014 Jakob Kallin

'use strict';

seastorm.FileController = function($scope, externalFilesystem) {
	var selectedFilesystem = null;
	externalFilesystem.exists().then(function(exists) {
		$scope.$apply(function() {
			selectedFilesystem = exists ? filesystems.external : filesystems.internal;
			selectedFilesystem.start();
		});
	});
	
	window.addEventListener('beforeunload', function() {
		selectedFilesystem.stop();
	});
	
	$scope.model.files = [];
	
	var filesystems = {
		internal: {
			start: function() {
				$scope.removeFile = this.removeFile;
				$scope.selectFile = this.selectFile;
				$scope.addFile = this.addFile;
				
				if ( localStorage.files ) {
					$scope.model.files = JSON.parse(localStorage.files);
					$scope.selectFile($scope.model.files[0]);
				}
				else {
					var file = $scope.addFile();
					file.title = 'Example file';
					file.contents = 'An example file';
				}
			},
			
			stop: function() {
				localStorage.files = angular.toJson($scope.model.files);
			},
			
			removeFile: function(file) {
				var index = $scope.model.files.indexOf(file);
				$scope.model.files.splice(index, 1);
				
				// Remove the file from any vessels currently using it.
				$scope.model.programs.forEach(function(program) {
					if ( program.file === file ) {
						program.file = null;
					}
				});
				
				// Select the previous file if possible.
				var newFileIndex = Math.max(index - 1, 0);
				$scope.selectFile($scope.model.files[newFileIndex]); 
			},
			
			selectFile: function(file) {
				$scope.selectedFile = file || null;
			},
			
			addFile: function() {
				var newFile = {
					name: 'untitled.repy',
					contents: ''
				};
				$scope.model.files.push(newFile);
				$scope.selectedFile = newFile;
				
				return newFile;
			}
		},
		external: {
			start: function() {
				$scope.model.files = [];
				var fileTable = {};
				var eventSource = externalFilesystem.createEventSource();
				eventSource.onmessage = function(event) {
					var filename = event.data;
					if ( filename.match(/[^a-zA-Z-_.]/) || filename.match(/^\./) ) {
						console.log('File ignored due to name: ' + filename);
						return;
					}

					externalFilesystem.downloadFile(filename)
					.then(function(event) {
						$scope.$apply(function() {
							if ( filename in fileTable ) {
								var file = fileTable[filename];
							}
							else {
								var file = { name: filename };
								fileTable[filename] = file;
								$scope.model.files.push(file);
							}
							
							file.contents = event.target.responseText;
							file.date = new Date(event.timeStamp);
						});
					})
					.catch(function(event) {
						$scope.$apply(function() {
							var file = fileTable[filename];
							var index = $scope.model.files.indexOf(file);
							if ( index !== -1 ) {
								$scope.model.files.splice(index, 1);
							}
							delete fileTable[filename];
							
							// Remove the file from any vessels currently using it.
							$scope.model.programs.forEach(function(program) {
								if ( program.file === file ) {
									program.file = null;
								}
							});
						});
					});
				};
			},
			
			stop: function() {
				
			}
		}
	};
};