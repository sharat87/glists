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
    var mktemplate = function (elem) {
        var templateString = $(elem).html();
        return function (data) {
            return Mustache.render(templateString, data);
        };
    };

    var TaskView = window.TaskView = V.extend({
        tagName: 'div',
        className: 'task-item',

        template: mktemplate('#task-item-template'),

        initialize: function () {
            this.model.position.on('change:parent', this.updateIndent, this);
            this.model.on('destroy', this.remove, this);
        },

        render: function () {
            var templateData = this.model.toJSON();

            templateData.checked = (templateData.status == 'completed');

            var due = this.model.get('due');
            templateData.dueStr = due ? due.toString() : '';

            this.$el.html(this.template(templateData));

            if (templateData.checked) {
                this.$el.addClass('completed');
            } else {
                this.$el.removeClass('completed');
            }

            this.updateIndent();

            return this;
        },

        updateIndent: function () {
            this.$el.css({
                'margin-left': 1.5 * this.model.getIndentLevel() + 'em'
            });
            return this;
        },

        doneEditing: function () {
            var newTitle = this.$('.title').text(),
                newNotes = this.$('.notes').val(),
                newDue = asAdate(this.$('.due-date').val()),
                newStatus = (this.$('input:checkbox').is(':checked') ?
                             'completed' : 'needsAction'),
                old = this.model.toJSON();

            this.closeEditing();

            if (newTitle !== old.title ||
                    newNotes !== old.notes ||
                    !ADate.areEqual(newDue, this.model.get('due')) ||
                    newStatus !== old.status) {
                this.model.save({
                    title: newTitle,
                    status: newStatus,
                    notes: newNotes,
                    due: newDue
                });
            }

            this.model.position.saveIfDirty();
            return this;
        },

        startEditing: function () {
            var self = this;

            if (this.$el.hasClass('editing')) {
                return;
            }

            this.$el.addClass('editing').css('z-index', 30);

            this.mask = $('<div/>', {
                    click: _.bind(this.doneEditing, this),
                    css: {
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        'z-index': 20,
                        'background-color': 'rgba(0, 0, 0, .4)'
                    }
                }).appendTo(document.body);

            this.$('.title').focus();
            return this;

        },

        closeEditing: function () {
            this.$el.removeClass('editing').css('z-index', '');
            this.$('.title').blur();
            this.mask.remove();
            return this;
        },

        events: {

            'focus .title': 'startEditing',

            'keydown .title,.due-date': function (e) {
                if (e.which === 13) {
                    e.preventDefault();
                    this.doneEditing();
                }
            },

            'keydown .title': function (e) {
                // Tab key for indentation changes.
                if (e.which === 9) {
                    e.preventDefault();
                    this.model[e.shiftKey ? 'dedent' : 'indent']();
                } else if (e.which === 27) {
                    // ESC key to cancel editing.
                    this.closeEditing().render();
                }
            },

            'keydown .notes': function (e) {
                if (e.which === 13 && e.ctrlKey) {
                    this.doneEditing();
                }
            },

            'change input:checkbox': function (e) {
                this.model.save({
                    status: e.target.checked ? 'completed' : 'needsAction'
                });
            },

            'click .del-btn': function () {
                this.closeEditing().model.destroy();
            },

            'moved': function () {
                this.model.moveTo(this.$el.index());
                this.model.position.saveIfDirty();
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

        render: function () {
            CV.prototype.render.apply(this, arguments);
            // this.$el.sortable({handle: 'drag-handle'});
            return this;
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

        template: mktemplate('#list-item-template'),

        initialize: function () {
            this.tasksCollectionView = new TasksCollectionView();
            this.model.on('selected', this.select, this);
            this.model.on('destroy', this.remove, this);
            this.model.on('change:title selected deselected',
                          this.render, this);
        },

        render: function () {
            this.$el.html(this.template(this.model.toJSON()));
            if (this.model.isSelected) {
                this.$el.addClass('selected');
            } else {
                this.$el.removeClass('selected');
            }
            return this;
        },

        select: function () {
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

        events: {

            'click a': function (e) {
                e.preventDefault();
                this.model.collection.setSelectedList(this.model);
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

    // New task toolbar button.
    var addTaskButton = $('#add-task-btn');

    addTaskButton.click(function () {
        var task = new TaskItem(),
            view = new TaskView({model: task});
        TaskListView.currentList.tasks.add(task, {at: 0});
        $('#tasks-container').prepend(view.render().el);
        view.startEditing();
    });

    // Make task items reorder-able by dragging their handles.
    $('#tasks-container').sortable({
        handle: '.drag-handle',
        stop: function (e, ui) {
            ui.item.trigger('moved');
        }
    });

})();
