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
        },
        isActive: function () {
            // FIXME: Icky implementation.
            return this === this.$el.data('renderer');
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

        /*jshint newcap:false */
        var view = this.views[model.cid] = new this({model: model});

        model.on('destroy', view.remove, view);
        return view;
    };

    // A View class similar to `Backbone.View`, intended to be used with
    // Collections.
    var CV = V;

    // A helper function to create template renderer functions.
    var mktemplate = function (elem) {
        var templateString = byId(elem).innerHTML;
        return function (data) {
            return Mustache.render(templateString, data);
        };
    };

    var TaskView, TaskHeaderView, TasksCollectionView, TasksByDateView,
        TaskListView, TaskListsCollectionView;

    var toolbarView = new (V.extend({
        el: document.querySelector('#right-panel > header'),

        initialize: function () {
            App.on('change:view', this.render, this);
            this.render();
        },

        render: function () {
            if (this._currentView) {
                this._currentView.classList.remove('current');
            }
            this._currentView = this.qs({
                    myOrder: '.my-order-btn',
                    byDate: '.by-date-btn'
                }[App.get('view')]);
            this._currentView.classList.add('current');
        },

        events: {

            // View in the user's order.
            'click .my-order-btn': function () {
                App.set({view: 'myOrder'});
            },

            // View sorted by date.
            'click .by-date-btn': function () {
                App.set({view: 'byDate'});
            },

            'click .clear-btn': function () {
                TaskListView.currentList.clear();
            },

            'click .add-task-btn': function () {
                var task = new TaskItem(),
                    view = new TaskView({model: task});

                TaskListView.currentList.tasks.add(task, {at: 0});

                tasksContainer
                    .insertBefore(view.render().el, tasksContainer.firstChild);

                view.startEditing();
            }

        }

    }))();

    // Shut jshint from saying toolbarView is never used.
    (function () { return toolbarView; } ());

    TaskView = V.extend({
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
            var isNew = this.model.isNew(),
                newTitle = this.qs('.title').innerText,
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
                }, {
                    success: _.bind(function () {
                        if (isNew) {
                            this.model.position.saveIfDirty();
                        }
                    }, this)
                });
            }

            if (!isNew) {
                this.model.position.saveIfDirty();
            }
            return this;
        },

        startEditing: function () {
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

        addTaskBelow: function () {
            var task = new TaskItem(),
                index = TaskListView.currentList.tasks.indexOf(this.model),
                nextTask = TaskListView.currentList.tasks.at(index + 1);

            if (nextTask &&
                nextTask.getIndentLevel() > this.model.getIndentLevel()) {
                // Next task is a child.
                task.position.set({
                    parent: this.model.get('id')
                });
            } else {
                // Next task is a sibling.
                task.position.set({
                    parent: this.model.position.get('parent'),
                    previous: this.model.get('id')
                });
            }

            TaskListView.currentList.tasks.add(task, {at: index + 1});

            var view = new TaskView({model: task});
            tasksContainer.insertBefore(view.render().el, this.el.nextSibling);

            view.startEditing();
        },

        addTaskAbove: function () {
            var task = new TaskItem(),
                index = TaskListView.currentList.tasks.indexOf(this.model);

            task.position.set({
                parent: this.model.position.get('parent') || null,
                previous: this.model.position.get('previous')
            });

            TaskListView.currentList.tasks.add(task, {at: index});

            var view = new TaskView({model: task});
            tasksContainer.insertBefore(view.render().el, this.el);

            view.startEditing();
        },

        events: {

            'focus .title': 'startEditing',

            'keydown .due-date': function (e) {
                if (e.which === 13) {
                    e.preventDefault();
                    this.doneEditing();
                }
            },

            'keydown .title': function (e) {
                if (e.which === 13) {
                    e.preventDefault();
                    this.doneEditing();

                    // Return key.
                    if (e.shiftKey) {
                        this.addTaskBelow();
                    } else if (e.ctrlKey) {
                        this.addTaskAbove();
                    }

                } else if (e.which === 9) {
                    // Tab key for indentation changes.
                    e.preventDefault();
                    if (this.showPosition)
                        this.model[e.shiftKey ? 'dedent' : 'indent']();

                }
            },

            'keydown .title,.due-date': function (e) {
                if (e.which === 27) {
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

    TasksCollectionView = CV.extend({
        el: tasksContainer,
        render: function () {
            var modelsFragment = document.createDocumentFragment();

            this.collection.each(function (model) {
                var view = TaskView.forModel(model);
                view.showPosition = true;
                modelsFragment.appendChild(view.render().el);
            }, this);

            this.el.innerHTML = '';
            this.el.appendChild(modelsFragment);

            this.$el.data('renderer', this);

            return this;
        }
    });

    TasksByDateView = CV.extend({
        el: tasksContainer,
        template: mktemplate('task-header-template'),

        initialize: function () {
            this.collection.on('sync destroy', function () {
                if (this.isActive()) this.render();
            }, this);
        },

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

                var view = TaskView.forModel(model);
                view.showPosition = false;
                dated[dueValue].appendChild(view.render().el);

            }, this);

            dueValues.sort();

            for (var i = 0, len = dueValues.length; i < len; ++i) {
                var dateValue = dueValues[i],
                    categoryHeader = dateValue === Infinity ?
                        'No due date' :
                        new ADate(dateValue).toLocaleString();

                var headerView = new TaskHeaderView();
                headerView.due = categoryHeader;
                viewFragment.appendChild(headerView.render().el);
                viewFragment.appendChild(dated[dateValue]);
            }

            this.el.innerHTML = '';
            this.el.appendChild(viewFragment);

            this.$el.data('renderer', this);

            return this;
        }

    });

    TaskHeaderView = V.extend({
        className: 'task-header',
        template: mktemplate('task-header-template'),

        initialize: function () {
            // FIXME: Better way to do this?
            this.due = null;
            this.collapsed = false;
        },

        render: function () {
            this.el.innerHTML = this.template({
                due: this.due,
                collapsed: this.collapsed
            });
            return this;
        },

        toggleCollapsed: function () {
            this.collapsed = !this.collapsed;
            this.render();
            var next = this.el.nextSibling;
            while (next && next.classList.contains('task-item')) {
                next.style.display = this.collapsed ? 'none' : '';
                next = next.nextSibling;
            }
        },

        events: {
            'click .expando-btn': 'toggleCollapsed'
        }

    });

    TaskListView = V.extend({
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

            App.on('change:view', function (App, view) {
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

    TaskListsCollectionView = CV.extend({
        el: '#task-list-container',

        initialize: function () {
            this.collection.on('reset sync', this.render, this);
        },

        render: function () {
            var modelsFragment = document.createDocumentFragment();

            this.collection.each(function (model) {
                modelsFragment.appendChild(
                    TaskListView.forModel(model).render().el);
            }, this);

            this.el.innerHTML = '';
            this.el.appendChild(modelsFragment);

            return this;
        }
    });

    // New task list form.
    var newTaskListForm = byId('new-task-list-form'),
        newListTitle = newTaskListForm.title;
    newTaskListForm.addEventListener('submit', function (e) {
        e.preventDefault();
        var title = newListTitle.value;
        if (!title) return;
        var newList = new TaskList({
            title: title
        });
        taskListsCollection.add(newList);
        newList.save();
        newListTitle.value = '';
    });

    // Make task items reorder-able by dragging their handles.
    $(tasksContainer).sortable({
        handle: '.drag-handle',
        stop: function (e, ui) {
            ui.item.trigger('moved');
        }
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
    };

    // ↓dev
    window.initializeAppView = initializeAppView;
    // ↑dev

})(); // ¬pub
