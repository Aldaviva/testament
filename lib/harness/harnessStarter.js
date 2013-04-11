define(function(require, exports, module){

	var _                 = require('lodash');
	var config            = require('config');
	var messagingClient   = require('messagingClient');
	var TestamentReporter = require('TestamentReporter');

	exports.configure = function(configParam){

		_.merge(config, configParam);

		return this;
	};

	exports.start = function(){

		mocha.reporter(TestamentReporter);
		
		var target = window.location.search.match(/[?&]testament_target=(.+?)(?:$|&)/)[1];
		config.job.target = target;

		messagingClient.connect()
			.then(function(){
				messagingClient.publish(config.job.id+'.control.build-accepted', {
					target: target
					// worker: config.worker.id
				});

				mocha.run(function(){
					/** WARNING
					 * calling window.close() right after mocha.run finishes will not allow the reporter-end event to be sent, causing havok
					 */
					// if(!window.opener){
					// 	window.open('', '_self', '');
					// }
					// window.close();
				});
			}).done();
	};

});