var _        = require('lodash');
var logger   = require('../common/logger')(__filename);
var my       = require('myclass');
var Terminal = require('blessings');

var Display = module.exports = my.Class({

	STATIC: {
		BAR_CHARS: ['▏▎▍▌▋▊▉']
	},

	lineNumbers: {},
	targetNameColumnWidth: 0,
	testsComplete: {},
	maxLineNumber: 0,
	totalCases: {},

	state: {
		'win-opera': {
			complete: 4,
			total: 10,
			name: 'Opera (Windows)'
		}
		
	},

	constructor: function(job, targets){
		this.job = job;
		this.targets = targets;

		this.targetNameColumnWidth = _(targets).pluck('length').max().value();
		this.terminal = new Terminal();

		this.writeRows();
	},

	writeAll: function(){

	},

	/*writeRows: function(){
		this.maxLineNumber = 0;

		_.forEach(this.targets, function(target){
			this.terminal.writeln(target);
			this.lineNumbers[target] = this.maxLineNumber++;
			this.testsComplete[target] = 0;
			this.totalCases[target] = 1;
		}, this);
	},

	onProgress: function(target, event, data){
		switch(event){
			case 'case-pass':
			case 'case-fail':
			case 'case-skip':
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
	}*/
});

/*(function(){

	var display = new Display(1, ['Chrome', 'Opera']);

	setInterval(function(){
		display.onProgress('Chrome', 'test-pass');
		display.onProgress('Opera', 'test-pass');
	}, 500);

})();*/