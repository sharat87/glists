(function () {

    var startApp = function (auth) {

        var taskListsCollection = new TaskListsCollection();

        taskListsCollection.on('reset', function () {
            new TaskListsCollectionView({
                collection: this
            }).renderAndApply();
        });

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
                tasklist: TaskListView.currentList.get('tasklist')
            });
            newTask.save();
        });

    };

    authenticated(startApp);

}).call(this);
