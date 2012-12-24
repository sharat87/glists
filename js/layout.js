(function () { // ¬pub
    'use strict';

    var leftHeader = document.querySelector('#list-panel > header'),
        leftBody = document.getElementById('left-body'),
        rightHeader = document.querySelector('#right-panel > header'),
        rightBody = document.getElementById('right-body');

    var reloadLayout = function () {
        leftBody.style.height =
            (window.innerHeight - leftHeader.offsetHeight) + 'px';
        rightBody.style.height =
            (window.innerHeight - rightHeader.offsetHeight) + 'px';
    };

    window.addEventListener('resize', reloadLayout);
    reloadLayout();

}()); // ¬pub
