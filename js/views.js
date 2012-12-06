(function () { // ¬pub

    var byId = _.bind(document.getElementById, document),
        tasksContainer = byId('tasks-container');

    // Being lazy.
    var V = Backbone.View.extend({
        qs: function (selector) {
            return this.el.querySelector(selector);
        },
        qsa: function (selector) {
            return this.el.querySelectorAll(selector);
        }
    });

    // Instead of initializing Views directly, this class-method should be used,
    // to avoid creating multiple views on the same model.
    V.forModel = function (model) {
        if (!this.views) {
            this.views = {};
        } else if (this.views[model.cid]) {
            return this.views[model.cid];
        }

        var view = this.views[model.cid] = new this({model: model});
        model.on('destroy', view.remove, view);
        return view;
    };

    // A View class similar to `Backbone.View`, intended to be used with
    // Collections.
    var CV = V.extend({
        // Render every item in `this.collection` and add it to this view's
        // `el`. Uses the `this.modelView` class to render each item.
        render: function () {
            var modelsFragment = document.createDocumentFragment();

            this.collection.each(function (model) {
                modelsFragment.appendChild(
                    this.modelView.forModel(model).render().el);
            }, this);

            this.el.innerHTML = '';
            this.el.appendChild(modelsFragment);

            return this;
        }
    });

    // A helper function to create template renderer functions.
    var mktemplate = function (elem) {
        var templateString = byId(elem).innerHTML;
        return function (data) {
            return Mustache.render(templateString, data);
        };
    };

    var TaskView = global.TaskView = V.extend({
        tagName: 'div',
        className: 'task-item',

        template: mktemplate('task-item-template'),

        initialize: function () {
            this.model.position.on('change:parent', this.updateIndent, this);
            this.model.on('change', this.render, this);
            this.model.on('destroy', function () {
                this.mask.remove();
                this.remove();
            }, this);
        },

        render: function () {
            var templateData = this.model.toJSON();

            templateData.checked = (templateData.status == 'completed');

            var due = this.model.get('due');
            templateData.dueStr = due ? due.toString() : '';

            this.el.innerHTML = this.template(templateData);

            this.el.classList[templateData.checked ?
                'add' : 'remove']('completed');

            this.updateIndent();

            return this;
        },

        updateIndent: function () {
            this.el.style.marginLeft =
                1.5 * this.model.getIndentLevel() + 'em';
            return this;
        },

        doneEditing: function () {
            var newTitle = this.qs('.title').innerText,
                newNotes = this.qs('.notes').value,
                newDue = global.asAdate(this.qs('.due-date').value),
                newStatus = (this.qs('input[type=checkbox]').checked ?
                             'completed' : 'needsAction'),
                old = this.model.toJSON();

            this.closeEditing();

            if (newTitle !== old.title ||
                    newNotes !== old.notes ||
                    !global.ADate.areEqual(newDue, this.model.get('due')) ||
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

            if (this.el.classList.contains('editing')) {
                return;
            }

            this.el.classList.add('editing');
            this.el.style.zIndex = 30;

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

            this.qs('.title').focus();
            return this;

        },

        closeEditing: function () {
            this.el.classList.remove('editing');
            this.el.style.zIndex = '';
            this.qs('.title').blur();
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
                    if (this.model.isNew()) {
                        this.model.destroy();
                    } else {
                        this.closeEditing().render();
                    }
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

    var TasksCollectionView = global.TasksCollectionView = CV.extend({

        el: tasksContainer,
        modelView: TaskView,

        initialize: function () {
            this.collection.on('reset', this.render, this);
        }

    });

    var TaskListView = global.TaskListView = V.extend({
        tagName: 'li',
        className: 'task-list-item',

        template: mktemplate('list-item-template'),

        initialize: function () {
            this.model.on('change:title selected deselected',
                        this.render, this);
            this.model.on('selected cleared', this.load, this);
            this.model.on('pre-clear', this.setLoading, this);
            this.tasksCollectionView = new TasksCollectionView({
                collection: this.model.tasks
            });
        },

        render: function () {
            this.el.innerHTML = this.template(this.model.toJSON());
            this.el.classList[this.model.isSelected ?
                'add' : 'remove']('selected');
            return this;
        },

        load: function () {
            TaskListView.currentList = this.model;
            this.setLoading();
            this.model.tasks.fetch();
            return this;
        },

        setLoading: function () {
            this.tasksCollectionView.el.innerHTML = 'Loading...';
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

    var TaskListsCollectionView = global.TaskListsCollectionView = CV.extend({
        el: '#task-list-container',
        modelView: TaskListView,
        initialize: function () {
            this.collection.on('reset sync', this.render, this);
        }
    });

    // New task toolbar button.
    var addTaskButton = byId('add-task-btn');

    addTaskButton.addEventListener('click', function () {
        var task = new TaskItem(),
            view = new TaskView({model: task});
        TaskListView.currentList.tasks.add(task, {at: 0});
        tasksContainer
            .insertBefore(view.render().el, tasksContainer.firstChild);
        view.startEditing();
    });

    // Make task items reorder-able by dragging their handles.
    $(tasksContainer).sortable({
        handle: '.drag-handle',
        stop: function (e, ui) {
            ui.item.trigger('moved');
        }
    });

    // Clear completed button.
    var clearBtn = byId('clear-btn');
    clearBtn.addEventListener('click', function () {
        TaskListView.currentList.clear();
    });

    // Popups functionality. E.g., Donate button.
    document.body.addEventListener('click', function (e) {
        if (e.target.dataset.href) {
            var popupElem = byId(e.target.dataset.href);
            popupElem.classList.add('show');
        } else if (e.target.classList.contains('popup-mask')) {
            e.target.classList.remove('show');
        }
    });

})(); // ¬pub
