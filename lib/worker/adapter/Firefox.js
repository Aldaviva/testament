var _           = require('lodash');
var BaseAdapter = require('./BaseAdapter');
var my          = require('myclass');
var os          = require('os');

var DEFAULT_EXECUTABLE_WIN = process.env['ProgramFiles(x86)']+"\\Mozilla Firefox\\Firefox.exe";
var DEFAULT_EXECUTABLE_MAC = "/Applications/Firefox.app";

var Firefox = module.exports = my.Class(BaseAdapter, {

	name: 'Firefox',

	constructor: function(config){
		_.defaults(config, {
			executable: os.platform() == 'win32'
				? DEFAULT_EXECUTABLE_WIN
				: DEFAULT_EXECUTABLE_MAC
		});

		Firefox.Super.call(this, config);
	}
});