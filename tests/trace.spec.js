// This file is part of Seastorm
// Copyright 2014 Jakob Kallin

'use strict';

suite('Trace', function() {	
	suite('Trace from logs', function() {
		var specs = {
			'single process': {
				logs: {
					A: ''
				},
				expectation: {
					processes: { A: 'A' },
				}
			},
			
			'multiple processes': {
				logs: {
					A: '',
					B: ''
				},
				expectation: {
					processes: { A: 'A', B: 'B' }
				}
			},
			
			'process aliases': {
				logs: {
					'111.111.111.111': '',
					'222.222.222.222': ''
				},
				aliases: {
					'111.111.111.111': 'A',
					'222.222.222.222': 'B'
				},
				expectation: {
					processes: {
						'111.111.111.111': 'A',
						'222.222.222.222': 'B'
					}
				}
			},
			
			'single empty log': {
				logs: {
					A: ''
				},
				expectation: {
					events: []
				}
			},
			
			'multiple empty logs': {
				logs: {
					A: '',
					B: ''
				},
				expectation: {
					events: []
				}
			},
			
			'send to unknown process ignored': {
				logs: {
					'A': 'send,1,X,Kg==\n',
					'B': 'send,1,A,Kg==\n'
				},
				expectation: {
					events: [
						{ time: 1, type: 'send', process: 'B', recipient: 'A', data: '*' }
					]
				}
			},
			
			'send event title': {
				logs: {
					'A': 'send,1,A,dGl0bGU=,Kg==\n'
				},
				expectation: {
					events: [
						{ time: 1, type: 'send', process: 'A', recipient: 'A', title: 'title', data: '*' }
					]
				}
			},
			
			// Note that titles are added to the receive event later, when the
			// ordering is created.
			'receive event title': {
				logs: {
					'A':
						'send,1,A,dGl0bGU=,Kg==\n' +
						'receive,2,1,A\n'
				},
				expectation: {
					events: [
						{ time: 1, type: 'send', process: 'A', recipient: 'A', title: 'title', data: '*' },
						{ time: 2, type: 'receive', process: 'A', sender: 'A', departure: 1 }
					]
				}
			},
			
			'log event title': {
				logs: {
					'A': 'log,1,dGl0bGU=,Kg==\n'
				},
				expectation: {
					events: [
						{ time: 1, type: 'log', process: 'A', title: 'title', data: '*' }
					]
				}
			}
		};

		Object.keys(specs).forEach(function(specName) {
			var spec = specs[specName];
			var expectation = spec.expectation;
			
			if ( expectation === Error ) {
				test(specName, function() {
					expect(seastorm.traceFromLogs).withArgs(spec.logs, spec.aliases).to.throwError();
				});
			} else {
				test(specName, function() {
					var trace = seastorm.traceFromLogs(spec.logs, spec.aliases);
					Object.keys(expectation).forEach(function(property) {
						expect(trace[property]).to.eql(expectation[property]);
					});
				});
			}
		});
	});
	
	suite('Ordering from trace', function() {
		var specs = {
			'received message': {
				events: [
					{ time: 1, type: 'send', process: 'A', recipient: 'B', data: '*' },
					{ time: 2, type: 'receive', process: 'B', sender: 'A', departure: 1 }
				],
				expectation: [
					{ time: 1, type: 'send', process: 'A', recipient: 'B', data: '*', arrival: 1 },
					{ time: 2, type: 'receive', process: 'B', sender: 'A', data: '*', departure: 0 }
				]
			},
			
			'unordered events': {
				events: [
					{ time: 2, type: 'receive', process: 'B', sender: 'A', departure: 1 },
					{ time: 1, type: 'send', process: 'A', recipient: 'B', data: '*' }
				],
				expectation: [
					{ time: 1, type: 'send', process: 'A', recipient: 'B', data: '*', arrival: 1 },
					{ time: 2, type: 'receive', process: 'B', sender: 'A', data: '*', departure: 0 }
				]
			},
			
			'non-existing recipient': {
				events: [
					{ time: 1, type: 'send', process: 'A', recipient: '999.999.999.999', data: '*' }
				],
				expectation: [
					{ time: 1, type: 'send', process: 'A', recipient: '999.999.999.999', data: '*', arrival: null }
				]
			},

			'message to self': {
				events: [
					{ time: 1, type: 'send', process: 'A', recipient: 'A', data: '*' },
					{ time: 2, type: 'receive', process: 'A', sender: 'A', departure: 1 }
				],
				expectation: [
					{ time: 1, type: 'send', process: 'A', recipient: 'A', data: '*', arrival: 1 },
					{ time: 2, type: 'receive', process: 'A', sender: 'A', data: '*', departure: 0 }
				]
			},

			'message to self and other message with same departure time': {
				events: [
					{ time: 1, type: 'send', process: 'A', recipient: 'A', data: '*' },
					{ time: 1, type: 'send', process: 'B', recipient: 'A', data: '*' },
					{ time: 2, type: 'receive', process: 'A', sender: 'A', departure: 1 },
					{ time: 3, type: 'receive', process: 'A', sender: 'B', departure: 1 }
				],
				expectation: [
					{ time: 1, type: 'send', process: 'A', recipient: 'A', data: '*', arrival: 2 },
					{ time: 1, type: 'send', process: 'B', recipient: 'A', data: '*', arrival: 3 },
					{ time: 2, type: 'receive', process: 'A', sender: 'A', data: '*', departure: 0 },
					{ time: 3, type: 'receive', process: 'A', sender: 'B', data: '*', departure: 1 }
				]
			},
			
			// The two tests below check that concurrent payloads from different
			// processes are always ordered in the same way, regardless of which
			// one is processed first.
			'equal timestamps, lower process before higher process': {
				events: [
					{ time: 1, type: 'send', process: 'A', recipient: 'B', data: '*' },
					{ time: 1, type: 'send', process: 'B', recipient: 'A', data: '*' }
				],
				expectation: [
					{ time: 1, type: 'send', process: 'A', recipient: 'B', data: '*', arrival: null },
					{ time: 1, type: 'send', process: 'B', recipient: 'A', data: '*', arrival: null }
				]
			},
			
			'equal timestamps, higher process before lower process': {
				events: [
					{ time: 1, type: 'send', process: 'B', recipient: 'A', data: '*' },
					{ time: 1, type: 'send', process: 'A', recipient: 'B', data: '*' }
				],
				expectation: [
					{ time: 1, type: 'send', process: 'A', recipient: 'B', data: '*', arrival: null },
					{ time: 1, type: 'send', process: 'B', recipient: 'A', data: '*', arrival: null }
				]
			},
			
			'arrival before departure': {
				events: [
					{ time: 1, type: 'send', process: 'A', recipient: 'B', data: '*' },
					{ time: 0, type: 'receive', process: 'B', sender: 'A', departure: 1 }
				],
				expectation: Error
			},
			
			// Two local events should not be able to take place at the same
			// time. This might be possible in some environments, but we add
			// that restriction for now in order to detect bugs more easily.
			'duplicate local timestamps': {
				events: [
					{ time: 1, type: 'send', process: 'A', recipient: 'B', data: '*' },
					{ time: 1, type: 'send', process: 'A', recipient: 'B', data: '*' }
				],
				expectation: Error
			},
			
			'receive from unknown process ignored': {
				events: [
					{ time: 2, type: 'receive', process: 'A', sender: 'X', departure: 1 }
				],
				expectation: Error
			},
			
			// This can happen if the recipient is quick enough to log a
			// received message before the sender has, and a log is downloaded
			// at that moment. This shouldn't be common in practice, but it has
			// happened during local tests, and I believe (but haven't
			// confirmed) it's because of the scenario described. In this case,
			// we simply ignore the unsent messages, because they are likely to
			// find a match later when the next log is downloaded.
			'unsent message received': {
				events: [
					{ time: 1, type: 'send', process: 'A', recipient: 'B', data: '*' },
					{ time: 2, type: 'receive', process: 'B', sender: 'A', departure: 1 },
					{ time: 3, type: 'receive', process: 'B', sender: 'A', departure: 2 }
				],
				processes: {
					A: 'A',
					B: 'B'
				},
				expectation: [
					{ time: 1, type: 'send', process: 'A', recipient: 'B', data: '*', arrival: 1 },
					{ time: 2, type: 'receive', process: 'B', sender: 'A', data: '*', departure: 0 }
				]
			},
			
			// We only add titles to messages in this step; it's not in the
			// trace file.
			'received message title': {
				events: [
					{ time: 1, type: 'send', process: 'A', recipient: 'B', title: 'title', data: '*' },
					{ time: 2, type: 'receive', process: 'B', sender: 'A', departure: 1 }
				],
				expectation: [
					{ time: 1, type: 'send', process: 'A', recipient: 'B', title: 'title', data: '*', arrival: 1 },
					{ time: 2, type: 'receive', process: 'B', sender: 'A', title: 'title', data: '*', departure: 0 }
				]
			},
		};

		Object.keys(specs).forEach(function(specName) {
			test(specName, function() {
				var spec = specs[specName];
				var events = spec.events;
				
				if ( spec.processes ) {
					var processes = spec.processes;
				} else {
					var processes = {};
					events.forEach(function(event) {
						processes[event.process] = event.process;
					});
				}
				
				var trace = {
					processes: processes,
					events: events
				};
				
				if ( spec.expectation === Error ) {
					expect(seastorm.orderingFromTrace).withArgs(trace).to.throwError();
				} else {
					var ordering = seastorm.orderingFromTrace(trace);
					expect(ordering.events).to.eql(spec.expectation);
				}
			});
		});
	});
});