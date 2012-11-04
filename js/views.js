(function () {

    // Being lazy.
    var V = Backbone.View;

    // A View class similar to `Backbone.View`, intended to be used with
    // Collections.
    var CV = V.extend({
        // Render every item in `this.collection` and add it to this view's
        // `el`. Uses the `this.modelView` class to render each item.
        render: function () {
            this.$el.empty().append(this.collection.map(function (model) {
                return new this.modelView({model: model}).render().$el;
            }, this));
            return this;
        }
    });

    // A helper function to create template renderer functions.
    var template = function (elem) {
        var templateString = $(elem).html();
        return function (data) {
            return Mustache.render(templateString, data);
        };
    };

    var TaskView = window.TaskView = V.extend({
        tagName: 'div',
        className: 'task-item',

        template: template('#task-item-template'),

        render: function () {
            var templateData = this.model.toJSON();
            templateData.checked = (templateData.status == 'completed');
            this.$el.html(this.template(templateData));
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

            'focus .title': function (e) {
                this.$el.addClass('editing');
            },

            'blur .title': function (e) {
                this.doneEditing();
            },

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

    var TasksCollectionView = window.TasksCollectionView = CV.extend({

        el: '#tasks-container',
        modelView: TaskView,

        initialize: function () {
            if (this.collection) {
                this.setCollection(this.collection);
            }
        },

        setCollection: function (collection) {
            this.collection = collection;
            this.collection.on('reset sync', this.render, this);
            return this;
        }

    });

    var TaskListView = window.TaskListView = V.extend({
        tagName: 'li',
        className: 'task-list-item',

        template: template('#list-item-template'),

        initialize: function () {
            this.tasksCollectionView = new TasksCollectionView();
            this.model.on('change:title', this.render, this);
        },

        render: function () {
            this.$el.html(this.template(this.model.toJSON()));
            return this;
        },

        events: {

            'click a': function (e) {
                e.preventDefault();

                this.$el.addClass('selected')
                    .siblings().removeClass('selected');

                $('#tasks-container').html('Loading...');

                TaskListView.currentList = this.model;

                var tasksCollectionView = this.tasksCollectionView;
                this.model.tasks.fetch({
                    success: function (collection, response) {
                        tasksCollectionView
                            .setCollection(collection)
                            .render();
                    }
                });
            },

            'click .del-btn': function (e) {
                e.stopPropagation();
                if (confirm('Sure to delete the list "' +
                            this.model.get('title') + '"')) {
                    this.$el.slideUp();
                    this.model.destroy({
                        success: _.bind(this.remove, this)
                    });
                }
            },

            'click .edit-btn': function (e) {
                e.stopPropagation();
                var oldTitle = this.model.get('title'),
                    newTitle = prompt('Edit list "' + oldTitle + '"', oldTitle);
                if (newTitle && newTitle != oldTitle) {
                    this.model.save({title: newTitle});
                }
            }

        }

    });

    // FIXME: Need a better way to do this.
    TaskListView.currentList = null;

    var TaskListsCollectionView = window.TaskListsCollectionView = CV.extend({
        el: '#task-list-container',
        modelView: TaskListView,
        initialize: function () {
            this.collection.on('reset sync', this.render, this);
        }
    });

    // New task form handler.
    var newTaskForm = $('#new-task-form'),
        newTaskTitle = newTaskForm.find('input[name=title]');

    newTaskForm.on('submit', function (e) {
        e.preventDefault();
        var newTask = new TaskItem({
            title: newTaskTitle.val()
        });
        TaskListView.currentList.tasks.add(newTask);
        newTask.save();
        newTaskTitle.val('');
    });

})();
