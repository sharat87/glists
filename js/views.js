(function () {

    // Being lazy.
    var V = Backbone.View;

    // A helper function on views for rendering and placing into the DOM.
    V.prototype.renderAndApply = function () {
        this.render();
        return this.rootElem.empty().append(this.$el);
    };

    var TaskView = window.TaskView = V.extend({
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

    var TasksCollectionView = window.TasksCollectionView = V.extend({
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

    var TaskListView = window.TaskListView = V.extend({
        tagName: 'li',
        className: 'task-list-item',

        initialize: function () {
            this.model.on('change:title', this.render, this);
        },

        render: function () {
            this.el.innerHTML = '<a href=#>' +
                              '<span>' + this.model.get('title') + '</span>' +
                              '<span class=controls>' +
                              '<button class=edit-btn>Edit</button>' +
                              '<button class=del-btn>Del</button>' +
                              '</span>' +
                              '</a>';
            return this;
        },

        events: {

            'click a': function (e) {
                e.preventDefault();

                this.$el.addClass('selected')
                    .siblings().removeClass('selected');

                $('#tasks-container').html('Loading...');

                TaskListView.currentList = this.model;

                this.model.fetchTasks({
                    success: function (collection, response) {
                        new TasksCollectionView({
                            collection: collection
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

    var TaskListsCollectionView = window.TaskListsCollectionView = V.extend({
        el: '#lists-container',

        render: function () {
            this.$el.html('<form id=new-task-list-form action="" ' +
                                'method=POST>' +
                                '<input type=text name=title ' +
                                'placeholder="New list title">' +
                                '<input type=submit value=Create>' +
                                '</form>');

            var ulElem = $('<ul>');

            this.collection.forEach(function (model) {
                new TaskListView({model: model}).render().$el.appendTo(ulElem);
            });

            this.$el.append(ulElem);

            return this;
        }

    });

})();
