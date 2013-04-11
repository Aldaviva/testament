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

			runner.on('start',              this.onStart);
			runner.on('suite',              this.onSuite);
			runner.on('suite end',          this.onSuiteEnd);
			runner.on('pass',               this.onPass);
			runner.on('fail',               this.onFail);
			runner.on('end',                this.onEnd);
			runner.on('pending',            this.onSkip);
			//runner.on('uncaught exception', this.onUncaughtException);
		},

		onStart: function(){
			this.sendMessage('runner-start', {
				totalCases: this.runner.total,
				userAgent: window.navigator.userAgent
			});
		},

		onPass: function(test){
			this.sendMessage('case-pass', this.clean(test));
			safeConsole('info', 'PASS '+test.fullTitle());
		},

		onFail: function(test){
			var cleaned = this.clean(test);
			this.sendMessage('case-fail', cleaned);
			safeConsole('error', 'FAIL '+test.fullTitle() + ": " + test.err.stack || test.err.message || '');
		},

		onSkip: function(test){
			this.sendMessage('case-skip', this.clean(test));
			safeConsole('warn', 'SKIP '+test.fullTitle());
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

		/*onUncaughtException: function(msg, url, line){
			alert('uncaught exception: '+msg);
			// this.sendMessage('uncaught-exception', { msg: msg, url: url, line: line });
			this.onEnd();
		},*/

		clean: function(test){
			var result = {
				title          : test.title,
				fullTitle      : test.fullTitle(),
				duration       : test.duration || 0,
				suiteFullTitle : test.parent.fullTitle()
			};
			test.err && (result.err = {
				message : test.err.message,
				stack   : test.err.stack
			});
			return result;
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

	function safeConsole(level){
		console && console[level] && console[level].apply && console[level].apply(console, Array.prototype.slice.call(arguments, 1));
	}

	// return ConsoleReporter;
	return AmqpReporter;
});