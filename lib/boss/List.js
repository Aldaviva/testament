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
		}
	},

	constructor: function(job, targetNames){
		this.job = job;
		this.targetNames = targetNames;
	},

	onProgress: function(targetName, event, data){
		if(_.contains(['case-pass', 'case-fail', 'case-skip'], event)){
			console.log(colors[List.COLORS[event]]([
				event.substr(5).toUpperCase(), 
				data.fullTitle, 
				"("+targetName+")"
			].join(' ')));
		}

		if(data.err){
			console.log(colors[List.COLORS['case-fail']](data.err.message + '\n' + (data.err.stack || '')));
		}
	}

});