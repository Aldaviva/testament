var _         = require('lodash');
var commander = require('commander');
var fs        = require('fs');
var logger    = require('./logger')(__filename);

// This should match config.json.example
var config = module.exports = {
	common : {
		amqp : {
			host     : "10.4.4.251",
			vhost    : "/",
			port     : 5672,
			login    : "guest",
			password : "guest",
			exchange : "testament"
		},
		logging : {
			level    : 'log',
			file     : null,
			cores    : false
		}
	},

	app: {
		targets : [],
		specs   : './src/test/*.js',
		reports : {
			format : 'testng',
			dir    : './build/test-reports'
		},
		url     : 'http://skadi.bluejeansnet.com/harness-sample',
		start   : null,
		stop    : null
	},

	boss: {
		httpPort : 8378,
		progress : 'bars'
	},

	worker: {
		targets: {
			/*'win-chrome': {
				adapter        : 'chrome',
				enabled        : false,
				executable     : 'C:\\Users\\Ben\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe'
			},
			"win-firefox": {
				adapter        : 'firefox',
				enabled        : false,
				executable     : "c:\\Programs\\Internet\\Firefox\\firefox.exe"
			},
			'win-ie9': {
				adapter        : 'ie',
				enabled        : false,
				version        : 9,
				instructionSet : 'x86'
			},
			'win-ie8': {
				adapter        : 'ie',
				enabled        : false,
				version        : 8
			},
			'win-opera': {
				adapter        : 'opera',
				enabled        : true,
				executable     : "C:\\Programs\\Internet\\Opera\\opera.exe"
			}*/
		}
	}
};

var isInitialized = false;

module.exports.init = function(config_){
	if(!isInitialized){
		isInitialized = true;

		if(config_){
			copyConfig(config_);
			applyLogConfig();
			logger.log("Using programmatic configuration.");
			onLoadedConfig();
		} else {
			commander
				.option('-c, --config [file]', 'Configuration file')
				.parse(process.argv);

			var filename = commander.config || "./config.json";

			if(fs.existsSync(filename)){
				var configText = fs.readFileSync(filename, 'utf8');
				try {
					var configObj = JSON.parse(configText);
					copyConfig(configObj);
				} catch(e){
					logger.error("%s in %s", e.message, filename);
				}

				applyLogConfig();
				logger.log("Using %s.", filename);
				onLoadedConfig();

			} else {
				applyLogConfig();
				logger.warn("Using defaults (missing %s).", filename);
				onLoadedConfig();
			}
		}
	}

	return config;
};

function applyLogConfig(){
	if(config.common.logging.file){
		logger.useFile(config.common.logging.file);
	}
	logger.setLevel(config.common.logging.level);
}

function onLoadedConfig(){

	// Cleanse target names of AMQP routing key special characters
	var AMQP_ROUTING_KEY_SPECIAL_CHARS_PATTERN = /[\.*#]/g;

	config.app.targets && (config.app.targets = _.map(config.app.targets, function(targetName){
		return targetName.replace(AMQP_ROUTING_KEY_SPECIAL_CHARS_PATTERN, '-');
	}));

	var dirtyWorkerTargetKeys = [];
	config.worker.targets && _.each(config.worker.targets, function(target, name){
		if(AMQP_ROUTING_KEY_SPECIAL_CHARS_PATTERN.test(name)){
			dirtyWorkerTargetKeys.push(name);
			var cleanName = name.replace(AMQP_ROUTING_KEY_SPECIAL_CHARS_PATTERN, '-');
			config.worker.targets[cleanName] = target;
		}
	});
	_.each(dirtyWorkerTargetKeys, function(dirtyKey){
		delete config.worker.targets[dirtyKey];
	});
}

function copyConfig(config_){
	_.merge(config, config_);
}