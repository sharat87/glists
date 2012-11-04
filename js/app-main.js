authenticated(function (auth) {

    var taskListsCollection = new TaskListsCollection();

    taskListsCollection.on('reset', function () {
        new TaskListsCollectionView({
            collection: this
        }).render();
    });

    taskListsCollection.fetch();

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
