var auth;

if (location.hash) {
  (function() {
    var auth, param, parts, _i, _len, _ref;
    auth = {};
    _ref = location.hash.substr(1).split('&');
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      param = _ref[_i];
      parts = param.split('=');
      auth[parts[0]] = parts[1];
    }
    if (auth.error != null) {
      return alert('Authentication error: ' + auth.error);
    } else {
      auth.verified = false;
      return localStorage.auth = JSON.stringify(auth);
    }
  })();
}

if ((localStorage.auth != null) && ((auth = JSON.parse(localStorage.auth)) != null)) {
  window.location = chrome.extension.getURL('index.html');
}

$('#login-btn').on('click', function() {
  return window.location = 'https://accounts.google.com/o/oauth2/auth' + '?response_type=token' + '&client_id=' + CLIENT_ID + '&redirect_uri=' + escape('https://www.google.com/robots.txt') + '&scope=' + escape('https://www.googleapis.com/auth/tasks') + '&state=glists-app-auth';
});
