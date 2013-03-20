var _           = require('lodash');
var BaseAdapter = require('./BaseAdapter');
var my          = require('myclass');
var os          = require('os');

var DEFAULT_EXECUTABLE_WIN = process.env['LOCALAPPDATA'] + "\\Google\\Chrome\\Application\\chrome.exe";
var DEFAULT_EXECUTABLE_MAC = "/Applications/Google Chrome.app";

var Chrome = module.exports = my.Class(BaseAdapter, {

	name: "Chrome",

	constructor: function(config){
		_.defaults(config, {
			executable: os.platform() == 'win32'
				? DEFAULT_EXECUTABLE_WIN
				: DEFAULT_EXECUTABLE_MAC
		});

		Chrome.Super.call(this, config);
	}

});