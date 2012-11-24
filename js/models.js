(function () {

    // Being lazy.
    var M = Backbone.Model, C = Backbone.Collection;

    // A better default implementation for Collection's parse method, than a
    // no-op.
    C.prototype.parse = function (response) {
        return _.map(response.items, this.model.prototype.parse);
    };

    var TaskItem = window.TaskItem = M.extend({

        initialize: function (attrs) {
            this.on('change:status', function () {
                if (this.get('status') === 'needsAction') {
                    this.unset('completed');
                }
            });

            this.position = new TaskPosition({
                parent: attrs.parent,
                position: attrs.position
            });
        },

        parse: function (response, xhr) {
            response.notes = response.notes || '';
            response.due = asAdate(response.due);

            // Ignore the position attributes if we already have a
            // `this.position`.
            if (this.position) {
                delete response.parent;
                delete response.position;
            }

            return response;
        },

        toJSON: function () {
            var task = M.prototype.toJSON.call(this);
            task.due = task.due ? task.due.toISOString() : null;
            _.extend(task, this.position.attributes);
            return task;
        },

        _save: function (attrs, options) {
            var position = {
                parent: this.get('parent'),
                previous: this.get('previous')
            };

            var self = this, success = options.success;
            options.success = function () {
                if (self.positionChanged) {
                    self.save(position);
                }
                if (success) {
                    success.apply(self, arguments);
                }
            };

            M.prototype.save.call(this, attrs, options);
        },

        getIndentLevel: function () {
            var parentId = this.position.get('parent');
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
                    this.position.set('parent', target.get('id'));
                    break;
                } else if (targetIndent < currentIndent) {
                    break;
                }

            }
        },

        dedent: function () {
            var parentId = this.position.get('parent');
            if (parentId) {
                var parent = this.collection.get(parentId);
                this.position.set({
                    parent: parent.position.get('parent')
                });
            }
        }

    });

    var TaskPosition = M.extend({
        initialize: function () {
            this.on('change:parent change:previous', function () {
                this._dirty = true;
                console.info('dirtying');
            }, this);
            this.on('sync', function () {
                console.info('un-dirtying');
                this._dirty = false;
            }, this);
        },
        isDirty: function () {
            return this._dirty;
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
