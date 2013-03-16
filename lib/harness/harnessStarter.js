define(function(require, exports, module){

	var _               = require('lodash');
	var config          = require('config');
	var messagingClient = require('messagingClient');

	exports.configure = function(configParam){

		_.merge(config, configParam);

		return this;
	};

	exports.start = function(){

		// config.worker.id = (function(a,b){for(b=a='';a++<36;b+=a*51&52?(a^15?8^Math.random()*(a^20?16:4):4).toString(16):'-');return b})();

		var target = window.location.search.match(/[?&]worker=(.+?)(?:$|&)/)[1];
		config.job.target = target;

		messagingClient.connect()
			.then(function(){
				messagingClient.publish(config.job.id+'.control.build-accepted', {
					target: target
					// worker: config.worker.id
				});

				mocha.run();
			}).done();
	};

});