// This file is part of Seastorm
// Copyright 2014 Jakob Kallin

'use strict';

angular.module('visualizer', [])

.directive('seastormFileButton', seastorm.FileButton)
.directive('seastormLineFor', seastorm.LineFor)
.directive('seastormStopClickPropagation', seastorm.StopClickPropagation)

.controller('Controller', function($scope, $rootScope) {
	window.addEventListener('message', function(event) {
		if ( event.origin !== location.origin ) {
			return;
		}
		
		$scope.$apply(function() {
			$scope.visualize(event.data);
		});
	});
	
	function resetState() {
		$scope.focus = {
			event: null
		};
		
		$scope.selected = {
			event: null
		};
		
		// Store the latest trace so that we can send it to the new window when we
		// detach/reattach the visualizer.
		$scope.trace = {
			processes: {},
			events: []
		};
		$scope.data = parseTrace($scope.trace);
	}
	resetState();
	
	$scope.maxZoom = 16;
	$scope.minZoom = 2;
	$scope.zoom = $scope.maxZoom;
	$scope.updateArrows = function() {
		// Not very elegant; see comment in `lineTo` directive.
		$rootScope.$broadcast('updateArrows');
	};
	
	$scope.zoomIn = function() {
		$scope.zoom = Math.min($scope.maxZoom, $scope.zoom + 1);
		$scope.updateArrows();
	};
	
	$scope.zoomOut = function() {
		$scope.zoom = Math.max($scope.minZoom, $scope.zoom - 1);
		$scope.updateArrows();
	};
	
	$scope.eventIsSelected = function(event) {
		return (
			$scope.selected.event === event ||
			(event.otherEvent && $scope.selected.event === event.otherEvent)
		);
	};
	
	$scope.eventHasFocus = function(event) {
		return (
			$scope.focus.event === event ||
			(event.otherEvent && $scope.focus.event === event.otherEvent)
		);
	};
	
	$scope.eventHasError = function(event) {
		return event.type !== 'log' && event.otherEvent === null;
	};
	
	function parseTrace(trace) {
		var ordering = seastorm.orderingFromTrace(trace);
		
		// A list of processes is used in order to display them in the correct
		// order.
		var processList = [];
		
		// A table of processes is used in order to be able to look up processes
		// based on their ID.
		var processTable = {};
		
		for ( var id in ordering.processes ) {
			var name = ordering.processes[id];
			var process = { id: id, name: name };
			processList.push(process);
			processTable[id] = process;
		}
		
		processList.sort(function(a, b) {
			return a.id - b.id;
		});
		
		processList.forEach(function(process, index) {
			process.number = index;
		});
		
		ordering.events.forEach(function(event, index) {
			// Replace the departure and arrival event indexes with the actual
			// departure and arrival event objects.
			if ( 'departure' in event ) {
				event.departure = ordering.events[event.departure];
			}
			
			if ( 'arrival' in event ) {
				event.arrival = ordering.events[event.arrival];
			}
			
			event.title = event.title || event.data;
			event.process = processTable[event.process];
			event.number = index;
			event.otherEvent = event.departure || event.arrival || null;
			
			if ( event.type === 'send' ) {
				event.recipient = processTable[event.recipient];
			}
		});
		
		return {
			processes: processList,
			events: ordering.events
		};
	}

	$scope.visualize = function(trace) {
		if ( trace ) {
			$scope.trace = trace;
			$scope.data = parseTrace(trace);
			// Selection is based on object references, and all object
			// references are replaced when a new trace is visualized, so let's
			// select the object references with the same event number in the
			// new trace. Likewise for focus.
			updateSelection();
			updateFocus();
		}
		else {
			resetState();
		}
	};
	
	function updateSelection() {
		if ( !$scope.selected.event ) {
			return;
		}
		
		$scope.selected.event = _.findWhere(
			$scope.data.events,
			{ number: $scope.selected.event.number }
		);
	}
	
	function updateFocus() {
		if ( !$scope.focus.event ) {
			return;
		}
		
		$scope.focus.event = _.findWhere(
			$scope.data.events,
			{ number: $scope.focus.event.number }
		);
	}
	
	$scope.traceFile = null;
	$scope.visualizeFile = function(contents) {
		var trace = JSON.parse(contents);
		$scope.visualize(trace);
	};
	
	$scope.saveTrace = function() {
		var json = JSON.stringify($scope.trace, undefined, 4);
		var blob = new Blob([json], { type: 'application/json' });
		var url = URL.createObjectURL(blob);
		var link = document.createElement('a');
		link.download = 'trace.json';
		link.href = url;
		link.target = '_blank';
		link.style.display = 'none';

		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
	};
	
	// If the window's parent isn't equal to itself, that means it's attached
	// (i.e. inside an iframe). By checking for this rather than for
	// `window.opener`, we also prevent it from allowing detachment when the
	// visualizer URL is opened directly.
	$scope.windowIsAttached = window.parent !== window;
	
	// The branch below executes when this is run in an iframe.
	if ( $scope.windowIsAttached ) {
		var otherWindow = null;
		$scope.detachWindow = function() {
			otherWindow = window.open('index.html', '_blank');
			
			// When the other window has loaded, send the current trace for it
			// to visualize.
			otherWindow.addEventListener('load', function() {
				otherWindow.postMessage($scope.trace, location.origin);
			});
			
			// Also inform the main window that a detached window has been
			// opened.
			window.parent.postMessage('detach', location.origin);
		};
		
		window.addEventListener('message', function(event) {
			if ( event.origin !== location.origin ) {
				return;
			}
			
			// If the message was sent by the detached window, that means it is
			// closing and sends its latest trace to be visualized in the
			// attached window.
			if ( event.source === otherWindow ) {
				otherWindow = null;
				window.parent.postMessage('attach', location.origin);
				$scope.$apply(function() {
					$scope.visualize(event.data);
				});
			}
			// If the message originates from somewhere else (the main window)
			// and there is a detached window, forward the message there.
			else if ( otherWindow ) {
				otherWindow.postMessage(event.data, location.origin);
			}
			// Otherwise, there is no detached window and we simply visualize
			// the trace here in the attached window.
			else {
				$scope.$apply(function() {
					$scope.visualize(event.data);
				});
			}
		});
		
		// If there is a detached window, make sure that it's closed when the
		// main window closes.
		window.addEventListener('beforeunload', function(event) {
			if ( otherWindow ) {
				otherWindow.close();
			}
		});
	}
	// The branch below executes when this is run in a separate window.
	else {
		window.addEventListener('message', function(event) {
			if ( event.origin !== location.origin ) {
				return;
			}

			$scope.$apply(function() {
				$scope.visualize(event.data);
			});
		});
		
		// When this window closes, send the latest trace for the attached
		// window to visualize. Also close this window, so that it doesn't
		// navigate somewhere else and lose the connection to the attached
		// window (which can happen if the user refreshes the window, for
		// example).
		window.addEventListener('beforeunload', function() {
			window.opener.postMessage($scope.trace, location.origin);
			window.close();
		});
	}
});