describe('API endpoint integration', function () {

    it('should work with the Google API endpoint flawlessly', function () {
        var testSequenceTimeout = 10000,
            initialListCount = 0;

        // The master collection of all the task lists.
        var taskListsCollection = new TaskListsCollection();

        // The new list instance to play with.
        var newList = new TaskList({
            title: 'New list'
        });

        // Fetch all the lists, before we do anything.
        var fetchLists1 = function () {
            taskListsCollection.fetch({
                success: function (collection, response) {
                    initialListCount = collection.length;
                    createList();
                }
            });
        };

        // Create a new list, as defined above.
        var createList = function () {
            newList.save({}, {
                success: function (model, response) {
                    expect(newList.get('id')).toBeDefined();
                    expect(newList.get('title')).toEqual('New list');
                    fetchLists2();
                }
            });
        };

        // Fetch all lists again, and see that there is a new one.
        var fetchLists2 = function () {
            taskListsCollection.fetch({
                success: function (collection, response) {
                    expect(collection.length).toEqual(initialListCount + 1);
                    fetchTasks1();
                }
            });
        };

        // Update the title of the list and confirm its changed.
        var renameList = function () {
            newList.save({title: 'Updated list'}, {
                success: function (model, response) {
                    expect(newList.get('title')).toEqual('Updated list');
                    deleteList();
                }
            });
        };

        // Fetch tasks in the new list and ensure there are none.
        var fetchTasks1 = function () {
            newList.fetchTasks({
                success: function(collection, response) {
                    expect(newList.tasks.length).toEqual(0);
                    renameList();
                }
            });
        };

        // Delete the newly created list.
        var deleteList = function () {
            newList.destroy({
                success: function (model, response) {
                    expect(response).toBeNull();
                    fetchLists3();
                }
            });
        };

        // Fetch all lists again, and see that its back to the original listing.
        var fetchLists3 = function () {
            taskListsCollection.fetch({
                success: function (collection, response) {
                    expect(collection.length).toEqual(initialListCount);
                    finishTestSequence();
                }
            });
        };

        // Testing is done, let Jasmine know of this.
        var flag = false, finishTestSequence = function () {
            flag = true;
        };

        runs(fetchLists1);

        waitsFor(function () { return flag; },
               'TaskList functionality testing is not stopping.',
               testSequenceTimeout);

    });

});
