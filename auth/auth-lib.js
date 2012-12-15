(function () { // ¬pub
    /*jshint nonstandard:true */
    /*global $:false chrome:false */

    var CLIENT_ID = '151476160203-t29qsdoev1sv2cmgnjld050j4avqrsr3' +
            '.apps.googleusercontent.com',
        getNewToken;

    // Call the given function, with authentication stuff handled.
    var authenticated = function (callback) {

        var verifyToken = function (auth) {
            /*jshint camelcase:false */
            $.ajax({
                url: 'https://www.googleapis.com/oauth2/v1/tokeninfo',
                data: {access_token: auth.accessToken},
                dataType: 'json',
                success: function (response) {
                    if (response.audience !== CLIENT_ID) {
                        // Something went horribly wrong.
                        getNewToken(verifyToken);
                        return;
                    }

                    auth.verified = true;
                    auth.expiresIn = response.expires_in;

                    localStorage.auth = JSON.stringify(auth);

                    setTimeout(function () {
                        getNewToken(verifyToken);
                    }, Math.max(0, auth.expiresIn - 60) * 1000);

                    callback(auth);
                },
                error: function () {
                    localStorage.removeItem('auth');
                    getNewToken(verifyToken);
                }
            });
        };

        var auth;
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
    getNewToken = function (callback) {
        var tokenRecieved = false;

        // This will be called if we get the token from the iframe.
        authCallback = function (auth) {
            tokenRecieved = true;
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

    // ↓dev
    window.authenticated = authenticated;
    // ↑dev

}()); // ¬pub
