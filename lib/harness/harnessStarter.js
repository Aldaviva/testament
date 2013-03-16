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

		var target = window.location.search.match(/[?&]testament_target=(.+?)(?:$|&)/)[1];
		config.job.target = target;

		messagingClient.connect()
			.then(function(){
				messagingClient.publish(config.job.id+'.control.build-accepted', {
					target: target
					// worker: config.worker.id
				});

				mocha.run(function(){
					window.close(); //probably won't work in all browsers. we can hack it in IE + Chrome, but a more global solution would probably be to automate some key presses
				});
			}).done();
	};

});