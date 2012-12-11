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

    var TaskView = V.extend({
        tagName: 'div',
        className: 'task-item',

        template: mktemplate('task-item-template'),

        initialize: function () {
            // Dictates whether the UI should reflect position attributes.
            this.showPosition = true;

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

            if (!this.showPosition) {
                this.qs('.drag-handle').style.display = 'none';
                this.el.style.marginLeft = '';
            }

            this.updateIndent();

            return this;
        },

        updateIndent: function () {
            if (this.showPosition) {
                this.el.style.marginLeft =
                    1.5 * this.model.getIndentLevel() + 'em';
            }
            return this;
        },

        doneEditing: function () {
            var newTitle = this.qs('.title').innerText,
                newNotes = this.qs('.notes').value,
                newDue = asAdate(this.qs('.due-date').value),
                newStatus = (this.qs('input[type=checkbox]').checked ?
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
                    if (this.showPosition)
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

    var TasksCollectionView = CV.extend({
        el: tasksContainer,
        modelView: TaskView
    });

    var TasksByDateView = CV.extend({
        el: tasksContainer,
        modelView: TaskView,
        render: function () {
            var viewFragment = document.createDocumentFragment(),
                dated = {},
                dueValues = [];

            this.collection.each(function (model) {
                var due = model.get('due'),
                    dueValue = due ? due.valueOf() : Infinity;

                if (!dated[dueValue]) {
                    dated[dueValue] = document.createDocumentFragment();
                    dueValues.push(dueValue);
                }

                var view = this.modelView.forModel(model);
                view.showPosition = false;
                dated[dueValue].appendChild(view.render().el);

            }, this);

            dueValues.sort();

            for (var i = 0, len = dueValues.length; i < len; ++i) {
                var dateValue = dueValues[i],
                    categoryHeader = dateValue === Infinity ?
                        'No due date' :
                        new Date(dateValue).toLocaleDateString(),
                    header = document.createElement('div');

                header.classList.add('task-header');
                header.innerText = categoryHeader;

                viewFragment.appendChild(header);

                viewFragment.appendChild(dated[dateValue]);
            }

            this.el.innerHTML = '';
            this.el.appendChild(viewFragment);

            return this;
        }
    });

    var TaskListView = V.extend({
        tagName: 'li',
        className: 'task-list-item',

        template: mktemplate('list-item-template'),

        initialize: function () {
            this.model.on('change:title selected deselected',
                        this.render, this);
            this.model.on('selected cleared', this.load, this);
            this.model.on('pre-clear', this.setLoading, this);

            var collectionViews = {
                myOrder: new TasksCollectionView({
                    collection: this.model.tasks
                }),
                byDate: new TasksByDateView({
                    collection: this.model.tasks
                })
            };

            this.currentCollectionView = collectionViews.myOrder;
            this.model.tasks.on('reset', function () {
                this.currentCollectionView.render();
            }, this);

            App.on('change:view', function (App, view, changes) {
                this.currentCollectionView = collectionViews[view];

                // If this is the currently displayed list, render it.
                if (TaskListView.currentList === this.model) {
                    this.currentCollectionView.render();
                }

            }, this);
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
            this.currentCollectionView.el.innerHTML = 'Loading...';
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
    var taskListsCollection = null;

    var TaskListsCollectionView = CV.extend({
        el: '#task-list-container',
        modelView: TaskListView,
        initialize: function () {
            this.collection.on('reset sync', this.render, this);
        }
    });

    // New task list form.
    var newTaskListForm = byId('new-task-list-form'),
        newListTitle = newTaskListForm.title;
    newTaskListForm.addEventListener('submit', function (e) {
        e.preventDefault();
        var newList = new TaskList({
            title: newListTitle.value
        });
        taskListsCollection.add(newList);
        newList.save();
        newListTitle.value = '';
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

    // View in the user's order.
    var myOrderBtn = byId('my-order-btn');
    myOrderBtn.addEventListener('click', function () {
        App.set({view: 'myOrder'});
    });

    // View sorted by date.
    var byDateBtn = byId('by-date-btn');
    byDateBtn.addEventListener('click', function () {
        App.set({view: 'byDate'});
    });

    // Popups functionality. E.g., About button.
    document.body.addEventListener('click', function (e) {
        if (e.target.dataset.href) {
            var popupElem = byId(e.target.dataset.href);
            popupElem.classList.add('show');
        } else if (e.target.classList.contains('popup-mask')) {
            e.target.classList.remove('show');
        }
    });

    var initializeAppView = function () {
        taskListsCollection = new TaskListsCollection();

        taskListsCollection.on('selected', function () {
            localStorage.lastViewedList = this.getSelectedList().get('id');
        });

        taskListsCollection.fetch({
            success: function () {
                new TaskListsCollectionView({
                    collection: taskListsCollection
                }).render();
                taskListsCollection.setSelectedList(
                    taskListsCollection.get(localStorage.lastViewedList) ||
                    taskListsCollection.getListByTitle('Default List') ||
                    taskListsCollection.at(0));
                document.body.removeChild(byId('loading-layer'));
            }
        });

        App.set({view: 'my-order'}, {silent: true});
    };

    // ↓dev
    window.initializeAppView = initializeAppView;
    // ↑dev

})(); // ¬pub
