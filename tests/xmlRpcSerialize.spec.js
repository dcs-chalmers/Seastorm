// This file is part of Seastorm
// Copyright 2014 Jakob Kallin

'use strict';

suite('XML-RPC serializer', function() {
	var specs = {
		'no params': {
			method: 'aMethod',
			expectation: '<methodCall><methodName>aMethod</methodName></methodCall>'
		},
		'string param': {
			method: 'aMethod',
			args: ['aValue'],
			expectation:
				'<methodCall>' +
				'<methodName>aMethod</methodName>' +
				'<params>' +
				'<param><value>aValue</value></param>' +
				'</params>' +
				'</methodCall>'
		},
		'integer param': {
			method: 'aMethod',
			args: [1],
			expectation:
				'<methodCall>' +
				'<methodName>aMethod</methodName>' +
				'<params>' +
				'<param><value><int>1</int></value></param>' +
				'</params>' +
				'</methodCall>'
		},
		'single-member struct param': {
			method: 'aMethod',
			args: [{ aMember: 'aValue' }],
			expectation:
				'<methodCall>' +
				'<methodName>aMethod</methodName>' +
				'<params><param><struct>' +
				'<member>' +
				'<name>aMember</name>' +
				'<value>aValue</value>' +
				'</member>' +
				'</struct></param></params>' +
				'</methodCall>'							
		},
		'multiple-member struct param': {
			method: 'aMethod',
			args: [{ firstMember: 'firstValue', secondMember: 'secondValue' }],
			expectation:
				'<methodCall>' +
				'<methodName>aMethod</methodName>' +
				'<params><param><struct>' +
				'<member>' +
				'<name>firstMember</name>' +
				'<value>firstValue</value>' +
				'</member>' +
				'<member>' +
				'<name>secondMember</name>' +
				'<value>secondValue</value>' +
				'</member>' +
				'</struct></param></params>' +
				'</methodCall>'							
		},
		'multiple params': {
			method: 'aMethod',
			args: ['first', 'second'],
			expectation:
				'<methodCall>' +
				'<methodName>aMethod</methodName>' +
				'<params>' +
				'<param><value>first</value></param>' +
				'<param><value>second</value></param>' +
				'</params>' +
				'</methodCall>'
		}
	};
	
	Object.keys(specs).forEach(function(specName) {
		var spec = specs[specName];
		var args = [spec.method, spec.args];
		var expectation = spec.expectation;
		
		test(specName, function() {
			var dom = seastorm.xmlRpcSerialize.apply(seastorm, args);
			var xml = (new XMLSerializer()).serializeToString(dom);
			expect(xml).to.equal(expectation);
		});
	});
});