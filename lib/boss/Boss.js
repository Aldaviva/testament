var _              = require('lodash');
var buildutils     = require('./buildutils');
var commander      = require('commander');
var config         = require('../common/config');
var glob           = require('glob');
var HarnessFactory = require('./HarnessFactory');
var http           = require('http');
var logger         = require('../common/logger')(__filename);
var messaging      = require('../common/messaging');
var my             = require('my.class');
var Q              = require('q');
var url            = require('url');

var Boss = module.exports = my.Class({

	STATIC: {
		HARNESS_SERVER_FILENAME_PATTERN: /^\/harness-([0-9a-f\-]+)\.js$/
	},

	jobId: null,
	server: null,
	serverResponseBodies: {},

	constructor: function(){
		_.bindAll(this);

		commander
			.option('-j, --job [jobId]', 'Job ID')
			.parse(process.argv);

		this.jobId = commander.job;

		Q.all([createHarness(), startServer()])
			.then(listenForRunnerProgress)
			.then(advertiseBuild)
			.then(waitForAllRunnersToFinish)
			.then(writeReport)
			.then(shutdown);
		}, this));
	},

	listenForRunnerProgress: function(){
		//TODO progress module
		messaging.subscribe(this.jobId+'.progress.#', null, function(msg, head, info){
			logger.log("Progress", message);
		});
	},

	advertiseBuild: function(){
		var targets = config.app.targets;

		var urlWithoutTarget = url.parse(config.app.url, true);
		delete urlWithoutTarget.search;
		
		_.forEach(targets, function(target){
			urlWithoutTarget.query['testament_target'] = target;
			messaging.publish(this.jobId+'.control.build-available.'+target, {
				url: url.format(urlWithoutTarget)
			}, {
				mandatory: true //listen for errors with exchange.on('basic-return', function(err){})
			});
		}, this);
	},

	waitForAllRunnersToFinish: function(){
		var targets = config.app.targets;
		var promises = _.object(targets, _.map(targets, function(){
			return Q.defer();
		}));

		messagingClient.subscribe(this.jobId+'.progress.runner-end', null, function(msg, head, info){
			var target = msg.target;
			var promise = promises[target];
			promise.resolve(msg);
		});

		return Q.all(promises);
	},

	writeReport: function(stats){
		_.forEach(stats, function(stat){
			logger.info('%s had %d successes.', stat.target, stat.passed);
			if(stat.failed > 0){
				logger.error('%s had %d failures.', stat.target, stat.failed);
			}
		});
	},

	shutdown: function(){
		this.server && this.server.close();
		messaging.shutdown();
	},

	createHarness: function(){
		return Q.nfcall(glob, config.app.specs)
			.then(_.partial(HarnessFactory.newHarness, this.jobId, matches))
			.then(_.bind(function(harnessBuffer){
				this.url = '/harness-'+this.jobId+'.js';
				this.serverResponseBodies[this.url] = harnessBuffer;
			}, this));
	},

	startServer: function(){
		var server = http.createServer(function(req, res){
			req.setSocketKeepAlive(false); //allow fast shutdowns, since clients only make 1 request anyway

			if(req.method == 'GET'){
				var harnessBuffer = serverResponseBodies[req.url];
				if(harnessBuffer){
					res.setHeader('Content-Type', 'text/javascript');
					res.write(harnessBuffer);
				} else {
					res.setHeader('Content-Type', 'text/plain');
					res.statusCode = 404;
					res.write("Missing harness for job "+jobId);
				}
				res.end();

			} else {
				res.statusCode = 404;
				res.end("What do you think this is, some sort of fancy application server?");
			}
		});

		return Q.nfcall(server.listen, config.boss.httpPort)
			.fail(function(err){
				logger.error("Could not listen for HTTP requests on %d: %s", config.boss.httpPort, err);
				throw err;
			})
			.then(function(){
				var address = server.address();
				logger.log("Serving harness from %s:%d", address.address, address.port);
				return server;
			});
	}
});