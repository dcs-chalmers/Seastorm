// This file is part of Seastorm
// Copyright 2014 Jakob Kallin

'use strict';

seastorm.clearinghouse = {
	loadVessels: function(username, apiKey) {
		var url = 'http://localhost:5346/';
		var methodNames = ['get_resource_info', 'get_account_info'];
		
		var rpc = seastorm.XmlRpcClient(url, methodNames);
		var auth = {
			username: username,
			api_key: apiKey
		};
		
		return rpc.get_account_info(auth).then(parseUserPort)
		.then(function(userPort) {
			return rpc.get_resource_info(auth).then(function(vesselInfoList) {
				return parseVesselInfo(vesselInfoList, userPort);
			});
		});
		
		function parseUserPort(accountInfo) {
			return accountInfo.user_port;
		}
		
		function parseVesselInfo(vesselInfoList, userPort) {
			return vesselInfoList.map(function(vesselInfo) {
				var vessel = {
					ip: vesselInfo.node_ip,
					port: vesselInfo.node_port,
					name: vesselInfo.vessel_id,
					userPort: userPort
				};
				
				return vessel;
			});
		}
	}
};

seastorm.clearinghouseStub = {
	loadVessels: function() {
		return new Promise(function(resolve) {
			resolve([
				{
					ip: '192.168.2.2',
					port: 1224,
					userPort: 12345,
					name: 'v1'
				},
				{
					ip: '192.168.2.2',
					port: 1224,
					userPort: 20000,
					name: 'v2'
				},
				{
					ip: '192.168.2.2',
					port: 1224,
					userPort: 30000,
					name: 'v3'
				},
				{
					ip: '192.168.2.2',
					port: 1224,
					userPort: 21000,
					name: 'v4'
				}
			]);
		});
	}
};