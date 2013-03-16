var _         = require('lodash');
var adapters  = require('./adapter');
var amqp      = require('amqp');
var config    = require('../common/config');
var logger    = require('../common/logger')(__filename);
var messaging = require('../common/messaging');

module.exports.listen = function(){
	messaging.connectionPromise
		.then(listenForAvailableBuilds);
};

function listenForAvailableBuilds(connection){
	var enabledTargets = _.pick(config.worker.targets, function(target){
		return target.enabled !== false;
	});

	_(enabledTargets).forEach(function(target, targetName) {

		var adapterClass = adapters[target.adapter.toLowerCase()];
		if(adapterClass){

			var adapterConfig = _.omit(target, 'adapter');
			var adapter = new (adapterClass)(adapterConfig);
			var buildAvailableQueue;

			messaging.subscribe(
				'*.control.build-available.'+targetName,
				targetName, //The queue is named after the target
				{ ack: true, prefetchCount: 1},
				function(message, headers, deliveryInfo){
					var routingKeyParts = deliveryInfo.routingKey.split('.');
					var jobId = routingKeyParts[0];
					var url = message.url;
					onAvailableBuild(adapter, targetName, jobId, url, buildAvailableQueue);
				}
			)
			.then(function(subscribeResult){
				buildAvailableQueue = subscribeResult.queue;
				logger.log("Registered target browser %s.", targetName);
			});

		} else {
			logger.warn("Unrecognized adapter \"%s\". Try %s.", target.adapter, _.keys(adapters).join(", "));
		}
	});
}

function onAvailableBuild(adapter, targetName, jobId, url, buildAvailableQueue){
	adapter.launch(jobId, url, targetName);
	var runnerEndSubscription;

	messaging.subscribe(jobId+'.'+targetName+'.progress.runner-end', function(msg, head, info){

		buildAvailableQueue.shift();
		messaging.unsubscribe(runnerEndSubscription);
		adapter.close();

	}, function(subscriptionResult){
		runnerEndSubscription = subscriptionResult;
	});
}