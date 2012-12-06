.PHONY: package logos

package:
	apack app.zip *

logos: meta/logo/icon-16.png meta/logo/icon-48.png meta/logo/icon-128.png

meta/logo/icon-16.png: meta/logo/icon.svg
	inkscape -z -e meta/logo/icon-16.png -w 16 -h 16 meta/logo/icon.svg

meta/logo/icon-48.png: meta/logo/icon.svg
	inkscape -z -e meta/logo/icon-48.png -w 48 -h 48 meta/logo/icon.svg

meta/logo/icon-128.png: meta/logo/icon.svg
	inkscape -z -e meta/logo/icon-128.png -w 128 -h 128 meta/logo/icon.svg
