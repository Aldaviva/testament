var _              = require('lodash');
var buildutils     = require('./buildutils');
var color          = require('cli-color');
var commander      = require('commander');
var config         = require('../common/config');
var glob           = require('glob');
var HarnessFactory = require('./HarnessFactory');
var http           = require('http');
var JUnitReporter  = require('./JUnitReporter');
var logger         = require('../common/logger')(__filename);
var messaging      = require('../common/messaging');
var my             = require('myclass');
var path           = require('path');
var Q              = require('q');
var url            = require('url');

var DISPLAYERS = {
	bars: require('./Bars'),
	list: require('./List')
};

var Boss = module.exports = my.Class({

	jobId: null,
	server: null,
	serverResponseBodies: {},
	reporterEndedPromises: [],
	totalFailures: 0,

	constructor: function(){
		_.bindAll(this);

		commander
			.option('-j, --job [jobId]', 'Job ID')
			.parse(process.argv);

		this.jobId = commander.job;

		Q.try(this.startApp)
			.then(_.bind(function(){
				return [this.createHarness(), this.startServer()];
			}, this))
			.all()
			.thenResolve(messaging.connectionPromise)
			.then(this.listenForRunnerProgress)
			.then(this.advertiseBuild)
			.then(_.bind(function(){
				return first([this.timeoutNonStartingRunners(), this.waitForAllRunnersToFinish()]);
			}, this))
			.then(this.showSummary)
			.then(this.stopApp)
			.then(this.waitForAllReportersToFinish)
			.then(this.shutdown)
			.fail(_.bind(function(err){
				if(err.valueOf && err.valueOf().exception){
					logger.error(err.valueOf().exception);
				} else {
					logger.error(err.stack ? err.stack : err);
				}
				this.shutdown(1);
			}, this));
	},

	listenForRunnerProgress: function(){
		logger.log("Listening for progress.");
		var jobId = this.jobId;

		var displayClassName = config.boss.progressDisplay || 'bars';
		var displayClass = DISPLAYERS[displayClassName] || DISPLAYERS['bars'];
		var display = new (displayClass)(jobId, config.app.targets);

		var progressSubscription = messaging.subscribe(jobId+'.*.progress.#', '', {}, function(msg, head, info){
			var topicParts = info.routingKey.split('.');
			var target = topicParts[1];
			display.onProgress(target, topicParts[3], msg);
		});

		return _.reduce(config.app.targets, function(soFar, target){
			var reporter = new JUnitReporter(target);
			this.reporterEndedPromises.push(reporter.getWriteStreamEndedPromise());

			return soFar.then(function(){
				return messaging.subscribe(jobId+'.'+target+'.progress.#', reporter.processMessage);
			});
		}, progressSubscription, this);
	},

	advertiseBuild: function(){
		var targets = config.app.targets;

		var urlWithoutTarget = url.parse(config.app.url, true);
		delete urlWithoutTarget.search;
		urlWithoutTarget.query['testament_time'] = new Date().getTime();
		
		_.forEach(targets, function(target){
			urlWithoutTarget.query['testament_target'] = target;
			var urlWithTarget = url.format(urlWithoutTarget);
			logger.log("Advertising build to %s.", target);
			messaging.publish(this.jobId+'.control.build-available.'+target, {
				url: urlWithTarget
			}, {
				mandatory: false //TODO listen for errors with exchange.on('basic-return', function(err){})
			});
		}, this);
	},

	waitForAllRunnersToFinish: function(){
		var targets = config.app.targets;

		logger.info("Running tests in %d browsers...", targets.length);

		var deferreds = _.object(targets, _.map(targets, function(){
			return Q.defer();
		}));

		return messaging.subscribe(this.jobId+'.*.progress.runner-end', function(msg, head, info){
			var target = msg.target;
			var deferred = deferreds[target];
			deferred.resolve(msg);
		})
		.then(function(){
			return Q.all(_.pluck(deferreds, 'promise'));
		});
	},

	showSummary: function(stats){
		var message = '%s had %d successes and %d failures.';

		_.forEach(stats, function(stat){
			if(stat.failures > 0){
				this.totalFailures += stat.failures;
				logger.error(message, stat.target, stat.passes, stat.failures);
			} else {
				logger.info(message, stat.target, stat.passes, stat.failures);
			}
		}, this);

		if(this.totalFailures){
			logger.error("%d TESTS FAILED.", this.totalFailures);
		} else {
			logger.info(color.greenBright("ALL TESTS PASSED ^_^"));
		}
	},

	shutdown: function(errCode){
		errCode = (errCode != undefined) ? errCode : this.totalFailures;
		logger.log("Shutting down with exit code %d.", errCode);

		this.server && this.server.close();
		messaging.shutdown();
		process.exit(errCode);
	},

	createHarness: function(){
		logger.log("Creating harness.");

		return Q.nfcall(glob, config.app.specs)
			.then(function(specs){
				logger.log("Found %d test spec files.", specs.length);
				return specs;
			})
			.then(_.partial(HarnessFactory.newHarness, this.jobId))
			.then(_.bind(function(harnessBuffer){
				this.url = '/harness-'+this.jobId+'.js';
				this.serverResponseBodies[this.url] = harnessBuffer;
			}, this));
	},

	startServer: function(){
		logger.log("Starting harness server.");
		var server = http.createServer(_.bind(function(req, res){
			res.setHeader('Connection', 'close'); //allow fast shutdowns, since clients only make 1 request anyway

			if(req.method == 'GET'){
				var harnessBuffer = this.serverResponseBodies[req.url];
				if(harnessBuffer){
					res.setHeader('Content-Type', 'text/javascript');
					res.write(harnessBuffer);
				} else {
					res.setHeader('Content-Type', 'text/plain');
					res.statusCode = 404;
					res.write("Missing harness for job "+this.jobId);
				}
				res.end();

			} else {
				res.statusCode = 405;
				res.end("What do you think this is, some sort of fancy application server?");
			}
		}, this));

		return Q.ninvoke(server, "listen", config.boss.httpPort)
			.fail(function(err){
				logger.error("Could not listen for HTTP requests on %d: %s", config.boss.httpPort, err);
				throw err;
			})
			.then(function(){
				var address = server.address();
				logger.log("Serving harness from %s:%d.", address.address, address.port);
				return server;
			});
	},

	waitForAllReportersToFinish: function(){
		return Q.all(this.reporterEndedPromises)
			.then(function(){
				logger.info("Wrote reports to %s.", config.app.reports.dir);
			});
	},

	startApp: function(){
		return this._startStopApp(true);
	},

	stopApp: function(){
		return this._startStopApp(false);
	},

	_startStopApp: function(isStart){
		var deferred = Q.defer();
		var moduleName = path.resolve(config.app.startStopScript);

		if(moduleName){
			try {
				var module = require(moduleName);
				module.logger = require('../common/logger')("StartStopScript");
				var methodName = (isStart) ? 'start' : 'stop';

				if(typeof module[methodName] == 'function'){
					module[methodName](deferred.makeNodeResolver());
				} else {
					logger.warn("configured app.startStopScript %s is missing function %s.", moduleName, methodName);
					deferred.resolve();
				}
			} catch(err){
				if(err.code == "MODULE_NOT_FOUND" && err.message.indexOf(path.basename(moduleName)) !== -1){
					deferred.reject("Missing startStopScript file "+moduleName+" (cwd = "+process.cwd()+", dirname = "+__dirname+")");
				} else {
					deferred.reject(err);
				}
			}
		} else {
			deferred.resolve();
		}

		return deferred.promise;
	},

	/**
	 * Make a bunch of promises, one for each target. When a target accepts a build, the target's promise is fulfilled successfully, but it the target times out before it accepts, the promise is rejected.
	 * If all targets succeed, the promise returned from this method is never fulfilled (to help with timeout detection parallel to work monitoring).
	 * If one of the targets fails, the promise returned from this method is rejected.
	 */
	timeoutNonStartingRunners: function(){
		var targets = config.app.targets;
		var deferreds = _.object(targets, _.map(targets, function(targetName){
			var deferred = Q.defer();
			deferred.promise.targetName = targetName;
			return deferred;
		}));

		var anyRejected = Q.defer();

		var rejectedTargetName;

		messaging.subscribe(this.jobId+'.control.build-accepted', function(msg, head, info){
			var target = msg.target;
			var deferred = deferreds[target];
			deferred.resolve(msg);
		}).then(function(){
			var allSucceeded = Q.all(_.map(deferreds, function(deferred){
				var timeout = deferred.promise.timeout(2000);
				timeout.fail(function(err){
					rejectedTargetName = deferred.promise.targetName;
				});
				return timeout;
			}));

			allSucceeded.fail(function(rejection){
				anyRejected.reject("Timed out, worker "+rejectedTargetName+" never accepted the build.");
			});
		});

		return anyRejected.promise;
	}
});

/**
 * Given an array of promises, return a promise which will be fulfilled with the success or rejection of the first input promise to be fulfilled.
 */
function first(promises){
	var deferred = Q.defer();

	promises.forEach(function(promise){
		promise.then(function(){
			deferred.resolve(promise);
		}, function(){
			deferred.reject(promise);
		});
	});

	return deferred.promise;
}