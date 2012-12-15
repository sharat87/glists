(function () { // ¬pub
    /*global Backbone:false _:false asAdate:false */

    // Being lazy.
    var M = Backbone.Model, C = Backbone.Collection;

    // A better default implementation for Collection's parse method, than a
    // no-op.
    C.prototype.parse = function (response) {
        return _.map(response.items, this.model.prototype.parse);
    };

    // A pseudo-model to handle app-level properties and events.
    var App = new M({
        view: 'myOrder'
    });

    var TaskItem, TaskPosition, TaskList, TasksCollection, TaskListsCollection;

    TaskItem = M.extend({

        initialize: function (attrs) {
            this.on('change:status', function () {
                if (this.get('status') === 'needsAction') {
                    this.unset('completed');
                }
            });

            this.position = new TaskPosition({
                parent: attrs && attrs.parent,
                position: attrs && attrs.position
            });
            this.position.task = this;
        },

        parse: function (response) {
            response.notes = response.notes || '';
            response.due = asAdate(response.due);

            // Ignore the position attributes if we already have a
            // `this.position`. Note that these values, even if set, are unused,
            // so removing this piece of code should have no effect.
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

        destroy: function () {
            var expectedChildIndent = this.getIndentLevel() + 1,
                i = this.collection.indexOf(this) + 1,
                children = [];

            // Find all immediate children of this task.
            while (true) {
                var child = this.collection.at(i);
                if (!child) break;

                var childIndent = child.getIndentLevel();
                if (childIndent === expectedChildIndent) {
                    children.push(child);
                    // child.position.save({parent: parent});
                } else if (childIndent < expectedChildIndent) {
                    break;
                }

                ++i;
            }

            // Copy parent to all immediate children and previous to the first
            // child.
            // FIXME: Getting `previous` should automatically
            // `calculatePrevious`.
            if (children.length) {
                this.calculatePrevious();

                var parent = this.position.get('parent'),
                    previous = this.position.get('previous');

                i = 0;

                children[i++].position.save({
                    parent: parent,
                    previous: previous
                });

                while (i < children.length) {
                    children[i++].position.save({parent: parent});
                }
            }

            return M.prototype.destroy.apply(this, arguments);
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

            this.calculatePrevious();
        },

        dedent: function () {
            var parentId = this.position.get('parent');
            if (parentId) {
                var parent = this.collection.get(parentId);
                this.position.set({
                    parent: parent.position.get('parent')
                });
            }
            this.calculatePrevious();
        },

        calculatePrevious: function () {
            var currentIndent = this.getIndentLevel(),
                index = this.collection.indexOf(this);

            for (var i = index - 1; i >= 0; i--) {

                var target = this.collection.at(i),
                    targetIndent = target.getIndentLevel();

                if (targetIndent === currentIndent) {
                    this.position.set('previous', target.get('id'));
                    break;
                } else if (targetIndent < currentIndent) {
                    this.position.set('previous', null);
                    break;
                }
            }

            if (i < 0) {
                this.position.set('previous', null);
            }
        },

        moveTo: function (toIndex) {
            var coll = this.collection;

            coll.remove(this, {silent: true});

            var prevTask = coll.at(toIndex - 1),
                prevIndent = prevTask && prevTask.getIndentLevel(),
                nextTask = coll.at(toIndex),
                nextIndent = nextTask && nextTask.getIndentLevel();

            if (!prevTask) {
                // No parent for the first task.
                this.position.set('parent', null);

            } else if (nextTask && prevIndent < nextIndent) {
                // Be a child of previous task.
                this.position.set(
                    {parent: prevTask.get('id')},
                    {silent: true});

            } else {
                // Be at the same level as the previous task.
                this.position.set(
                    {parent: prevTask.position.get('parent')},
                    {silent: true});

            }

            coll.add(this, {at: toIndex});
            this.calculatePrevious();
        }

    });

    TaskPosition = M.extend({

        initialize: function () {
            this.on('change:parent change:previous', function () {
                this._dirty = true;
            }, this);

            this.on('sync', function () {
                this._dirty = false;
            }, this);
        },

        get: function () {
            return M.prototype.get.apply(this, arguments) || null;
        },

        isDirty: function () {
            return this._dirty;
        },

        saveIfDirty: function () {
            if (this.isDirty()) {
                return M.prototype.save.apply(this, arguments);
            }
        },

        parse: function (response) {
            return {
                parent: response.parent,
                position: response.position
            };
        },

        toJSON: function () {
            return {
                parent: this.get('parent'),
                previous: this.get('previous')
            };
        },

        sync: function (method, model, options) {
            options = options || {};
            options.data = '';
            options.url = this.task.url() + '/move';

            var qs = [],
                parent = this.get('parent'),
                previous = this.get('previous');

            if (parent) {
                qs.push('parent=' + encodeURIComponent(parent));
            }

            if (previous) {
                qs.push('previous=' + encodeURIComponent(previous));
            }

            if (qs) {
                options.url += '?' + qs.join('&');
                return Backbone.sync.apply(this, arguments);
            } else {
                return;
            }
        }
    });

    TasksCollection = C.extend({
        model: TaskItem
    });

    TaskList = M.extend({

        initialize: function () {
            this.tasks = new TasksCollection();
            this.tasks.url = _.bind(this.tasksUrl, this);
        },

        listUrl: function () {
            return 'https://www.googleapis.com/tasks/v1/lists/' +
                this.get('id');
        },

        tasksUrl: function () {
            return this.listUrl() + '/tasks';
        },

        clear: function (options) {
            options = options || {};
            options.data = '';
            var success = options.success, model = this;
            options.success = function () {
                model.trigger('cleared');
                if (success) success.apply(this, arguments);
            };
            this.sync('clear', this, options);
        },

        sync: function (method, model, options) {
            if (method === 'clear') {
                this.trigger('pre-clear');
                options = options || {};
                options.url = this.listUrl() + '/clear';
                method = 'create';
            }
            return Backbone.sync.call(this, method, model, options);
        }

    });

    TaskListsCollection = C.extend({
        model: TaskList,
        url: 'https://www.googleapis.com/tasks/v1/users/@me/lists',

        initialize: function () {
            this.on('change', function () {
                this.sort();
            }, this);
        },

        comparator: function (taskList) {
            return taskList.get('title').toLowerCase();
        },

        getListByTitle: function (title) {
            if (!title) return null;
            var i = 0, len = this.length;
            while (i < len) {
                var list = this.at(i++);
                if (list.get('title') === title) {
                    return list;
                }
            }
            return null;
        },

        setSelectedList: function (taskList) {
            if (!taskList) return;

            if (this._selectedTaskList) {
                this._selectedTaskList.isSelected = false;
                this._selectedTaskList.trigger('deselected');
            }

            this._selectedTaskList = taskList;
            taskList.isSelected = true;
            taskList.trigger('selected');
        },

        getSelectedList: function () {
            return this._selectedTaskList;
        }
    });

    // ↓dev
    _.extend(window, {
        App: App,
        TaskItem: TaskItem,
        TaskList: TaskList,
        TaskListsCollection: TaskListsCollection
    });
    // ↑dev

})(); // ¬pub
