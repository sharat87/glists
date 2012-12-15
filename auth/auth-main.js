(function () {

    var auth = {},
        props = location.hash.substr(1).split('&'),
        i = props.length;

    while (i-- > 0) {
        var parts = props[i].split('='),
            name = parts[0];
        // Camel case-ify from underscores.
        name = name.replace(/\_([a-z])/g, function (_, c) {
            return c.toUpperCase();
        });
        auth[name] = parts[1];
    }

    if (auth.expiresIn) {
        auth.expiresIn = parseInt(auth.expiresIn, 10);
        auth.expiresAt = new Date().valueOf() + auth.expiresIn * 1000;
    }

    if (auth.error) {
        alert('Authentication error: ' + auth.error);
    } else {
        auth.verified = false;
    }

    chrome.extension.sendMessage(auth);

}());
