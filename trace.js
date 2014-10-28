// This file is part of Seastorm
// Copyright 2014 Jakob Kallin

'use strict';

// A trace is the data format that the visualizer accepts. It contains no
// implementation details on how the data itself was gathered and uses general
// concepts (processes and events) rather than Seattle-specific concepts (such
// as vessels). This function compiles a collection of vessel-maintained logs
// (one for each vessel) into the trace data format. The argument is an object
// mapping process name to log contents (as a string).
seastorm.traceFromLogs = function(logs, aliases) {
	/*
	logs: {
		'123.123.123.123': 'contents',
		...
	}
	aliases: {
		'123.123.123.123': 'Sender',
		...
	}
	*/
	if ( aliases ) {
		var processes = aliases;
	} else {
		var processes = processesFromLogs(logs);
	}
	
	var events = eventsFromLogs(logs);
	
	var trace = {
		processes: processes,
		events: events
	};
	
	return trace;
	
	function processesFromLogs(logs) {
		var processes = {};
		Object.keys(logs).forEach(function(id) {
			processes[id] = id;
		});
		return processes;
	}
	
	function eventsFromLogs(logs) {
		var events = [];
		for ( var process in logs ) {
			var log = logs[process];
			events = events.concat(eventsFromLog(process, log));
		}
		
		// Discard events with unknown recipients.
		events = events.filter(function(event) {
			return event.type !== 'send' || event.recipient in processes;
		});
		
		return events;
	}
	
	function eventsFromLog(process, log) {
		var lines = log.trim().split(/\r?\n/);
		// No empty lines; needed for empty logs because of `split` behavior.
		var nonEmptyLines = lines.filter(hasChars);
		var events = nonEmptyLines.map(eventFromString.bind(null, process));
		
		if ( containsDuplicateLocalTimestamps(events) ) {
			throw new Error('Log contains duplicate local timestamps:\n\n' + log);
		} else {
			return events;
		}
		
		function containsDuplicateLocalTimestamps(events) {
			var localTimestamps = events.map(function(entry) {
				return entry.time;
			});
			var uniqueLocalTimestamps = _.uniq(localTimestamps);
			return localTimestamps.length !== uniqueLocalTimestamps.length;
		}
		
		function hasChars(string) {
			return string !== '';
		}
	}

	// Create a JavaScript object from one line in a vessel log.
	function eventFromString(process, string) {
		var values = string.split(',');
		var type = values[0];
		
		if ( type === 'send' ) {
			var event = {
				time: Number(values[1]),
				type: type,
				process: process,
				recipient: values[2]
			};
			
			var hasTitle = values.length === 5;
			if ( hasTitle ) {
				event.data = decodeBase64(values[4]);
				event.title = decodeBase64(values[3]);
			}
			else {
				event.data = decodeBase64(values[3]);
			}
		}
		else if ( type === 'receive' ) {
			var event = {
				time: Number(values[1]),
				type: type,
				process: process,
				sender: values[3],
				departure: Number(values[2])
				// Receive events never have data or title; we add these later
				// on based on the data and title of the corresponding send
				// event.
			};
		}
		else if ( type === 'log' ) {
			var event = {
				time: Number(values[1]),
				type: type,
				process: process
			};
			
			var hasTitle = values.length === 4;
			if ( hasTitle ) {
				event.data = decodeBase64(values[3]);
				event.title = decodeBase64(values[2]);
			}
			else {
				event.data = decodeBase64(values[2]);
			}
		}
		else {
			throw new Error('Unknown event type in log: ' + type);
		}
		
		return event;
	}
	
	function decodeBase64(string) {
		return decodeURIComponent(escape(window.atob(string)));
	}
};

// Before visualizing the data, we need an explicit ordering of events
// (specifically for events with equal timestamps, where we currently break the
// tie based on process ID). Note that this function also adds titles to receive
// events based on the title of their corresponding send events.
seastorm.orderingFromTrace = function(trace) {
	trace = copy(trace);
	var processes = trace.processes;
	var events = trace.events;
	
	// The code below assumes that the events are sorted according to time (with
	// ties broken based on process ID).
	events.sort(function(a, b) {
		var timeDifference = a.time - b.time;
		if ( timeDifference === 0 ) {
			var idDifference = a.process.localeCompare(b.process);
			return idDifference;
		} else {
			return timeDifference;
		}
	});
	
	var processEvents = {};
	for ( var process in processes ) {
		processEvents[process] = {};
	}
	
	events.forEach(function(event) {
		if ( event.time in processEvents[event.process] ) {
			throw new Error('Two events in process ' + event.process + ' have the same timestamp.');
		}
		
		processEvents[event.process][event.time] = event;
	});
	
	events = events.filter(function(event) {
		// If the message was received but not sent, simply ignore it. Such a
		// scenario is described in the test suite.
		if ( event.type === 'receive' && !(event.departure in processEvents[event.sender]) ) {
			return false;
		} else {
			return true;
		}
	});
	
	events.filter(isSendEvent).forEach(function(sendEvent) {
		// Assume that the message did not arrive, but note that this may change
		// when we iterate over the receive events later.
		sendEvent.arrival = null;
	});
	
	events.filter(isReceiveEvent).forEach(function(receiveEvent) {
		if ( !(receiveEvent.sender in processEvents) ) {
			throw new Error(
				'Process ' + receiveEvent.process +
				' received a message from unknown process ' +
				receiveEvent.sender + '.'
			);
		}
		
		var sendEvent = processEvents[receiveEvent.sender][receiveEvent.departure];
		
		if ( receiveEvent.time <= sendEvent.time ) {
			throw new Error(
				'Process ' + receiveEvent.process +
				' received a message before it was sent by ' +
				receiveEvent.sender + '.'
			);
		}
		
		receiveEvent.departure = events.indexOf(sendEvent);
		sendEvent.arrival = events.indexOf(receiveEvent);
		
		receiveEvent.data = sendEvent.data;
		if ( 'title' in sendEvent ) {
			receiveEvent.title = sendEvent.title;
		}
	});
	
	var ordering = {
		processes: processes,
		events: events
	};
	
	return ordering;
	
	function isSendEvent(event) {
		return event.type === 'send';
	}
	
	function isReceiveEvent(event) {
		return event.type === 'receive';
	}
	
	function copy(value) {
		if ( value instanceof Array ) {
			var newValue = [];
			value.forEach(function(subvalue) {
				var newSubvalue = copy(subvalue);
				newValue.push(newSubvalue);
			});
		} else if ( typeof value === 'object' ) {
			var newValue = {};
			for ( var property in value ) {
				var subvalue = value[property];
				var newSubvalue = copy(subvalue);
				newValue[property] = newSubvalue;
			}
		} else {
			newValue = value;
		}
		
		return newValue;
	}
};
