(function () { // ¬pub
    /*jshint devel:true */
    /*global Backbone:false */
    'use strict';

    // Can be overridden to a different object.
    Backbone.App = new Backbone.Model();

    var _define = function (name, clsObject) {

        // Check if a class with this name is already defined.
        if (Backbone.App[name]) {
            console.error('Possible attempt to redeclare class', name);
            return;
        }

        var cls = this.extend(clsObject);
        cls._name = name;
        Backbone.App[name] = cls;
        return cls;
    };

    Backbone.Model.define = Backbone.Collection.define = Backbone.View.define =
        _define;

}()); // ¬pub
