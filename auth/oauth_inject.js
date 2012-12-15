/*global chrome:false */
if (location.hash.indexOf('state=glists-app-auth') >= 0) {
    window.location = chrome.extension.getURL('auth/authenticate.html') +
        location.hash;
}
