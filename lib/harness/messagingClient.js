define(function(require, exports, module){

	var _      = require('lodash');
	var config = require('config');
	var my     = require('myclass');
	var Q      = require('q');
	var SockJS = require('sockjs');
	var Stomp  = require('stomp');

	var MessagingClient = my.Class({

		_connectionPromise: null,
		_stompClient: null,

		publish: function(topic, body){
			var headers = {
				'content-type': 'application/json'
			};
			this._stompClient.send(this._getDestination(topic), headers, JSON.stringify(body));
		},

		subscribe: function(topic, onMessage){
			this._stompClient.subscribe(this._getDestination(topic), onMessage, {});
		},

		connect: function(){
			var deferredConnection = Q.defer();
			this._connectionPromise = deferredConnection.promise;

			var ws = new SockJS('http://' + config.common.amqp.host + ':15674/stomp', null, { debug: false });
			this._stompClient = Stomp.over(ws);
			this._stompClient.heartbeat.outgoing = 0;
			this._stompClient.heartbeat.incoming = 0;

			var onConnect = _.partial(deferredConnection.resolve, this);

			this._stompClient.connect(config.common.amqp.login, config.common.amqp.password, onConnect, deferredConnection.reject, config.common.amqp.vhost);

			return this._connectionPromise;
		},

		disconnect: function(){
			this._stompClient.disconnect(_.bind(function(){
				this._stompClient = null;
				this._connectionPromise = null;
			}, this));
		},

		_getDestination: function(topic){
			return '/exchange/' + config.common.amqp.exchange + '/' + topic;
		}

	});

	return new MessagingClient();

});