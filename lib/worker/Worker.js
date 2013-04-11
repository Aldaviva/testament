var _         = require('lodash');
var adapters  = require('./adapter');
var amqp      = require('amqp');
var config    = require('../common/config');
var logger    = require('../common/logger')(__filename);
var messaging = require('../common/messaging');
var Q         = require('q');

module.exports.listen = function(){
	messaging.connectionPromise
		.then(listenForAvailableBuilds);
};

function listenForAvailableBuilds(connection){
	var enabledTargets = _.pick(config.worker.targets, function(target){
		return target.enabled !== false;
	});

	_(enabledTargets).reduce(function(soFar, target, targetName) {

		var adapterClass = adapters[target.adapter.toLowerCase()];
		if(adapterClass){

			
			var adapterConfig = _.omit(target, 'adapter');
			var adapter = new (adapterClass)(adapterConfig);
			var buildAvailableQueue;

			return soFar.then(function(){
				return messaging.subscribe(
					'*.control.build-available.'+targetName,
					targetName, //The queue is named after the target
					{ ack: true, prefetchCount: 1 },
					function(message, headers, deliveryInfo){
						var routingKeyParts = deliveryInfo.routingKey.split('.');
						var jobId = routingKeyParts[0];
						var url = message.url;
						onAvailableBuild(adapter, targetName, jobId, url, buildAvailableQueue);
					}
				);
			})
			.then(function(subscribeResult){
				buildAvailableQueue = subscribeResult.queue;
				return adapter.getVersion();
			}).then(function(version){
				logger.info("Registered browser %s %s.", targetName, version);
			});

		} else {
			logger.warn("Unrecognized adapter \"%s\". Try %s.", target.adapter, _.keys(adapters).join(", "));
			return soFar;
		}
	}, Q.resolve());
}

function onAvailableBuild(adapter, targetName, jobId, url, buildAvailableQueue){
	adapter.launch(url);
	var runnerEndSubscription;

	messaging.subscribe(jobId+'.'+targetName+'.progress.runner-end', function(msg, head, info){

		buildAvailableQueue.shift();
		messaging.unsubscribe(runnerEndSubscription);
		adapter.close();
		logger.info("%s finished, ready for next build.", targetName);

	}).then(function(subscriptionResult){
		runnerEndSubscription = subscriptionResult;
	});
}