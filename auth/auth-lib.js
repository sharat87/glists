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
                    if (response.audience === CLIENT_ID) {
                        inject_backbone(auth);
                        callback(auth);
                    }
                },
                error: function () {
                    localStorage.removeItem('auth');
                    openAuthPage(verifyToken);
                }
            });
        };

        if (typeof localStorage.auth === 'undefined' ||
                (auth = JSON.parse(localStorage.auth)) === null) {
            openAuthPage(verifyToken);
        } else {
            verifyToken(auth);
        }
    };

    // Open a popup window with the google authentication url.
    var openAuthPage = function (callback) {
        authCallback = callback;
        var url = 'https://accounts.google.com/o/oauth2/auth' +
            '?response_type=token' +
            '&client_id=' + CLIENT_ID +
            '&redirect_uri=' + escape('https://www.google.com/robots.txt') +
            '&scope=' + escape('https://www.googleapis.com/auth/tasks') +
            '&state=glists-app-auth';
        window.open(url, 'Authentication for Glists', 'toolbar=no');
    };

    // Recieve message from the authentication popup.
    var authCallback = null;
    chrome.extension.onMessage.addListener(
        function (request, sender, sendResponse) {
            sendResponse('');
            if (authCallback) authCallback(request);
        });

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
