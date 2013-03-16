var HarnessFactory = require('./src/HarnessFactory');

HarnessFactory.newHarness(1, ['../sample-test-suite'])
	.then(function(buffer){
		// console.log('finished');
		console.log(buffer);
	})
	.done();