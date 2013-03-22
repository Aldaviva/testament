var _            = require('lodash');
var childProcess = require('child_process');
var fs           = require('fs');
var logger       = require('../../common/logger')(__filename);
var my           = require('myclass');
var os           = require('os');
var path         = require('path');
var Q            = require('q');

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

	close: function(){},

	getVersion: function(){
		var deferred = Q.defer();

		if(os.platform() == "win32"){

			var result = '';
			var child = childProcess.spawn(path.join(__dirname, '../../../tools/programversion.exe'), [this.config.executable]);
			child.stdout.on('data', function(data){
				result += data;
			});
			child.on('close', function(code){
				if(code === 0){
					deferred.resolve(result);
				} else {
					deferred.reject(code);
				}
			});

		} else {
			deferred.reject("not implemented");
		}

		return deferred.promise;
	}

});