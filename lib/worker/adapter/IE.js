var _           = require('lodash');
var BaseAdapter = require('./BaseAdapter');
var logger      = require('../../common/logger')(__filename);
var my          = require('myclass');
var os          = require('os');

var IE = module.exports = my.Class(BaseAdapter, {

	name: 'IE',

	constructor: function(config){
		var osIs32bit     = (os.arch() === 'x86');
		var targetIs32bit = (config.instructionSet !== 'x64');

		var programFiles = (osIs32bit || !targetIs32bit)
			? 'ProgramFiles'
			: 'ProgramFiles(x86)';

		if(osIs32bit && !targetIs32bit){
			logger.warn("You specified 64-bit IE, but this is a 32-bit machine. Using 32-bit IE instead.");
		}

		_.defaults(config, {
			executable: process.env[programFiles] + "\\Internet Explorer\\iexplore.exe"
		});

		IE.Super.call(this, config);
	}
});