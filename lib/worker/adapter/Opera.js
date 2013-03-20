var _           = require('lodash');
var BaseAdapter = require('./BaseAdapter');
var my          = require('myclass');
var os          = require('os');

var DEFAULT_EXECUTABLE_WIN = process.env['ProgramFiles(x86)']+"\\Opera\\Opera.exe";
var DEFAULT_EXECUTABLE_MAC = "/Applications/Opera.app";

var Opera = module.exports = my.Class(BaseAdapter, {

	name: 'Opera',

	constructor: function(config){
		_.defaults(config, {
			executable: os.platform() == 'win32'
				? DEFAULT_EXECUTABLE_WIN
				: DEFAULT_EXECUTABLE_MAC
		});

		Opera.Super.call(this, config);
	}
});