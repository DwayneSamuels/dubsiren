develop:
	npm install

test:
	testem

deploy:
	scp -r img index.html *.js *.css smeuh.org:www/delbor/siren/
