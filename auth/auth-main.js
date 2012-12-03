(function() {

    if (location.hash) {

        var auth = {},
            props = location.hash.substr(1).split('&'),
            i = props.length;

        while (i-- > 0) {
            var parts = props[i].split('=');
            auth[parts[0]] = parts[1];
        }

        if (auth.expires_in) {
            auth.expires_in = parseInt(auth.expires_in, 10);
            auth.expires_at = new Date().valueOf() + auth.expires_in * 1000;
        }

        if (auth.error) {
            alert('Authentication error: ' + auth.error);
        } else {
            auth.verified = false;
            localStorage.auth = JSON.stringify(auth);
        }

    }

    if (localStorage.auth && JSON.parse(localStorage.auth)) {
        window.location = chrome.extension.getURL('index.html');
    } else {
        window.location = 'https://accounts.google.com/o/oauth2/auth' +
            '?response_type=token' +
            '&client_id=' + CLIENT_ID +
            '&redirect_uri=' + escape('https://www.google.com/robots.txt') +
            '&scope=' + escape('https://www.googleapis.com/auth/tasks') +
            '&state=glists-app-auth';
    }

})();
