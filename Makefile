JSL := jsl

all: lint

lint:
	@$(JSL) --conf=tools/jsl.conf --nologo --nosummary --nofilelisting `find lib -not -path *thirdparty* -type f -name \*.js -printf '%p '`