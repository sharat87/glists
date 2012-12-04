authenticated(function (auth) {

    var taskListsCollection = new TaskListsCollection();

    taskListsCollection.on('selection-changed', function () {
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
        }
    });

    var newTaskListForm = $('#new-task-list-form'),
        newListTitle = newTaskListForm.find('input[name=title]');
    newTaskListForm.on('submit', function (e) {
        e.preventDefault();
        var newList = new TaskList({
            title: newListTitle.val()
        });
        taskListsCollection.add(newList);
        newList.save();
        newListTitle.val('');
    });

});
