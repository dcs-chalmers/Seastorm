// This file is part of Seastorm
// Copyright 2014 Jakob Kallin

'use strict';

seastorm.xmlRpcSerialize = function(methodName, params) {
	return domFromMethodCall(methodName, params);
	
	function domFromMethodCall(name, params) {
		params = params || [];
		var dom = document.implementation.createDocument(null, 'methodCall', null);
		
		var methodNameNode = createElement(configFromMethodName(name));
		dom.documentElement.appendChild(methodNameNode);
		
		if ( params.length > 0 ) {
			var paramNode = createElement(configFromParamList(params));
			dom.documentElement.appendChild(paramNode);
		}
		
		return dom;
		
		function configFromMethodName(name) {
			return { methodName: name };
		}
		
		function configFromParamList(params) {
			return { params: params.map(configFromParam) };
		}
		
		function configFromParam(value) {
			return { param: configFromValue(value) };
		}
		
		function configFromValue(value) {
			if ( typeof value === 'object' ) {
				return configFromObject(value);
			} else {
				return configFromScalar(value);
			}
		}
		
		function configFromScalar(value) {
			var typeName = ({
				string: 'string',
				number: 'int' // Also converts doubles to `int`.
			})[typeof value];
			
			if ( typeName === 'string' ) {
				return { value: value };
			} else if ( typeName ) {
				var config = { value: {} };
				config.value[typeName] = value;
				return config;
			} else {
				throw new Error(
					'This value cannot be converted into an element: ' + value
				);
			}
		}
		
		function configFromObject(object) {
			var memberConfig = Object.keys(object).map(function(property) {
				return configFromProperty(object, property);
			});
			return { struct: memberConfig };
		}
		
		function configFromProperty(object, property) {
			var value = object[property];
			return { member: [
				{ name: property },
				configFromValue(value)
			]};
		}
		
		function createElement(config) {
			var tagName = Object.keys(config)[0];
			var element = dom.createElement(tagName);
			var contents = config[tagName];
			
			if ( typeof contents === 'object' ) {
				if ( contents instanceof Array ) {
					contents.forEach(function(contentConfig) {
						element.appendChild(createElement(contentConfig));
					});
				} else {
					element.appendChild(createElement(contents));
				}
			} else {
				element.textContent = contents;
			}
			
			return element;
		}
	}
};