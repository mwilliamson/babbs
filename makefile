.PHONY: test 

test: node_modules/.bin/nodeunit
	node_modules/.bin/nodeunit `find test -type d`

node_modules/.bin/nodeunit:
	npm install
