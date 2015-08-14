develop:
	npm install
test:
	testem

deploy:
	scp index.html *.js *.css smeuh.org:www/delbor/siren/
