authenticated(function (auth) {

    // Startup up the app.
    initializeAppView();

    // Activate the social buttons.
    setTimeout(function () {

        var canonicalUrl = document.querySelector('link[rel=canonical]').href,
            addScript = function (url) {
                var js = document.createElement('script');
                js.async = true;
                js.src = url;
                document.body.appendChild(js);
            };

        // Twitter button.
        document.getElementById('twitter-ln').dataset.url = canonicalUrl;
        addScript('https://platform.twitter.com/widgets.js');

        // Google +1 button.
        // Automatically picks up the canonical url.
        addScript('https://apis.google.com/js/plusone.js');

        // Flattr button.
        // FIXME: Points to my homepage!
        document.getElementById('flattr-ln').href = 'http://sharats.me';
        addScript('https://api.flattr.com/js/0.6/load.js?'+
                'mode=auto&uid=sharat87');

    }, 10);

});
