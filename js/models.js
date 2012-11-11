(function () {

    // Being lazy.
    var M = Backbone.Model, C = Backbone.Collection;

    // A better default implementation for Collection's parse method, than a
    // no-op.
    C.prototype.parse = function (response) {
        return response.items;
    };

    var TaskItem = window.TaskItem = M.extend({

        initialize: function () {
            this.on('change:status', function () {
                if (this.get('status') === 'needsAction') {
                    this.unset('completed');
                }
            });
        },

        parse: function (response) {
            response.notes = response.notes || '';
            response.due = asAdate(response.due);
            return response;
        },

        toJSON: function () {
            var task = M.prototype.toJSON.call(this);
            task.due = task.due ? task.due.toISOString() : null;
            return task;
        }

    });

    var _TasksCollection = C.extend({
        model: TaskItem
    });

    var TaskList = window.TaskList = M.extend({
        initialize: function () {
            this.tasks = new _TasksCollection();
            this.tasks.url = _.bind(this.tasksUrl, this);
        },
        tasksUrl: function () {
            return 'https://www.googleapis.com/tasks/v1/lists/' +
                this.get('id') + '/tasks';
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
