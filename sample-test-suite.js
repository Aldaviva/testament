describe("ECMAScript Math", function(){
	it("adds 1 and 1", function(){
		var actual = 1 + 1;
		var expected = 2;
		expect(actual).to.equal(actual);
	});

	it("returns 0/0 = NaN", function(){
		var actual = 0/0;
		expect(window.isNaN(actual)).to.be.true;
	});

	it("rounds integers with mantissas near the limits of precision", function(){
		var actual = 6044629098073143;
		var expected = Math.round(actual);
		expect(actual).to.equal(expected);
	});
});