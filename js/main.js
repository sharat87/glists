(function () {

    var CLIENT_ID = '151476160203-t29qsdoev1sv2cmgnjld050j4avqrsr3' +
        '.apps.googleusercontent.com';
    var ACCESS_TOKEN = null;

    // Being lazy.
    var M = Backbone.Model, C = Backbone.Collection, V = Backbone.View;

    // Backup the default sync, as we will be rewriting it.
    Backbone.__sync = Backbone.sync;

    // A helper function on views for rendering and placing into the DOM.
    V.prototype.renderAndApply = function () {
        this.render();
        return this.rootElem.empty().append(this.$el);
    };

    var TaskItem = M.extend({

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

    var TaskView = V.extend({
        tagName: 'div',
        className: 'task-item',

        render: function () {
            var _this = this;
            this.$el.html('<input type=checkbox' +
                          (this.model.get('status') == 'completed' ?
                           ' checked' : '') +
                          '><div class=title contenteditable>' +
                          this.model.get('title') + '</div>');
            this.$el.find('.title').on('focus', function () {
                return _this.$el.addClass('editing');
            }).on('blur', function () {
                return _this.doneEditing();
            });
            return this;
        },

        doneEditing: function () {
            var newTitle = this.$el.find('.title').text(),
                newStatus = (this.$el.find('input:checkbox').is(':checked') ?
                             'completed' : 'needsAction');

            this.$el.removeClass('editing');

            if (newTitle !== this.model.get('title') ||
                    newStatus !== this.model.get('status')) {
                this.model.set({title: newTitle, status: newStatus});
                return this.model.save();
            }
        },

        events: {
            'keydown .title': function (e) {
                if (e.which === 13) {
                    console.info(e);
                    e.preventDefault();

                    if (e.ctrlKey) {
                        // New task after current.
                        var newTask = new TaskItem({
                            tasklist: this.get('tasklist')
                        });
                    } else if (e.shiftKey) {
                        // New task before current.
                    }

                    this.$el.find('.title').blur();
                }
            },
            'change input:checkbox': function (e) {
                var status = (this.$el.find('input:checkbox').is(':checked') ?
                              'completed' : 'needsAction');
                // Its necessary that `completed` is not present in the request
                // and `id` is required. Rest are fine.
                this.model.set({
                    status: status,
                    completed: null
                });
                this.model.save();
            }
        }

    });

    var TasksCollection = C.extend({
        model: TaskItem,
        parse: function (response) {
            return response.items;
        }
    });

    var TasksCollectionView = V.extend({
        tagName: 'div',
        className: 'task-list',
        rootElem: $('#tasks-container'),
        render: function () {
            this.collection.forEach(function (taskItem) {
                var view = new TaskView({
                    model: taskItem
                });
                this.$el.append(view.render().el);
            }, this);
            return this;
        }
    });

    var TaskList = M.extend({
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

    var currentTaskList = null;

    var TaskListView = V.extend({
        tagName: 'li',
        className: 'task-list-name',

        render: function () {
            this.$el.html('<a href=#><span>' + this.model.get('title') +
                          '</span>' + '<button class=del-btn>Del</button></a>');
            return this;
        },

        events: {

            'click a': function (e) {
                var _this = this;
                e.preventDefault();

                this.$el.addClass('selected')
                    .siblings().removeClass('selected');

                $('#tasks-container').html('Loading...');

                currentTaskList = this.model;

                this.model.tasks.fetch({
                    success: function () {
                        new TasksCollectionView({
                            collection: _this.model.tasks
                        }).renderAndApply();
                    }
                });
            },

            'click .del-btn': function (e) {
                e.preventDefault();
                e.stopPropagation();
                this.$el.hide();
                return this.model.destroy({
                    success: function () {
                        return this.remove();
                    }
                });
            }

        }

    });

    var TaskListsCollection = C.extend({
        model: TaskList,
        url: 'https://www.googleapis.com/tasks/v1/users/@me/lists',
        initialize: function () {
            var _this = this;
            this.on('reset', function () {
                new TaskListsCollectionView({
                    collection: _this
                }).renderAndApply();
            });
        },
        parse: function (response) {
            return _.map(response.items, TaskList.prototype.parse);
        },
        comparator: function (taskList) {
            return taskList.get('title').toLowerCase();
        }
    });

    var TaskListsCollectionView = V.extend({
        tagName: 'ul',
        className: 'task-lists',
        rootElem: $('#task-list-container'),
        render: function () {
            var _this = this;
            this.collection.forEach(function (list) {
                var view;
                view = new TaskListView({
                    model: list
                });
                return _this.$el.append(view.render().el);
            });
            return this;
        }
    });

    var startApp = function (auth) {

        // Add the access_token to any requests to the REST end point.
        Backbone.sync = function (method, model, options) {
            (options || (options = {})).beforeSend = function (xhr) {
                return xhr.setRequestHeader('Authorization',
                                            "Bearer " + auth.access_token);
            };
            return Backbone.__sync.call(this, method, model, options);
        };

        var taskListsCollection = new TaskListsCollection();
        taskListsCollection.fetch();

        var newTaskListForm = $('#new-task-list-form');
        var newListTitle = newTaskListForm.find('input[name=title]');
        newTaskListForm.on('submit', function (e) {
            e.preventDefault();
            var newList = new TaskList({
                title: newListTitle.val()
            });
            newList.save();
            taskListsCollection.fetch();
            return newListTitle.val('');
        });

        var newTaskForm = $('#new-task-form');
        var newTaskTitle = newTaskForm.find('input[name=title]');
        newTaskForm.on('submit', function (e) {
            e.preventDefault();
            var newTask = new TaskItem({
                title: newTaskTitle.val(),
                tasklist: currentTaskList.get('tasklist')
            });
            newTask.save();
        });

    };

    var goToAuthPage = function () {
        return window.location = chrome.extension.getURL('authenticate.html');
    };

    var auth;
    if (typeof localStorage.auth === 'undefined' ||
            (auth = JSON.parse(localStorage.auth)) === null) {

        goToAuthPage();

    } else {

        $.ajax({
            url: 'https://www.googleapis.com/oauth2/v1/tokeninfo',
            data: {
                access_token: auth.access_token
            },
            dataType: 'json',
            success: function (response) {
                if (response.audience === CLIENT_ID) {
                    startApp(auth);
                }
            },
            error: function () {
                localStorage.removeItem('auth');
                goToAuthPage();
            }
        });

    }

}).call(this);
