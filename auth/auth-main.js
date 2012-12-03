(function() {

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

    chrome.extension.sendMessage(auth, function (response) {
        window.close();
    });

}());
