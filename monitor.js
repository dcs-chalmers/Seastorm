// This file is part of Seastorm
// Copyright 2014 Jakob Kallin

'use strict';

// This entire file, and related files, should be refactored to use much higher-
// level abstractions for asynchronous and parallel operations, because the
// current use of promises is verbose and error-prone.
seastorm.monitor = function(vessels, userFiles, onProgress, fileCache) {
	var seattle = seastorm.seattle;
	var zip = seastorm.functional.zip;
	
	/*
	vessels: [
		{
			ip: 192.168.2.2
			port: 1224
			name: 'v1'
			userPort: 12345
			startFile: 'sender.repy',
			args: ['a', 'b', 'c']
		},
		...
	]
	*/
	function uploadFile(filename, contents, vessel) { 
		var id = seattle.vesselId(vessel);
		fileCache[id] = fileCache[id] || {};
		
		if ( fileCache[id][filename] === contents ) {
			return Promise.resolve();
		}
		else {
			fileCache[id][filename] = contents;
			return seattle.call(
				vessel.ip,
				vessel.port,
				'AddFileToVessel',
				[vessel.name, filename, contents]
			);
		}
	}
	
	function startVessel(vessel) {
		// var args = ['dylink.repy', vessel.startFile].concat(vessel.args).join(' ');
		var args = [vessel.startFile].concat(vessel.args).join(' ');
		return seattle.call(
			vessel.ip,
			vessel.port,
			'StartVessel',
			[vessel.name, args]
		);
	}
	
	function createKnownVesselsFile() {
		var lines = vessels.map(function(v) {
			return v.ip + ':' + v.userPort;
		});
		var contents = lines.join('\n');
		return contents;
	}
	
	function checkErrors() {
		vessels.forEach(function(vessel) {
			if ( !vessel.startFile ) {
				throw new Error(
					'No start file has been selected for vessel ' +
					seattle.vesselId(vessel)
				);
			}
			else if ( !(vessel.startFile in userFiles) ) {
				throw new Error('File "' + vessel.startFile + '"" does not exist.');
			}
		});
	}
	
	var filesToUpload = {};
	function initFiles() {
		filesToUpload['vessels'] = createKnownVesselsFile();
		// filesToUpload['seastorm.repy'] = seastorm.repyFiles['seastorm_repy_wrapper.repy'];
		// filesToUpload['dylink.repy'] = seastorm.repyFiles['dylink.repy'];
		
		for ( var filename in userFiles ) {
			if ( filename in filesToUpload ) {
				throw new Error('The filename "' + filename + '" is reserved by Seastorm.');
			} else {
				filesToUpload[filename] =
					// "dy_import_module_symbols('seastorm.repy')\n\n" +
					seastorm.repyFiles['seastorm_repy_wrapper.repy'] + '\n\n' +
					userFiles[filename];
			}
		}
	}
	
	var task = {};
	function initProgress() {
		task.length =
			// Every file to upload is one part of the task.
			Object.keys(filesToUpload).length * vessels.length +
			// Every "start" command is one part of the task.
			vessels.length;
		task.progress = 0;
	}
	
	function notifyProgress() {
		task.progress += 1;
		var ratio = task.progress / task.length;
		
		if ( 0 <= ratio && ratio <= 1 ) {
			onProgress(ratio);
		} else {
			throw new Error('Invalid progress ratio: ' + ratio + '.');
		}
	}
	
	function poll() {
		return Promise.all([
			Promise.all(vessels.map(readStatus)),
			Promise.all(vessels.map(readRepyLog)),
			Promise.all(vessels.map(readSeastormLog))
		])
		.then(function(results) {
			var table = {};
			vessels.forEach(function(vessel, index) {
				table[seattle.vesselId(vessel)] = {
					status: results[0][index],
					repyLog: results[1][index],
					seastormLog: results[2][index]
				}
			});
			return table;
		});
	}
	
	function readStatus(vessel) {
		return seattle.readVesselStatus(vessel).then(function(status) {
			return status === null ? 'Unknown' : status;
		});
	}
	
	function readRepyLog(vessel) {
		return seattle.call(vessel.ip, vessel.port, 'ReadVesselLog', [vessel.name]);
	}
	
	var latestLogContents = {};
	function readSeastormLog(vessel) {
		return seattle.call(
			vessel.ip,
			vessel.port,
			'RetrieveFileFromVessel',
			[vessel.name, 'seastorm.log']
		)
		.catch(function() {
			// If we fail to retrieve the log, simply return the latest one.
			return latestLogContents[seattle.vesselId(vessel)] || '';
		})
		.then(function(logContents) {
			latestLogContents[seattle.vesselId(vessel)] = logContents;
			return logContents;
		});
	}
	
	function createTrace() {
		return Promise.all(vessels.map(readSeastormLog))
		.then(function(logs) {
			var vesselLogs = zip({
				contents: logs,
				vessel: vessels
			});
			
			var logTable = {};
			vesselLogs.forEach(function(vesselLog) {
				logTable[seattle.vesselId(vesselLog.vessel)] = vesselLog.contents;
			});
			
			var processTitles = {};
			vessels.forEach(function(program) {
				processTitles[seattle.vesselId(program.vessel)] = program.title;
			});
			
			var trace = seastorm.traceFromLogs(logTable, processTitles);
			return trace;
		});
	}
	
	function init() {
		initFiles();
		initProgress();
	}
	
	function execute() {
		initProgress();
		
		// Upload the files, then issue the "start" commands.
		return Promise.all(vessels.map(function(vessel) {
			var filePromises = [];
			for ( var filename in filesToUpload ) {
				var contents = filesToUpload[filename];
				var promise = uploadFile(filename, contents, vessel);
				promise.then(notifyProgress);
				filePromises.push(promise);
			}
			
			return Promise.all(filePromises)
			.then(function() {
				return startVessel(vessel).then(notifyProgress);
			});
		}))
		.then(function() {
			var handle = {
				poll: poll,
				cancel: cancel
			};
			return handle;
		});
	}
	
	function cancel(onProgress) {
		return Promise.all(vessels.map(function(vessel) {
			return seattle.call(
				vessel.ip,
				vessel.port,
				'StopVessel',
				[vessel.name]
			).catch(function() {
				// We can't do much useful if a program fails to stop, so simply
				// ignore the error.
			});
		}));
	}
	
	init();
	return execute();
};