/** http://jsfiddle.net/HB5Vs/11/ */
module.exports = function(func, expectedArgTypes){
	return function()
	{
		for(var actualIdx = 0,
				expectedIdx = 0,
				expectedLength = expectedArgTypes.length,
				expectedArgs = [],
				actualLength=arguments.length,
				actualArg;
			actualIdx < actualLength || expectedIdx < expectedLength;
			++expectedIdx)
		{
			if(actualIdx < actualLength)
			{
				actualArg = arguments[actualIdx];
				if(expectedIdx >= expectedLength
					|| actualArg === null
					|| actualArg === undefined
					|| (typeof actualArg == 'number' && isNaN(actualArg))
					|| (actualArg.constructor.name == (expectedArgTypes[expectedIdx].name || expectedArgTypes[expectedIdx])))
				{
					expectedArgs[expectedIdx] = actualArg;
					++actualIdx;
				}
			}
		}
		return func.apply(null, expectedArgs);
	};
};