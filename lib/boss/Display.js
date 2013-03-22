var _               = require('lodash');
var BrowserDetector = require('./BrowserDetector');
var logger          = require('../common/logger')(__filename);
var my              = require('myclass');
var Terminal        = require('blessings');

var Display = module.exports = my.Class({

	STATIC: {
		BAR_CHARS: ' ▏▎▍▌▋▊▉█'
		// BAR_CHARS: '+ABCDEFGM'
	},

	job: null,
	targetNames: [],
	targetNameColumnWidth: 0,
	terminal: null,
	maxTotalCases: 0,
	isFirstRun: true,

	state: {},

	constructor: function(job, targetNames){
		this.job = job;
		this.targetNames = targetNames;

		this.targetNameColumnWidth = _(targetNames).pluck('length').max().value();
		this.terminal = new Terminal();

		this.state = _.object(targetNames, _.map(targetNames, function(targetName){
			return {
				completeCases: 0,
				totalCases: 0,
				browser: '',
				os: '',
				version: '',
				osVersion: ''
			};
		}));
	},

	render: _.throttle(function(){
		var targetName, targetState;

		var term          = this.terminal;
		var numTargets    = this.targetNames.length;
		var screenWidth   = term.width || 80;

		if(this.isFirstRun){
			this.isFirstRun = false;
		} else {
			term.write(term.moveUp(numTargets));
		}

		for(var targetIdx = 0; targetIdx < numTargets; ++targetIdx){
			targetName  = this.targetNames[targetIdx];
			targetState = this.state[targetName];

			var percentComplete = targetState.completeCases / (targetState.totalCases | 1);

			var nameColumn = pad(targetName, this.targetNameColumnWidth).r;

			var countColumnWidth = (''+this.maxTotalCases).length * 2 + 1;
			var countColumn = pad(targetState.completeCases + '/' + targetState.totalCases, countColumnWidth);

			var barColumnWidth = screenWidth - (this.targetNameColumnWidth + 3 + countColumnWidth + 3 + 2);
			var barColumn = this._renderBar(percentComplete, barColumnWidth);
			// var barColumn = ' | '+percentComplete*100 + '%';

			term.writeln(nameColumn + ' | ' + countColumn + ' | ' + barColumn + ' |');
		}


	}, 1000/15),

	_renderBar: function(fraction, totalCols){
		return this._getLeadingCols(fraction, totalCols) + this._getMiddleCol(fraction, totalCols) + this._getTrailingCols(fraction, totalCols);
	},

	_getLeadingCols: function(fraction, totalCols){
	    return fill(Display.BAR_CHARS[Display.BAR_CHARS.length-1], Math.floor(fraction * totalCols));
	},

	_getTrailingCols: function(fraction, totalCols){
	    return fill(Display.BAR_CHARS[0], Math.ceil((1-fraction) * totalCols) - 1);
	},

	_getMiddleCol: function(fraction, totalCols){
	    if(fraction < 1){
	        var lowerFraction = Math.floor(fraction * totalCols) / totalCols;
	        var upperFraction = Math.ceil( fraction * totalCols) / totalCols;
	        var colFraction   = (fraction - lowerFraction) / (upperFraction - lowerFraction);
	        var charIndex     = Math.max(0, Math.min(Math.round(colFraction * Display.BAR_CHARS.length-1), Display.BAR_CHARS.length-1)) || 0;
	        return Display.BAR_CHARS[charIndex];
	    } else {
	        return '';
	    }
	},

	onProgress: function(targetName, event, data){
		var targetState = this.state[targetName];

		switch(event){
			case 'case-pass':
			case 'case-fail':
			case 'case-skip':
				targetState.completeCases++;
				break;

			case 'runner-start':
				_.extend(targetState, new BrowserDetector(data.userAgent), data);
				this.maxTotalCases = Math.max(this.maxTotalCases, data.totalCases);
				break;

			default:
				break;
		}

		this.render();
	}
});

function fill(character, len){
    return Array(len+1).join(character);
}

/** https://gist.github.com/stagas/992678 */
function pad(string, length, paddingChar, u){
	var s = string, l = length, c = paddingChar;
	/*jsl:ignore*/
	c=new Array((l=(l||0)-(''+s).length+1)>0&&l||0).join(c!=u?c:' ');return {l:c+s,r:s+c,toString:function(){return c+s}}
	/*jsl:end*/
}