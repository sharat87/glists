global.authenticated(function (auth) {

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

        var canonicalUrl = document.querySelector('link[rel=canonical]').href,
            addScript = function (url) {
                var js = document.createElement('script');
                js.async = true;
                js.src = url;
                document.body.appendChild(js);
            };

        // Twitter button.
        document.getElementById('twitter-ln').dataset.url = canonicalUrl;
        addScript('https://platform.twitter.com/widgets.js');

        // Google +1 button.
        // Automatically picks up the canonical url.
        addScript('https://apis.google.com/js/plusone.js');

        // Flattr button.
        document.getElementById('flattr-ln').href = canonicalUrl;
        addScript('https://api.flattr.com/js/0.6/load.js?'+
                'mode=auto&uid=sharat87');

    }, 10);

});
