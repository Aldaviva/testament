var _        = require('lodash');
var logger   = require('../common/logger')(__filename);
var my       = require('myclass');
var Terminal = require('blessings');

var Display = module.exports = my.Class({

	lineNumbers: {},
	targetNameColumnWidth: 0,
	testsComplete: {},
	maxLineNumber: 0,
	totalCases: {},

	constructor: function(job, targets){
		this.job = job;
		this.targets = targets;

		this.targetNameColumnWidth = _(targets).pluck('length').max().value();
		this.terminal = new Terminal();

		this.writeRows();

		/*_.forEach(this.targets, function(target){
			this.testsComplete[target] = 0;
		}, this);*/
	},

	writeRows: function(){
		this.maxLineNumber = 0;

		_.forEach(this.targets, function(target){
			this.terminal.writeln(target);
			this.lineNumbers[target] = this.maxLineNumber++;
			this.testsComplete[target] = 0;
			this.totalCases[target] = 1;
		}, this);

		// this.terminal.write(this.terminal.moveUp(1));

		// this.terminal.write(this.terminal.moveUp(line));
	},

	onProgress: function(target, event, data){
		// logger.warn("progress: %s %s", target, event);
		switch(event){
			case 'case-pass':
			case 'case-fail':
			case 'case-skip':
				// var testsComplete = ++ this.testsComplete[target];
				// process.stdout.write(testsComplete + '\n');
				// this.terminal.write(this.terminal.moveUp(1));
				var line = this.lineNumbers[target];
				var testsComplete = ++ this.testsComplete[target];
				this.terminal.write(this.terminal.moveUp(this.maxLineNumber - line));
				this.terminal.write(this.terminal.moveRight(this.targetNameColumnWidth + 1));
				this.terminal.writeln(testsComplete + '/' + this.totalCases[target]);
				this.terminal.write(this.terminal.moveDown(this.maxLineNumber - line - 1));
				break;
			case 'runner-start':
				this.totalCases[target] = data.numTests;
				break;
			default:
				break;
		}
	}


});

/*(function(){

	var display = new Display(1, ['Chrome', 'Opera']);

	setInterval(function(){
		display.onProgress('Chrome', 'test-pass');
		display.onProgress('Opera', 'test-pass');
	}, 500);

})();*/