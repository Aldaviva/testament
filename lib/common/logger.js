var colors = require('cli-color');
var fs     = require('fs');
var path   = require('path');
var util   = require('util');

colors.noop = function(x){ return x; };

var LEVELS = {
	'log'   : 0,
	'info'  : 1,
	'warn'  : 2,
	'error' : 3
};

var LEVEL_COLORS = {
	log   : colors.noop,
	info  : colors.blueBright,
	warn  : colors.noop,
	error : colors.noop
};

var LINE_COLORS = {
	log   : colors.noop,
	info  : colors.noop,
	warn  : colors.yellowBright.bgBlack,
	error : colors.redBright.bgBlack
};

var logFile = null;
var minAllowedLevel = LEVELS['log'];
var maxModuleNameLength = 9;

module.exports = function(filename){
	maxModuleNameLength = Math.max(maxModuleNameLength, getModuleNameFromFileName(filename).length);

	return {
		log     : function(){ processMessage('log',   filename, arguments); },
		info    : function(){ processMessage('info',  filename, arguments); },
		warn    : function(){ processMessage('warn',  filename, arguments); },
		error   : function(){ processMessage('error', filename, arguments); },
		useFile : function(file){
			if(logFile){
				fs.closeSync(logFile);
			}
			logFile = fs.openSync(file, 'a');
		},
		setLevel : function(level){
			if(LEVELS[level] != null){
				minAllowedLevel = LEVELS[level];
			} else {
				processMessage('error', __filename, ["Invalid log level %s. Valid log levels are log, info, warn, error", level]);
			}
		}
	};
};

function processMessage(level, fileName, formatAndReplacements){
	var isLevelAllowed = (LEVELS[level] >= minAllowedLevel);

	if(isLevelAllowed){
		var moduleName = getModuleNameFromFileName(fileName);
		moduleName = moduleName.charAt(0).toUpperCase() + moduleName.substr(1);

		var formatted = {
			level      : (level+"    ").substr(0,5),
			date       : ((new Date()).getTime()/1000 + "0000").substr(0, 14),
			moduleName : (moduleName+"                                  ").substr(0, maxModuleNameLength),
			message    : util.format.apply(null, formatAndReplacements)
		};

		if(!logFile){
			formatted.level = LEVEL_COLORS[level](formatted.level);
		}

		var completeMessage = util.format(
			"%s ♦ %s ♦ %s : %s",
			formatted.level,
			formatted.date,
			formatted.moduleName, 
			formatted.message
		);

		if(!logFile){
			completeMessage = LINE_COLORS[level](completeMessage);
		}

		if(logFile){
			var buffer = new Buffer(completeMessage+"\n");
			fs.write(logFile, buffer, 0, buffer.length, null);
		} else {
			console[level](completeMessage);
		}
	}
}

function getModuleNameFromFileName(fileName){
	return path.basename(fileName, '.js');
}