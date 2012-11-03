(function () {

    // Being lazy.
    var M = Backbone.Model, C = Backbone.Collection;

    var TaskItem = window.TaskItem = M.extend({

        initialize: function () {
            // Sometimes the `id` is set to the id of the task. We want the
            // `task` property to be used for this, for easier compatiblity with
            // the REST API.
            this.on('change:id', function () {
                this.set('task', this.get('id'));
            });
        },

        url: function () {
            var url = this.get('selfLink');

            if (!url) {
                url = 'https://www.googleapis.com/tasks/v1/lists/' +
                    this.get('tasklist') + '/tasks';

                if (this.get('task')) {
                    url += '/' + this.get('task');
                }

                this.set('selfLink', url);
            }

            return url;
        }
    });

    var TasksCollection = window.TasksCollection = C.extend({
        model: TaskItem,
        parse: function (response) {
            return response.items;
        }
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
        parse: function (response) {
            return response.items;
        },
        comparator: function (taskList) {
            return taskList.get('title').toLowerCase();
        }
    });

})();
