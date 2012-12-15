(function () {
    /*global jasmine:false authenticated:false */
    var jasmineEnv = jasmine.getEnv();
    jasmineEnv.updateInterval = 1000;

    var htmlReporter = new jasmine.HtmlReporter();

    jasmineEnv.addReporter(htmlReporter);

    jasmineEnv.specFilter = function (spec) {
        return htmlReporter.specFilter(spec);
    };

    var currentWindowOnload = window.onload;

    function execJasmine() {
        jasmineEnv.execute();
    }

    window.onload = function () {
        if (currentWindowOnload) {
            currentWindowOnload();
        }
        authenticated(execJasmine);
    };

})();
