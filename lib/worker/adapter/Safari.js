var _            = require('lodash');
var childProcess = require('child_process');
var fs           = require('fs');
var logger       = require('../../common/logger')(__filename);
var my           = require('myclass');
var os           = require('os');

var DEFAULT_EXECUTABLE = "/Applications/Safari.app";

var Safari = module.exports = my.Class({

	name: "Safari",

	constructor: function(config){
		_.defaults(config, {
			executable: DEFAULT_EXECUTABLE
		});

		Safari.Super.call(this, config);
	}

});