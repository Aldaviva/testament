var buildutils = require('./boss/buildutils');
var commander  = require('commander');
var panic      = require('panic');

if(process.argv.length <= 2){
	usage();
} else {
	switch(process.argv[2]){
		case 'generate-job':
			console.log(buildutils.generateJob());
			break;
		case 'get-script-url':
			console.log(buildutils.getScriptUrl());
			break;
		case 'listen':
			initConfig();
			require('./worker/Worker').listen();
			break;
		case 'test':
			initConfig();
			var Boss = require('./boss/Boss');
			new Boss();
			break;
		case '-?':
		case 'help':
		case '-h':
		case '--help':
			usage();
			break;
		default:
			console.log('Unrecognized mode: %s', process.argv[2]);
			usage();
			break;
	}
}

function usage(){
	console.log("Testament usage:");
	console.log("  node testament generate-job");
	console.log("  node testament get-script-url --job <job>");
	console.log("  node testament test --job <job> --config testament.config.json");
	console.log("  node testament listen --config testament.config.json");
}

function initConfig(){
	var config = require('./common/config').init();
	var panicLogger = require('./common/logger')("PANIC");

	process.on('uncaughtException', function(err){
		panicLogger.error(err.stack ? err.stack : err);
	});

	if(config.common.logging.cores){
		panic.enablePanicOnCrash();
	}
}