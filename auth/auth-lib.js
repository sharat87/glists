(function () {

    // Call the given function, with authentication stuff handled.
    window.authenticated = function (callback) {

        var verifyToken = function (auth) {
            $.ajax({
                url: 'https://www.googleapis.com/oauth2/v1/tokeninfo',
                data: {
                    access_token: auth.access_token
                },
                dataType: 'json',
                success: function (response) {
                    if (response.audience !== CLIENT_ID) {
                        // Something went horribly wrong.
                        getNewToken(verifyToken);
                        return;
                    }

                    auth.verified = true;
                    auth.expires_in = response.expires_in;
                    localStorage.auth = JSON.stringify(auth);

                    setTimeout(function () {
                        getNewToken(verifyToken);
                    }, Math.max(0, auth.expires_in - 60) * 1000);

                    injectBackbone(auth);
                    callback(auth);
                },
                error: function () {
                    localStorage.removeItem('auth');
                    getNewToken(verifyToken);
                }
            });
        };

        if (typeof localStorage.auth === 'undefined' ||
                (auth = JSON.parse(localStorage.auth)) === null) {
            getNewToken(verifyToken);
        } else {
            verifyToken(auth);
        }
    };

    var authCallback = null,
        authUrl = 'https://accounts.google.com/o/oauth2/auth' +
        '?response_type=token' +
        '&client_id=' + CLIENT_ID +
        '&redirect_uri=' + escape('https://www.google.com/robots.txt') +
        '&scope=' + escape('https://www.googleapis.com/auth/tasks') +
        '&state=glists-app-auth';

    // Recieve message from the authentication popup.
    chrome.extension.onMessage.addListener(function (auth) {
        if (authCallback) {
            authCallback(auth);
            authCallback = null;
        }
    });

    // Get a new token, intelligently.
    var getNewToken = function (callback) {
        var tokenRecieved = false,
            startTime = new Date().valueOf();

        // This will be called if we get the token from the iframe.
        authCallback = function (auth) {
            tokenRecieved = true;
            console.info('Getting token via iframe took',
                         new Date().valueOf() - startTime, 'seconds.');
            callback(auth);
        };

        // Try to get the token with a hidden iframe.
        var iframe = document.createElement('iframe');
        document.body.appendChild(iframe);
        iframe.style.display = 'none';
        iframe.src = authUrl;

        // We wait for the iframe to get us the token, but only until 3seconds.
        // After that, abort the iframe and open up a proper oauth popup.
        setTimeout(function () {
            if (!tokenRecieved) {
                authCallback = callback;
                window.open(authUrl, 'Authenticating Glists', 'toolbar=no');
            }
            iframe.parentNode.removeChild(iframe);
        }, 3000);

    };

    // Add the access_token to all requests made by backbone to the REST end
    // point.
    var injectBackbone = function (auth) {

        if (typeof Backbone === 'undefined') return;

        var originalSync = Backbone.sync;

        Backbone.sync = function (method, model, options) {
            options = options || {};
            options.beforeSend = function (xhr) {
                xhr.setRequestHeader('Authorization',
                                     'Bearer ' + auth.access_token);
            };
            return originalSync.call(this, method, model, options);
        };

    };

}());
