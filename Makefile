.PHONY: build

DATE := $(shell date +%Y%m%d%H%M%S)

build:
	rm -rf build
	mkdir -p build
	lessc style.less style.css
	cp -r img build/
	cp index.html build/
	cp style.css build/style-$(DATE).css
	cp siren.js build/siren-$(DATE).js
	sed -i s/style.css/style-$(DATE).css/ build/index.html
	sed -i s/siren.js/siren-$(DATE).js/ build/index.html

develop:
	npm install

test:
	testem

deploy: build
	cd build && scp -r img index.html *.js *.css smeuh.org:www/delbor/siren/

css:
	lessc style.less style.css
