var _         = require('lodash');
var commander = require('commander');
var os        = require('os');
var util      = require('util');

module.exports.generateJob = function(){
	return generateUUID();
};

//TODO handle multiple local IPs
module.exports.getScriptUrl = function(jobId){
	if(_.isEmpty(jobId)){
		commander
			.option('-j, --job [jobId]', 'Job ID')
			.parse(process.argv);
		jobId = commander.job;
	}
	
	return util.format('http://%s:%d/harness-%s.js', getLocalIpAddress(), config.boss.httpPort, jobId);
};

/** https://gist.github.com/LeverOne/1308368 */
function generateUUID(a,b){
	for(b=a='';a++<36;b+=a*51&52?(a^15?8^Math.random()*(a^20?16:4):4).toString(16):'-');return b
}

function getLocalIpAddress(){
	var addresses = _(os.networkInterfaces())
		.values()
		.flatten()
		.where({ family: 'IPv4', internal: false })
		.pluck('address')
		.value();
	return addresses[0];
};