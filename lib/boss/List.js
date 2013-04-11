var _      = require('lodash');
var logger = require('../common/logger')(__filename);
var my     = require('myclass');
var colors = require('cli-color');

var List = module.exports = my.Class({

	STATIC: {
		COLORS: {
			'case-pass': 'greenBright',
			'case-skip': 'cyanBright',
			'case-fail': 'redBright'
		},
		LEVELS: {
			'case-pass': 'info',
			'case-skip': 'warn',
			'case-fail': 'error'
		}
	},

	constructor: function(job, targetNames){
		this.job = job;
		this.targetNames = targetNames;
	},

	onProgress: function(targetName, event, data){
		if(_.contains(['case-pass', 'case-fail', 'case-skip'], event)){
			var level = List.LEVELS[event];
			logger[level](colors[List.COLORS[event]]([
				event.substr(5).toUpperCase(), 
				data.fullTitle, 
				"("+targetName+")"
			].join(' ')));
		}

		if(data.err){
			logger.error(colors[List.COLORS['case-fail']](data.err.message + '\n' + (data.err.stack || '')));
		}
	}

});