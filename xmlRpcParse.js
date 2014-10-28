// This file is part of Seastorm
// Copyright 2014 Jakob Kallin

'use strict';

seastorm.xmlRpcParse = function(dom) {
	return valueFromDom(dom);
	
	function valueFromDom(dom) {
		if ( dom.querySelector('parsererror') ) {
			// If the XML is malformed, this is where we should be notified.
			// (This is mostly for the test cases, which can fail if the XML
			// syntax is wrong.)
			throw new Error('Malformed XML document.')
		}
		else if ( dom.documentElement.firstElementChild === null ) {
			return undefined;
		}
		else if ( dom.documentElement.firstElementChild.localName === 'params' ) {
			return valueFromReturnValueDom(dom);
		}
		else {
			return valueFromFaultDom(dom);
		}
	}
	
	function valueFromReturnValueDom(dom) {
		var valueNode = dom.querySelector('value');
		return valueFromValueNode(valueNode);
	}
	
	function valueFromValueNode(valueNode) {
		var typeNode = valueNode.firstElementChild;
		if ( typeNode ) {
			var typeName = typeNode.localName;
		}
		else {
			var typeName = 'string';
		}
		
		var convert = ({
			'array': valueFromArrayNode,
			'boolean': valueFromBooleanNode,
			'int': valueFromIntNode,
			'string': valueFromStringNode,
			'struct': valueFromStructNode
		})[typeName];
		
		if ( convert === undefined ) {
			throw new Error(
				'The type "' + typeName + '" ' +
				'is not supported by this client (or possibly by XML-RPC).'
			);
		}
		
		var value = convert(valueNode);
		return value;
	}
	
	function valueFromArrayNode(node) {
		return [].slice.call(node.querySelector('data').children).map(valueFromValueNode);
	}
	
	function valueFromBooleanNode(node) {
		return node.textContent === '0' ? false : true;
	}
	
	function valueFromIntNode(node) {
		return Number(node.textContent);
	}
	
	function valueFromStringNode(node) {
		return String(node.textContent);
	}
	
	function valueFromStructNode(structNode) {
		var object = {};
		[].slice.call(structNode.querySelectorAll('member'))
		.forEach(function(memberNode) {
			var key = memberNode.querySelector('name').textContent;
			var value = valueFromValueNode(memberNode.querySelector('value'));
			object[key] = value;
		});
		return object;
	}
	
	function valueFromFaultDom(dom) {
		var code = Number(dom.querySelector('int').textContent);
		var message = dom.querySelector('string').textContent;
		
		var error = new Error(code + ': ' + message);
		return error;
	}
};