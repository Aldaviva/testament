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

			runner.on('start',     this.onStart);
			runner.on('suite',     this.onSuite);
			runner.on('suite end', this.onSuiteEnd);
			runner.on('pass',      this.onPass);
			runner.on('fail',      this.onFail);
			runner.on('end',       this.onEnd);
			runner.on('pending',   this.onSkip);
		},

		onStart: function(){
			this.sendMessage('runner-start', {
				totalCases: this.runner.total,
				userAgent: window.navigator.userAgent
			});
		},

		onPass: function(test){
			this.sendMessage('case-pass', this.clean(test));
		},

		onFail: function(test){
			this.sendMessage('case-fail', this.clean(test));
		},

		onSkip: function(test){
			this.sendMessage('case-skip', this.clean(test));
		},

		onEnd: function(){
			this.sendMessage('runner-end', this.stats);
		},

		onSuite: function(suite){
			!suite.root && this.sendMessage('suite-start', {
				title: suite.title,
				fullTitle: suite.fullTitle(),
				totalCases: suite.tests.length
			});
		},

		onSuiteEnd: function(suite){
			!suite.root && this.sendMessage('suite-end', {
				title: suite.title,
				fullTitle: suite.fullTitle()
			});
		},

		clean: function(test){
			return {
				title          : test.title,
				fullTitle      : test.fullTitle(),
				duration       : test.duration || 0,
				suiteFullTitle : test.parent.fullTitle(),
				err            : test.err
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