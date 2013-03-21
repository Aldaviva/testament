JSL := jsl

all: lint

lint:
	@$(JSL) --conf=build/jsl.conf --nologo --nosummary --nofilelisting `find lib -not -path *thirdparty* -type f -name \*.js -printf '%p '`