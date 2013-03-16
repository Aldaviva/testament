var _            = require('lodash');
var childProcess = require('child_process');
var fs           = require('fs');
var logger       = require('../../common/logger')(__filename);
var my           = require('myclass');
var os           = require('os');

//TODO these defaults are completely untested and almost certainly wrong
var DEFAULT_EXECUTABLE_WIN = "%PROGRAMFILES%\\Opera\\Opera.exe";
var DEFAULT_EXECUTABLE_MAC = "/Applications/Opera";

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
			isExtant || logger.error("Missing Opera installation: %s", config.executable);
		});
	},

	//TODO parse the URL, insert the target as a query param or something, and reassemble into a URL to pass to the browser
	launch: function(jobId, url, target){
		this.child = childProcess.spawn(this.config.executable, [url], { detached: true, stdio: 'ignore' });
		this.child.unref();

		logger.info("Sent Opera to %s.", url);

		this.child.on('exit', _.bind(function(event){
			this.child = null;

			if(event.code === 0){
				logger.info("Opera exited.");
			} else {
				logger.warn("Opera exited with code %d and signal %s.", event.code, event.signal);
			}
		}, this));
	},

	close: function(){
		this.child && this.child.kill();
	}
});