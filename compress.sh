#!/usr/bin/env bash

main () {
    prepare-build

    # Swith the global object from window to a plain local object.
    publish js/primer.js
    publish js/adate.js
    publish js/views.js
    publish js/models.js
    publish auth/auth-lib.js

    # Combine dev scripts into the publish script.
    combine-dev-scripts index.html app.js
    java -jar closure-compiler/compiler.jar \
        --js_output_file app-min.js \
        app.js
    mv app-min.js app.js

    # Use the minified version of vendor libs, where applicable.
    mv vendor/backbone-min.js vendor/backbone.js

    # Remove the dev scripts and activate the publish script. Also remove/change
    # other dev to pub stuff.
    publish index.html

    # Delete all dev-only files.
    rm -r \
        Makefile \
        spec \
        spec-runner.html \
        vendor/jasmine-1.2.0 \
        js \
        auth/auth-lib.js \
        closure-compiler \
        meta/logo/icon.svg \
        meta/screenshots \
        meta/promotional

    # Update the app name in manifest (remove dev suffix).
    update-manifest

    exec rm compress.sh
}

prepare-build () {
    # Prepare a build directory and enter it, but nothing is processed.
    rm -rf build
    mkdir build
    ls | grep -vF build | xargs cp -rt build
    cd build
}

combine-dev-scripts () {
    local html_file="$1"
    local outjs="$2"

    {
        echo '(function () {'
        awk '
                /↓dev/ { echo = 1; next }
                /↑dev/ { echo = 0 }
                echo && /<script/ { print }
            ' "$html_file" \
            | sed 's/^.*src=//; s/>.*$//' \
            | xargs cat \
            | grep -v '¬pub'
        echo '}());'
    } > "$outjs"

}

publish () {
    local file="$1"
    local outfile="tmp-outfile-$RANDOM"

    awk '
        BEGIN { echo = 1 }

        /↓dev/ { echo = 0 }
        /↑dev/ { echo = 1; next }

        /[↓↑]pub/ { next; }

        echo { print }
    ' $file > $outfile

    mv $outfile $file
}

update-manifest () {
    sed -i 's/"Glists Dev"/"Glists"/' manifest.json
}

main "$@"
