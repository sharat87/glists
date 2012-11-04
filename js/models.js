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
        model: TaskItem
    });

    var TaskList = window.TaskList = M.extend({

        initialize: function () {
            this.tasks = new TasksCollection();
        },

        url: function () {
            // If there is no `selfLink`, this must be a new TaskList. We use
            // the empty create url.
            return this.get('selfLink') ||
                'https://www.googleapis.com/tasks/v1/users/@me/lists/';
        },

        fetchTasks: function (options) {
            if (this.isNew()) {
                // Can't get tasks if this isn't a list saved on the server.
                throw new Error('Cannot get tasks of a new list.');
            }
            this.tasks.url = 'https://www.googleapis.com/tasks/v1/lists/' +
                this.get('id') + '/tasks';
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
