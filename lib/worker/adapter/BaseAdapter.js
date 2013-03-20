var _            = require('lodash');
var childProcess = require('child_process');
var fs           = require('fs');
var logger       = require('../../common/logger')(__filename);
var my           = require('myclass');
var os           = require('os');

module.exports = my.Class({

	config: null,
	child: null,
	name: null, //overridden by subclass

	constructor: function(config){
		this.config = config;

		fs.exists(config.executable, _.bind(function(isExtant){
			isExtant || logger.error("Missing %s installation: %s", this.name, config.executable);
		}, this));
	},

	launch: function(url){
		var program;
		var arguments;
		var isMacOS = (os.platform() == "darwin");

		if(isMacOS){
			program = "/usr/bin/open";
			arguments = ['-a', this.config.executable, url];
		} else {
			program = this.config.executable;
			arguments = [url];
		}

		this.child = childProcess.spawn(program, arguments, { detached: true, stdio: 'ignore' });
		this.child.unref();

		logger.info("Sent %s to %s.", this.name, url);
	},

	close: function(){}

});