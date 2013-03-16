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
			cores    : true
		},
	},

	app: {
		targets : ['win-chrome', 'win-firefox', 'win-ie8', 'win-ie9', 'mac-chrome', 'mac-firefox', 'mac-safari'],
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
			'win-chrome': {
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
			}
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
			logger.info("Using programmatic configuration.");
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
				logger.info("Using %s", filename);
				onLoadedConfig();

			} else {
				applyLogConfig();
				logger.info("Using defaults (missing %s).", filename);
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
	/*for(var key in config){
		if(config.hasOwnProperty(key) && key != 'init'){
			logger.log("%s = %s", key, config[key]);
		}
	}*/

	/*if(config.uid != null && process.setuid){
		try {
			process.setuid(config.uid);
			logger.info("setuid to %s", process.getuid());
		} catch(e){
			logger.error("Unable to setuid to %s: %s", config.uid, e);
		}
	}*/
}

function copyConfig(config_){
	_.merge(config, config_);
}