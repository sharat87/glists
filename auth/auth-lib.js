( function () {

    var goToAuthPage = function () {
        window.location = chrome.extension.getURL('auth/authenticate.html');
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

    window.authenticated = function (fn) {

        if (typeof localStorage.auth === 'undefined' ||
                (auth = JSON.parse(localStorage.auth)) === null) {

            goToAuthPage();

        } else {

            $.ajax({
                url: 'https://www.googleapis.com/oauth2/v1/tokeninfo',
                data: {
                    access_token: auth.access_token
                },
                dataType: 'json',
                success: function (response) {
                    if (response.audience === CLIENT_ID) {
                        inject_backbone(auth);
                        fn(auth);
                    }
                },
                error: function () {
                    localStorage.removeItem('auth');
                    goToAuthPage();
                }
            });

        }
    };

})();
