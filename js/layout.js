(function () { // ¬pub
    'use strict';

    var leftHeader = document.querySelector('#list-panel > header'),
        leftBody = document.getElementById('left-body'),
        rightHeader = document.querySelector('#right-panel > header'),
        rightBody = document.getElementById('right-body');

    var reloadLayout = function () {
        var expandos = document.getElementsByClassName('expando');

        for (var i = 0, len = expandos.length; i < len; ++i) {
            var expando = expandos[i],
                siblings = expando.parentNode.childNodes,
                slen = siblings.length,
                siblingHeight = 0;

            for (var j = 0; j < slen; ++j) {
                if (siblings[j] !== expando) {
                    siblingHeight += siblings[j].offsetHeight || 0;
                }
            }

            expando.style.height = (window.innerHeight - siblingHeight) + 'px';
        }

    };

    window.addEventListener('resize', reloadLayout);
    reloadLayout();

}()); // ¬pub
