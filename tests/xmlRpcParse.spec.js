// This file is part of Seastorm
// Copyright 2014 Jakob Kallin

'use strict';

suite('XML-RPC parser', function() {
	var specs = {
		'no return value': {
			xml: '<methodResponse></methodResponse>',
			expectation: undefined
		},
		'string return value': {
			xml:
				'<methodResponse><params><param>' +
				'<value><string>aString</string></value>' +
				'</param></params></methodResponse>',
			expectation: 'aString'
		},
		'untyped string return value': {
			xml:
				'<methodResponse><params><param>' +
				'<value>aString</value>' +
				'</param></params></methodResponse>',
			expectation: 'aString'
		},
		'integer return value': {
			xml:
				'<methodResponse><params><param>' +
				'<value><int>1</int></value>' +
				'</param></params></methodResponse>',
			expectation: 1
		},
		'true boolean return value': {
			xml:
				'<methodResponse><params><param>' +
				'<value><boolean>1</boolean></value>' +
				'</param></params></methodResponse>',
			expectation: true
		},
		'false boolean return value': {
			xml:
				'<methodResponse><params><param>' +
				'<value><boolean>0</boolean></value>' +
				'</param></params></methodResponse>',
			expectation: false
		},
		'empty array return value': {
			xml:
				'<methodResponse><params><param>' +
				'<value><array><data></data></array></value>' +
				'</param></params></methodResponse>',
			expectation: [],
			exact: false
		},
		'non-empty array return value': {
			xml:
				'<methodResponse><params><param>' +
				'<value><array><data><value>aString</value></data></array></value>' +
				'</param></params></methodResponse>',
			expectation: ['aString'],
			exact: false
		},
		'struct return value': {
			xml:
				'<methodResponse><params><param><value><struct>' +
				'<member>' +
				'<name>aMember</name>' +
				'<value>aValue</value>' +
				'</member>' +
				'</struct></value></param></params></methodResponse>',
			expectation: { aMember: 'aValue' },
			exact: false
		}
	};
	
	Object.keys(specs).forEach(function(specName) {
		var spec = specs[specName];
		var dom = domFromXml(spec.xml);
		var expectation = spec.expectation;
		
		test(specName, function() {
			var result = seastorm.xmlRpcParse(dom);
			if ( spec.exact ) {
				expect(result).to.equal(expectation);
			} else {
				expect(result).to.eql(expectation);
			}
		});
	});
	
	test('unknown return value', function() {
		var xml =
			'<methodResponse><params><param>' +
			'<value><unknown>unknown</unknown></value>' +
			'</param></params></methodResponse>';
		var dom = domFromXml(xml);
		expect(seastorm.xmlRpcParse).withArgs(dom).to.throwError();
	});
	
	// We need a separate test function for checking error objects, since
	// equality checking doesn't work. This is probably because an error object
	// also includes a `stack` property, which won't be the same for two
	// different error objects.
	test('error', function() {
		var xml =
			'<methodResponse><fault><value><struct>' +
			'<member><name>faultCode</name>' +
			'<value><int>1</int></value></member>' +
			'<member><name>faultString</name>' +
			'<value><string>anError</string></value></member>' +
			'</struct></value></fault></methodResponse>';
		var dom = domFromXml(xml);
		var error = seastorm.xmlRpcParse(dom);
		
		expect(error.message).to.equal('1: anError');
	});
	
	function domFromXml(xml) {
		var xmlDeclaration = '<?xml version="1.0" encoding="UTF-8"?>';
		var xml = xmlDeclaration + xml;
		var dom = (new DOMParser()).parseFromString(xml, 'application/xml');
		return dom;
	}
});