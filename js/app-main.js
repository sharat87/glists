authenticated(function (auth) {

    var taskListsCollection = new TaskListsCollection();

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
            document.body.removeChild(document.getElementById('loading-layer'));
        }
    });

    var newTaskListForm = document.getElementById('new-task-list-form'),
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

    // Activate the social buttons.
    setTimeout(function () {

        var addScript = function (url) {
            var po = document.createElement('script');
            po.async = true;
            po.src = url;
            document.body.appendChild(po);
        };

        // Twitter button.
        document.getElementById('twitter-ln').dataset.url =
            document.querySelector('link[rel=canonical]').href;
        addScript('https://platform.twitter.com/widgets.js');

        // Google +1 button.
        addScript('https://apis.google.com/js/plusone.js');

    }, 10);

});
