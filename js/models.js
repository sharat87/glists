(function () {

    // Being lazy.
    var M = Backbone.Model, C = Backbone.Collection;

    // A better default implementation for Collection's parse method, than a
    // no-op.
    C.prototype.parse = function (response) {
        return response.items;
    };

    var TaskItem = window.TaskItem = M;

    var _TasksCollection = C.extend({
        model: TaskItem,
        url: function() {
            return 'https://www.googleapis.com/tasks/v1/lists/' +
                this.taskList.get('id') + '/tasks';
        }
    });

    var TaskList = window.TaskList = M.extend({
        initialize: function () {
            this.tasks = new _TasksCollection();
            this.tasks.taskList = this;
        }
    });

    var TaskListsCollection = window.TaskListsCollection = C.extend({
        model: TaskList,
        url: 'https://www.googleapis.com/tasks/v1/users/@me/lists',
        comparator: function (taskList) {
            return taskList.get('title').toLowerCase();
        }
    });

})();
