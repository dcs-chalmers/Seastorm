// This file is part of Seastorm
// Copyright 2014 Jakob Kallin

'use strict';

// This entire file, and related files, should be refactored to use much higher-
// level abstractions for asynchronous and parallel operations, because the
// current use of promises is verbose and error-prone.
seastorm.ProgramController = function(
	$scope,
	$rootScope,
	functional
) {
	var get = functional.get;
	var seattle = seastorm.seattle;
	
	$scope.model.error = null;
	function handleError(error) {
		$scope.model.error = error.message;
	}
	
	// This starts at null, because we want to distinguish between "no programs"
	// and "no programs loaded yet", so that we don't clear out saved data if
	// the user refreshes before programs have been loaded.
	$scope.model.programs = null;
	
	window.addEventListener('beforeunload', function() {
		savePrograms($scope.model.programs);
	});
	
	var unbind = $rootScope.$on('vesselsLoaded', function(event, vessels) {
		$scope.model.programs = loadPrograms(vessels, $scope.model.files);
	});
	$scope.$on('$destroy', unbind);
	
	$scope.model.progress = null;
	$scope.model.processIsStarting = false;
	Object.defineProperty($scope.model, 'monitorIsRunning', {
		get: function() {
			return Boolean(monitorHandle);
		}
	});
	
	$scope.start = function() {
		var programs = $scope.model.programs.filter(get('isActive'));
		resetVisualization(programs);
		return monitorPrograms(programs, $scope.model.files)
		.then(function() {
			$scope.$apply(function() {
				startPolling();
				programs.forEach(function(program) {
					program.status = 'Loading…';
				});
			});
		})
		.catch(function(error) {
			$scope.$apply(function() {
				$scope.model.progress = null;
				handleError(error);
			});
		});
	};
	
	var fileCache = {};
	var monitorHandle = null;
	function monitorPrograms(programs, files) {
		var vessels = programs.map(function(program) {
			return {
				ip: program.vessel.ip,
				port: program.vessel.port,
				name: program.vessel.name,
				userPort: program.vessel.userPort,
				startFile: program.file.name,
				args: program.args
			};
		});
		
		var userFiles = {};
		files.forEach(function(file) {
			userFiles[file.name] = file.contents;
		});
		
		$scope.model.progress = 0;
		return seastorm.monitor(vessels, userFiles, onMonitorStartProgress, fileCache)
		.then(function(handle) {
			$scope.$apply(function() {
				monitorHandle = handle;
				$scope.model.progress = null;
			});
		});
	}
	
	function onMonitorStartProgress(ratio) {
		$scope.$apply(function() {
			// Don't update if the progress is null, because that means an error
			// has occurred.
			if ( $scope.model.progress !== null ) {
				$scope.model.progress = ratio;
			}
		});
	}
	
	function resetVisualization(programs) {
		// First send a null visualization, in order to reset all the state.
		$scope.visualize(null);
		
		// Then create an empty trace for the vessels involved.
		var emptyTrace = {
			processes: {},
			events: []
		};
		programs.forEach(function(program) {
			emptyTrace.processes[seattle.vesselId(program.vessel)] = program.title;
		});
		$scope.visualize(emptyTrace);
	}
	
	var pollFrequency = 3000;
	var pollHandle = null;
	var isPolling = false;
	function startPolling() {
		isPolling = true;
		return poll().then(pollAfterDelay).catch(pollAfterDelay);
	}
	
	function poll() {
		return monitorHandle.poll().then(function(result) {
			$scope.$apply(function() {
				usePollResult(result);
			});
		});
	}
	
	function pollAfterDelay() {
		if ( isPolling ) {
			pollHandle = window.setTimeout(function() {
				poll().then(pollAfterDelay).catch(pollAfterDelay);
			}, pollFrequency);
		}
	}
	
	function usePollResult(result) {
		// Tables for visualizer data.
		var logs = {};
		var aliases = {};
		
		for ( var vesselId in result ) {
			// The program corresponding to this vessel ID.
			var program = _.find($scope.model.programs, function(p) {
				return seattle.vesselId(p.vessel) === vesselId;
			});
			
			// Data for user interface.
			program.status = result[vesselId].status;
			program.log = result[vesselId].repyLog;
			
			// Data for visualizer.
			logs[vesselId] = result[vesselId].seastormLog;
			aliases[vesselId] = program.title;
		}
		
		// Create trace and send to visualizer.
		var trace = seastorm.traceFromLogs(logs, aliases);
		addErrorsToTrace(trace);
		$scope.visualize(trace);
		
		// If the status of the vessel is "Terminated", add an error
		// event to the end of the vessel's timeline.
		function addErrorsToTrace(trace) {
			var errorEvents = [];
			$scope.model.programs.forEach(function(program) {
				if ( program.status === 'Terminated' ) {
					var exception = latestException(program.log);
					if ( exception ) {
						var id = seattle.vesselId(program.vessel);
						var programEvents = trace.events.filter(function(event) {
							return event.process === id;
						});
						var lastEvent = _.max(programEvents, function(event) {
							return event.time;
						});
						errorEvents.push({
							// Note that Underscore's `max` function returns
							// `-Infinity` when nothing is found.
							time: lastEvent === -Infinity ? 1 : lastEvent.time + 1,
							type: 'log',
							process: id,
							data: exception,
							title: 'Exception'
						});
					}
				}
			});
			
			errorEvents.sort(function(a, b) {
				return a.time - b.time;
			});
			errorEvents.forEach(function(event) {
				trace.events.push(event);
			});
		}
	}
	
	function latestException(log) {
		var exceptionHeader = '---\nUncaught exception!';
		var exceptionIndex = log.lastIndexOf(exceptionHeader);
		
		var startHeader = '========================================\nRunning program:';
		var startIndex = log.lastIndexOf(startHeader);
		
		if ( exceptionIndex > startIndex ) {
			return log.substring(exceptionIndex);
		}
		else {
			return null;
		}
	}
	
	$scope.stop = function() {
		// First stop the regular polling (so that polling is not performed
		// while the vessels are being stopped), then stop the vessels, then
		// poll one more time in order to get final data.
		window.clearTimeout(pollHandle);
		isPolling = false;
		return monitorHandle.cancel().then(poll).catch(function(error) {
			$scope.$apply(function() {
				handleError(error);
			});
		}).then(function() {
			$scope.$apply(function() {
				monitorHandle = null;
			});
		});
		// TODO: If a slow, regular poll is started right before the last, non-
		// regular poll, it's possible that the regular poll will complete after
		// the non-regular one, displaying incorrect final data. The sequential
		// nature of the node manager proxy makes this unlikely, but it could be
		// possible depending on how the browser sends the requests.
	};
	
	$scope.reset = function() {
		fileCache = {};
		var programs = $scope.model.programs.filter(get('isActive'));
		var vessels = programs.map(get('vessel'));
		var task = {
			progress: 0,
			length: programs.length * 2
		};
		$scope.model.progress = 0;
		
		return Promise.all(vessels.map(function(vessel) {
			var p = resetVessel(vessel);
			p.then(function() {
				$scope.$apply(function() {
					task.progress += 1;
					$scope.model.progress = task.progress / task.length;
				});
			});
			return p;
		}))
		.then(function() {
			return Promise.all(vessels.map(function(vessel) {
				var p = seattle.readVesselStatus(vessel);
				p.then(function() {
					$scope.$apply(function() {
						task.progress += 1;
						$scope.model.progress = task.progress / task.length;
					});
				});
				return p;
			}));
		})
		.then(function(statuses) {
			$scope.$apply(function() {
				statuses.forEach(function(status, index) {
					programs[index].status = status;
					$scope.model.progress = null;
				});
			});
		})
		.catch(function(error) {
			$scope.$apply(function() {
				handleError(error);
				$scope.model.progress = null;
			});
		});
	};
	
	function resetVessel(vessel) {
		return callVessel(vessel, 'ResetVessel', []);
	}
	
	function Program() {
		return {
			title: null,
			vessel: null,
			file: null,
			args: null,
			isActive: true,
			status: null,
			log: null
		};
	}
	
	function callVessel(vessel, methodName, args) {
		return seattle.call(vessel.ip, vessel.port, methodName, [vessel.name].concat(args));
	}
	
	function loadPrograms(vessels, files) {
		if ( localStorage.programs ) {
			var programs = JSON.parse(localStorage.programs);
		} else {
			programs = [];
		}
		
		return vessels.map(function(vessel, index) {
			if ( index < programs.length ) {
				var program = programs[index];
				program.vessel = vessel;
				program.file = files[program.file] || null;
				return program;
			}
			else {
				var program = Program();
				program.vessel = vessel;
				program.file = null;
			}
			
			return program;
		});
	}
	
	function savePrograms(programs) {
		// If no programs have been loaded yet, simply return, so that we don't
		// overwrite previous program data.
		if ( !programs ) {
			return;
		}
		
		var serialized = programs.map(function(program) {
			var copy = angular.copy(program);
			delete copy.vessel; // Vessel ID is now key in table instead.
			delete copy.status; // This depends on the actual vessel's state.
			delete copy.log; // This depends on the actual vessel's state.
			if ( program.file ) {
				// Find correct file based on index.
				copy.file = $scope.model.files.indexOf(program.file);
			}
			return copy;
		});
		
		localStorage.programs = angular.toJson(serialized);
	}
};