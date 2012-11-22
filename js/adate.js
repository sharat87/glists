(function () {

    // Implements a class for handling just date, without any knowledge of time.
    var ADate = window.ADate = function (d) {
        d = d ? new Date(d) : new Date();
        this.date = d.getDate();
        this.month = d.getMonth() + 1;
        this.year = d.getFullYear();
    };

    ADate.prototype.toString = function () {
        return this.year + '-' + pad(this.month) + '-' + pad(this.date);
    };

    ADate.prototype.toISOString = function () {
        return new Date(this.toString()).toISOString();
    };

    ADate.prototype.valueOf = function () {
        return new Date(this.toString()).valueOf();
    };

    ADate.prototype.equals = function (other) {
        return other &&
            this.date === other.date &&
            this.month === other.month &&
            this.year === other.year;
    };

    ADate.areEqual = function (adate1, adate2) {
        if (adate1 === null && adate2 === null) {
            return true;
        } else if (adate1 === null || adate2 === null) {
            return false;
        } else if (adate1.equals(adate2)) {
            return true;
        }
    };

    var asAdate = window.asAdate = function (d) {
        return d ? new ADate(d) : null;
    };

    var pad = function (val) {
        return (val < 10 ? '0' : '') + val;
    };

}());