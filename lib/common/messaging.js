var _        = require('lodash');
var amqp     = require('amqp');
var config   = require('../common/config');
var logger   = require('../common/logger')(__filename);
var Q        = require('q');
var variadic = require('../common/variadic');

var DEFAULT_PUBLISH_OPTIONS = {
	contentType: 'application/json'
};

var amqpConfig = _.pick(config.common.amqp, 'host', 'port', 'login', 'password', 'vhost');
var exchangeName = module.exports.exchange = config.common.amqp.exchange;
logger.log("Connecting to amqp://%s@%s:%d%s.", amqpConfig.login, amqpConfig.host, amqpConfig.port, amqpConfig.vhost);

var connection = module.exports.connection = amqp.createConnection(amqpConfig);
var deferredConnection = Q.defer();
var exchange;

connection.on('ready', function(){
	exchange = connection.exchange(exchangeName, { type: 'topic', durable: true }, function(){
		deferredConnection.resolve(connection);
	});
});

module.exports.connectionPromise = deferredConnection.promise;

var shutdown = module.exports.shutdown = function(){
	connection.end();
};

//This seems to make the AMQP client try to connect to a bunch of anonymous topics that it doesn't have permission for
// process.on('uncaughtException', shutdown);

/**
 * @param topic - foo.bar.*.baz.#
 * @param onMessage - function called when a message is received, with the arguments
 * 			- body
 *			- headers
 *			- deliveryInfo
 * @param queueName - queue to bind to (new or existing), or omit to auto-generate one
 * @return promise which is fulfilled when the subscription succeeds, with an object to be passed to unsubscribe
 */
module.exports.subscribe = variadic(function(topic, queueName, opts, onMessage){
	// logger.warn('topic = %s, queue = %s, opts = %s, onMessage = %s', topic, queueName, JSON.stringify(opts), onMessage);
	var deferred = Q.defer();
	connection.queue(queueName || '', function(queue){
		queue.bind(exchangeName, topic || '#');
		queue.subscribe(opts || {}, onMessage)
			.addCallback(function(ok){
				deferred.resolve({queue: queue, consumerTag: ok.consumerTag});
			});
	});
	return deferred.promise;
}, [String, String, Object, Function]);

/**
 * @param topic - foo.bar.*.baz.#
 * @param message - something serializable (JSON by default)
 * @param options - see https://github.com/postwait/node-amqp#exchangepublishroutingkey-message-options-callback
 */
module.exports.publish = function(topic, message, options){
	// logger.log("Publishing to %s", topic, message);
	exchange.publish(topic, message, _.defaults(options || {}, DEFAULT_PUBLISH_OPTIONS));
};

/**
 * @param subscribeResult - object returned in the onSubscribe callback of messaging.subscribe()
 */
module.exports.unsubscribe = function(subscribeResult){
	subscribeResult.queue.unsubscribe(subscribeResult.consumerTag);
};