var amqp   = require('amqp');
var config = require('../common/config');
var Q      = require('q');
var _ = require('lodash');

var DEFAULT_PUBLISH_OPTIONS = {
	contentType: 'application/json'
};

var amqpConfig = _.pick(config.common.amqp, 'host', 'port', 'login', 'password', 'vhost');
var exchangeName = module.exports.exchange = config.common.amqp.exchange
logger.info("Connecting to amqp://%s@%s:%d%s.", amqpConfig.login, amqpConfig.host, amqpConfig.port, amqpConfig.vhost);

var connection = amqp.createConnection(amqpConfig);
var deferredConnection = Q.defer();
var exchange;

connection.on('ready', function(){
	exchange = connection.exchange(exchangeName, { durable: true }, function(){
		deferredConnection.resolve(connection);
	});
});

module.exports.getConnection = function(callback){
	deferredConnection.then(callback);
};

module.exports.shutdown = function(){
	connection.close();
};

/**
 * @param topic - foo.bar.*.baz.#
 * @param onMessage - function called when a message is received, with the arguments
 * 			- body
 *			- headers
 *			- deliveryInfo
 * @param queueName - queue to bind to (new or existing), or omit to auto-generate one
 * @param onSubscribe - called after subscription is successful, with the argument
 * 			- subscribeResult - object required by messaging.unsubscribe
 */
module.exports.subscribe = function(topic, queueName, onMessage, onSubscribe){
	connection.queue(queueName || '', function(queue){
		queue.bind(exchangeName, topic || '#');
		queue.subscribe(onMessage)
			.addCallback(function(ok){
				onSubscribe || onSubscribe({queue: queue, consumerTag: ok.consumerTag});
			});
	});
};

/**
 * @param topic - foo.bar.*.baz.#
 * @param message - something serializable (JSON by default)
 * @param options - see https://github.com/postwait/node-amqp#exchangepublishroutingkey-message-options-callback
 */
module.exports.publish = function(topic, message, options){
	exchange.publish(topic, message, _.defaults(options || {}, DEFAULT_PUBLISH_OPTIONS));
};

/**
 * @param subscribeResult - object returned in the onSubscribe callback of messaging.subscribe()
 */
module.exports.unsubscribe = function(subscribeResult){
	subscribeResult.queue.unsubscribe(subscribeResult.consumerTag);
};