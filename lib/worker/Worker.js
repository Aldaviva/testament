var _         = require('lodash');
var adapters  = require('./adapter');
var amqp      = require('amqp');
var config    = require('../common/config');
var logger    = require('../common/logger')(__filename);
var messaging = require('../common/messaging');

module.exports.listen = function(){
	messaging.getConnection(function(connection){
		listenForAvailableBuilds(connection);
	});
};

function listenForAvailableBuilds(connection){
	var enabledTargets = _.pick(config.worker.targets, function(target){
		return target.enabled !== false; //enable if true or missing
	});

	_(enabledTargets).forEach(function(target, targetName) {

		var adapterClass = adapters[target.adapter.toLowerCase()];
		if(adapterClass){

			var adapterConfig = _.omit(target, 'adapter');
			var adapter = new (adapterClass)(adapterConfig);

			getQueueNames(targetName).forEach(function(queueName){

				messaging.subscribe(
					'*.control.build-available.'+queueName,
					queueName,
					function(message, headers, deliveryInfo){
						var routingKeyParts = deliveryInfo.routingKey.split('.')
						var jobId = routingKeyParts[0];
						var url = message.url;
						adapter.launch(jobId, url, targetName);
					},
					function(){
						logger.log("Registered target browser %s.", queueName);
					}
				);
			});

		} else {
			logger.warn("Unrecognized adapter \"%s\". Try %s.", target.adapter, _.keys(adapters).join(", "));
		}
	});
}

function getQueueNames(target){
	return [target, target.replace(/^.*?-/, '')];
}