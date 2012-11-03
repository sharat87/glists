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
            this.tasks.url = 'https://www.googleapis.com/tasks/v1/lists/' +
                this.get('tasklist') + '/tasks';
            this.url = 'https://www.googleapis.com/tasks/v1/users/@me/lists/' +
                (this.get('tasklist') || '');
        },

        parse: function (response) {
            return {
                tasklist: response.id || response.tasklist,
                title: response.title,
                updated: response.updated
            };
        }

    });

    var TaskListsCollection = window.TaskListsCollection = C.extend({
        model: TaskList,
        url: 'https://www.googleapis.com/tasks/v1/users/@me/lists',
        parse: function (response) {
            return _.map(response.items, TaskList.prototype.parse);
        },
        comparator: function (taskList) {
            return taskList.get('title').toLowerCase();
        }
    });

})();
