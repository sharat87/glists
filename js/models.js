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

            this.on('change:parent change:previous', function () {
                this.positionChanged = true;
            }, this);

            this.on('sync', function () {
                this.positionChanged = false;
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
        },

        getIndentLevel: function () {
            var parentId = this.get('parent');
            if (parentId) {
                return this.collection.get(parentId).getIndentLevel() + 1;
            } else {
                return 0;
            }
        },

        indent: function () {
            var currentIndent = this.getIndentLevel(),
                index = this.collection.indexOf(this);

            for (var i = index - 1; i >= 0; i--) {

                var target = this.collection.at(i),
                    targetIndent = target.getIndentLevel();

                if (targetIndent === currentIndent) {
                    this.set('parent', target.get('id'));
                    break;
                } else if (targetIndent < currentIndent) {
                    break;
                }

            }
        },

        dedent: function () {
            var parentId = this.get('parent');
            if (parentId) {
                this.set({
                    parent: this.collection.get(parentId).get('parent')
                });
            }
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
