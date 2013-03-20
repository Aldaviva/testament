var _              = require('lodash');
var buildutils     = require('./buildutils');
var commander      = require('commander');
var config         = require('../common/config');
var Display        = require('./Display');
var glob           = require('glob');
var HarnessFactory = require('./HarnessFactory');
var http           = require('http');
var JUnitReporter  = require('./JUnitReporter');
var logger         = require('../common/logger')(__filename);
var messaging      = require('../common/messaging');
var my             = require('myclass');
var Q              = require('q');
var url            = require('url');

var Boss = my.Class({

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

		Q.all([this.createHarness(), this.startServer()])
			.thenResolve(messaging.connectionPromise)
			.then(this.listenForRunnerProgress)
			.then(this.advertiseBuild)
			.then(this.waitForAllRunnersToFinish)
			.then(this.writeReport)
			.then(this.waitForAllReportersToFinish)
			.then(this.shutdown)
			.fail(_.bind(function(err){
				logger.error(err.stack ? err.stack : err);
				this.shutdown(1);
			}, this));
	},

	listenForRunnerProgress: function(){
		logger.info("Listening for progress.");
		var jobId = this.jobId;

		var display = new Display(jobId, config.app.targets);

		var progressSubscription = messaging.subscribe(jobId+'.*.progress.#', '', {}, function(msg, head, info){
			// logger.log(info.routingKey, msg);
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
		
		_.forEach(targets, function(target){
			urlWithoutTarget.query['testament_target'] = target;
			var urlWithTarget = url.format(urlWithoutTarget);
			logger.info("Advertising build to %s.", target);
			messaging.publish(this.jobId+'.control.build-available.'+target, {
				url: urlWithTarget
			}/*, {
				mandatory: false //listen for errors with exchange.on('basic-return', function(err){})
			}*/);
		}, this);
	},

	waitForAllRunnersToFinish: function(){
		logger.info("Waiting for tests to finish.");

		var targets = config.app.targets;
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

	writeReport: function(stats){
		logger.info("Writing report.");

		_.forEach(stats, function(stat){
			logger.info('%s had %d successes.', stat.target, stat.passes);
			if(stat.failures > 0){
				this.totalFailures += stat.failures;
				logger.error('%s had %d failures.', stat.target, stat.failures);
			}
		}, this);
	},

	shutdown: function(totalFailures){
		logger.info("Shutting down.");

		this.server && this.server.close();
		messaging.shutdown();
		process.exit(this.totalFailures);
	},

	createHarness: function(){
		logger.info("Creating harness.");

		return Q.nfcall(glob, config.app.specs)
			.then(function(specs){
				logger.info("Found %d test spec files.", specs.length);
				return specs;
			})
			.then(_.partial(HarnessFactory.newHarness, this.jobId))
			.then(_.bind(function(harnessBuffer){
				this.url = '/harness-'+this.jobId+'.js';
				this.serverResponseBodies[this.url] = harnessBuffer;
			}, this));
	},

	startServer: function(){
		logger.info("Starting harness server.");
		var server = http.createServer(_.bind(function(req, res){
			// req.setSocketKeepAlive(false); 
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
				res.statusCode = 404;
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
		return Q.all(this.reporterEndedPromises);
	}
});

module.exports = Boss;