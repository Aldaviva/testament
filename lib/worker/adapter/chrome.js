var _            = require('lodash');
var childProcess = require('child_process');
var fs           = require('fs');
var logger       = require('../../common/logger')(__filename);
var my           = require('myclass');
var os           = require('os');

var DEFAULT_EXECUTABLE_WIN = "%LOCALAPPDATA%\\Google\\Chrome\\Application\\chrome.exe";
var DEFAULT_EXECUTABLE_MAC = "/Applications/Chrome"; //TODO fix this, i just guessed

module.exports = my.Class({

	config: null,
	child: null,

	constructor: function(config){
		this.config = config;

		_.defaults(config, {
			executable: os.platform() == 'win32'
				? DEFAULT_EXECUTABLE_WIN
				: DEFAULT_EXECUTABLE_MAC
		});

		fs.exists(config.executable, function(isExtant){
			isExtant || logger.error("Missing Chrome installation: %s", config.executable);
		});
	},

	launch: function(jobId, url, target){
		this.child = childProcess.spawn(this.config.executable, [url], { detached: true, stdio: 'ignore' });
		this.child.unref();

		logger.info("Sent Chrome to %s.", url);
	}
});