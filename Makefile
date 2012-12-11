.PHONY: build package logos

build:
	rm -f app.zip
	./compress.sh

package: logos build
	cd build && apack ../app.zip *

logos: meta/logo/icon-16.png meta/logo/icon-48.png meta/logo/icon-128.png

meta/logo/icon-16.png: meta/logo/icon.svg
	inkscape -z -e meta/logo/icon-16.png -w 16 -h 16 meta/logo/icon.svg

meta/logo/icon-48.png: meta/logo/icon.svg
	inkscape -z -e meta/logo/icon-48.png -w 48 -h 48 meta/logo/icon.svg

meta/logo/icon-128.png: meta/logo/icon.svg
	inkscape -z -e meta/logo/icon-128.png -w 96 -h 96 meta/logo/icon.svg
	convert meta/logo/icon-128.png \
		-gravity center \
		-background transparent \
		-extent 128x128 \
		meta/logo/icon-128.png
