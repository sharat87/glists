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

                TaskListView.currentList = this.model;

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

    // FIXME: Need a better way to do this.
    TaskListView.currentList = null;

    var TaskListsCollectionView = window.TaskListsCollectionView = V.extend({
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

})();