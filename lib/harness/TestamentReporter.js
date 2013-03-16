define(function(require){

	var _               = require('lodash');
	var config          = require('config');
	var messagingClient = require('messagingClient');
	var my              = require('myclass');

	var ReporterBase = Mocha.reporters.Base;

	var TestamentReporter = my.Class(ReporterBase, {

		runner: null,

		constructor: function(runner){
			TestamentReporter.Super.call(this, runner);
			_.bindAll(this);

			this.runner = runner;

			runner.on('start',   this.onStart);
			runner.on('suite',   this.onSuite);
			runner.on('pass',    this.onPass);
			runner.on('fail',    this.onFail);
			runner.on('end',     this.onEnd);
			// runner.on('pending', this.onPending); //what is this? a skipped test case?
		},

		onStart: function(){
			this.sendMessage('runner-start', { numTests: this.runner.total });
		},

		onPass: function(test){
			this.sendMessage('case-pass', this.clean(test));
		},

		onFail: function(test){
			this.sendMessage('case-fail', this.clean(test));
		},

		onEnd: function(){
			this.sendMessage('runner-end', this.stats);
		},

		onSuite: function(suite){
			!suite.root && this.sendMessage('suite-start', {
				title: suite.title,
				numTests: suite.tests.length
			});
		},

		clean: function(test){
			return {
				title     : test.title,
				fullTitle : test.fullTitle(),
				duration  : test.duration
			};
		}
	});

	var AmqpReporter = my.Class(TestamentReporter, {

		constructor: function(runner){
			AmqpReporter.Super.call(this, runner);
			this.topic = config.job.id + '.' + config.job.target + '.progress.';
		},

		sendMessage: function(eventName, data){
			data.target = config.job.target;
			messagingClient.publish(this.topic+eventName, data);
		}
	});

	var PhantomReporter = my.Class(TestamentReporter, {
		constructor: function(runner){
			PhantomReporter.Super.call(this, runner);
		},

		sendMessage: function(){
			throw "not implemented";
		}
	});

	var ConsoleReporter = my.Class(TestamentReporter, {
		constructor: function(runner){
			ConsoleReporter.Super.call(this, runner);
		},

		sendMessage: function(key, value){
			console.log(key, value);
		}
	});

	// return ConsoleReporter;
	return AmqpReporter;
});