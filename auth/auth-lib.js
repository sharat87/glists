( function () {

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

                    inject_backbone(auth);
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

    // Open a popup window with the google authentication url.
    var openAuthPopup = function () {
        window.open(authUrl, 'Authenticating Glists', 'toolbar=no');
    };

    // Recieve message from the authentication popup.
    chrome.extension.onMessage.addListener(function (auth) {
        if (authCallback) {
            authCallback(auth);
            authCallback = null;
        }
    });

    // Get a new token, intelligently.
    var getNewToken = function (callback) {
        authCallback = callback;

        // This ajax call dictates if we should get the token via an iframe or
        // a popup window.
        $.ajax({
            url: authUrl,

            success: function (response, status, xhr) {
                if (response.substr(0, 14).toLowerCase() === '<!doctype html') {
                    // Open a popup to show the html reply.
                    openAuthPopup(callback);

                } else {
                    // Get the token with a hidden iframe.
                    var iframe = document.createElement('iframe');
                    document.body.appendChild(iframe);
                    iframe.style.display = 'none';
                    iframe.src = authUrl;

                }
            },

            error: function () {
                // Get the token by asking the user for one.
                openAuthPopup(callback);
            }

        });

    };

    // Add the access_token to all requests made by backbone to the REST end
    // point.
    var inject_backbone = function (auth) {

        if (typeof Backbone === 'undefined') {
            return;
        }

        var original_sync = Backbone.sync;

        Backbone.sync = function (method, model, options) {
            (options || (options = {})).beforeSend = function (xhr) {
                xhr.setRequestHeader('Authorization',
                                     'Bearer ' + auth.access_token);
            };
            return original_sync.call(this, method, model, options);
        };

    };

})();
