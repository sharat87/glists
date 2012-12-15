(function () { // ¬pub

    // Implements a class for handling just date, without any knowledge of time.
    var ADate = function (d) {
        d = d ? new Date(d) : new Date();
        this.date = d.getDate();
        this.month = d.getMonth() + 1;
        this.year = d.getFullYear();
    };

    ADate.prototype.toDate = function () {
        return new Date(this.toString());
    };

    ADate.prototype.toString = function () {
        var pad = function (val) {
            return (val < 10 ? '0' : '') + val;
        };
        return this.year + '-' + pad(this.month) + '-' + pad(this.date);
    };

    ADate.prototype.toISOString = function () {
        return this.toDate().toISOString();
    };

    ADate.prototype.toLocaleString = function () {
        var today = new ADate();
        return this.equals(today) ?
            'Today' : this.toDate().toLocaleDateString();
    };

    ADate.prototype.valueOf = function () {
        return this.toDate().valueOf();
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

    var asAdate = function (d) {
        return d ? new ADate(d) : null;
    };

    // ↓dev
    _.extend(window, {
        ADate: ADate,
        asAdate: asAdate
    });
    // ↑dev

}()); // ¬pub
