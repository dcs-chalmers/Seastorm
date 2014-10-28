// This file is part of Seastorm
// Copyright 2014 Jakob Kallin

'use strict';

suite('Vessel parsing', function() {
	var parseVesselStatus = seastorm.seattle.parseVesselStatus;
	
	test('single vessel', function() {
		expect(parseVesselStatus(
			'Version: 0.2-beta-r6988' + '\n' +
			'Nodename: 123.123.123.123' + '\n' +
			'Nodekey: ...' + '\n' +
			'Name: v1' + '\n' +
			'Status: Fresh' + '\n' +
			'Advertise: False' + '\n' +
			'OwnerKey: ...' + '\n' +
			'OwnerInfo: ' + '\n'
		)).to.eql({
			v1: 'Fresh'
		});
	});
	
	test('multiple vessels', function() {
		expect(parseVesselStatus(
			'Version: 0.2-beta-r6988' + '\n' +
			'Nodename: 123.123.123.123' + '\n' +
			'Nodekey: ...' + '\n' +
			'Name: v1' + '\n' +
			'Status: Fresh' + '\n' +
			'Advertise: False' + '\n' +
			'OwnerKey: ...' + '\n' +
			'OwnerInfo: ' + '\n' +
			'Name: v2' + '\n' +
			'Status: Terminated' + '\n' +
			'Advertise: False' + '\n' +
			'OwnerKey: ...' + '\n' +
			'OwnerInfo: ' + '\n'
		)).to.eql({
			v1: 'Fresh',
			v2: 'Terminated'
		});
	});
});