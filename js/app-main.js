/*global authenticated:false Backbone:false initializeAppView:false */
// Activate the social buttons.
setTimeout(function () {
    'use strict';

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
    addScript('https://api.flattr.com/js/0.6/load.js?' +
            'mode=auto&uid=sharat87');

}, 10);

authenticated(function (auth) {
    'use strict';
    // Add the access_token to all requests made by backbone to the REST end
    // point.
    var originalSync = Backbone.sync;

    Backbone.sync = function (method, model, options) {
        options = options || {};
        var beforeSend = options.beforeSend;

        options.beforeSend = function (xhr) {
            xhr.setRequestHeader('Authorization',
                                 'Bearer ' + auth.accessToken);
            if (beforeSend) return beforeSend.call(this, xhr);
        };

        return originalSync.call(this, method, model, options);
    };

    // Startup up the app.
    initializeAppView();
});
