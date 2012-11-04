(function () {

    // Being lazy.
    var M = Backbone.Model, C = Backbone.Collection;

    // A better default implementation for Collection's parse method, than a
    // no-op.
    C.prototype.parse = function (response) {
        return response.items;
    };

    var TaskItem = window.TaskItem = M;

    var TasksCollection = window.TasksCollection = C.extend({
        model: TaskItem,
        url: function() {
            return 'https://www.googleapis.com/tasks/v1/lists/' +
                this.taskList.get('id') + '/tasks';
        }
    });

    var TaskList = window.TaskList = M.extend({

        urlRoot: 'https://www.googleapis.com/tasks/v1/users/@me/lists',

        initialize: function () {
            // FIXME: Cyclic dependency. Not sure if its bad.
            this.tasks = new TasksCollection();
            this.tasks.taskList = this;
        },

        fetchTasks: function (options) {
            if (this.isNew()) {
                // Can't get tasks if this isn't a list saved on the server.
                throw new Error('Cannot get tasks of a new list.');
            }
            this.tasks.fetch(options);
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
