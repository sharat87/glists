(function (doc, win) {
    "use strict";

    var leftHeader = doc.querySelector('#list-panel > header'),
        leftBody = doc.getElementById('left-body'),
        rightHeader = doc.querySelector('#right-panel > header'),
        rightBody = doc.getElementById('right-body');

    var reloadLayout = function () {
        leftBody.style.height =
            (win.innerHeight - leftHeader.offsetHeight) + 'px';
        rightBody.style.height =
            (win.innerHeight - rightHeader.offsetHeight) + 'px';
    };

    win.addEventListener('resize', reloadLayout);
    reloadLayout();

}(document, window));
