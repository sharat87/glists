describe('API endpoint integration', function () {

    var testSequence = [], // The sequence of calling the test functions.
        testSequenceTimeout = 17000, // Timeout to wait for the tests.
        initialListCount = 0;

    // The master collection of all the task lists.
    var taskListsCollection = new TaskListsCollection();

    // The new list instance to play with.
    var newList = new TaskList({
        title: 'New list'
    });

    // The new task instance to play with.
    var newTask = new TaskItem({
        title: 'Just get this done already!'
    });

    // Re-get the list instance, when the lists collection is reset.
    taskListsCollection.on('reset', function () {
        if (!newList.isNew()) {
            newList = this.get(newList.get('id'));
            // Re-get the model instance, when the collection is reset.
            if (newList) { // Won't exist if `destroy`ed.
                newList.tasks.on('reset', function () {
                    if (!newTask.isNew()) {
                        newTask = newList.tasks.get(newTask.get('id'));
                    }
                });
            }
        }
    });

    // Fetch all the lists, before we do anything.
    testSequence.push(function (nextFn) {
        taskListsCollection.fetch({
            success: function (collection) {
                initialListCount = collection.length;
                nextFn();
            }
        });
    });

    // Create a new list, as defined above.
    testSequence.push(function (nextFn) {
        taskListsCollection.add(newList);
        newList.save({}, {
            success: function () {
                expect(newList.get('id')).toBeDefined();
                expect(newList.get('title')).toEqual('New list');
                nextFn();
            }
        });
    });

    // Fetch all lists again, and see that there is a new one.
    testSequence.push(function (nextFn) {
        taskListsCollection.fetch({
            success: function (collection) {
                expect(collection.length).toEqual(initialListCount + 1);
                nextFn();
            }
        });
    });

    // Update the title of the list and confirm its changed.
    testSequence.push(function (nextFn) {
        newList.save({title: 'Updated list'}, {
            success: function () {
                expect(newList.get('title')).toEqual('Updated list');
                nextFn();
            }
        });
    });

    // Fetch tasks in the new list and ensure there are none.
    testSequence.push(function (nextFn) {
        newList.tasks.fetch({
            success: function (collection) {
                expect(collection.length).toEqual(0);
                nextFn();
            }
        });
    });

    // Save the new task to the server, on the new list.
    testSequence.push(function (nextFn) {
        newList.tasks.add(newTask);
        newTask.save({}, {
            success: function () {
                expect(newTask.get('id')).toBeDefined();
                nextFn();
            }
        });
    });

    // Fetch tasks in the new list and ensure there is exactly one.
    testSequence.push(function (nextFn) {
        newList.tasks.fetch({
            success: function (collection) {
                expect(collection.length).toEqual(1);
                nextFn();
            }
        });
    });

    // Edit the title of this task.
    testSequence.push(function (nextFn) {
        newTask.save({title: 'edited title'}, {
            success: function () {
                expect(newTask.get('title')).toEqual('edited title');
                nextFn();
            }
        });
    });

    // Mark the task completed.
    testSequence.push(function (nextFn) {
        newTask.save({status: 'completed'}, {
            success: function () {
                expect(newTask.get('status')).toEqual('completed');
                expect(newTask.get('completed')).toBeDefined();
                nextFn();
            }
        });
    });

    // Mark the task incomplete.
    testSequence.push(function (nextFn) {
        newTask.save({status: 'needsAction'}, {
            success: function () {
                expect(newTask.get('status')).toEqual('needsAction');
                expect(newTask.get('completed')).not.toBeDefined();
                nextFn();
            }
        });
    });

    // Mark the task incomplete.
    testSequence.push(function (nextFn) {
        newTask.save({notes: 'will do'}, {
            success: function () {
                expect(newTask.get('notes')).toEqual('will do');
                nextFn();
            }
        });
    });

    // Mark the task incomplete.
    testSequence.push(function (nextFn) {
        var date = new ADate();
        newTask.save({due: date}, {
            success: function () {
                expect(newTask.get('due')).toEqual(date);
                nextFn();
            }
        });
    });

    // TODO: Test updates to: parent, position, notes, hidden, links.

    // Delete the task.
    testSequence.push(function (nextFn) {
        newTask.destroy({
            success: function (model, response) {
                expect(response).toBeNull();
                nextFn();
            }
        });
    });

    // Fetch tasks in the new list again and ensure there are none.
    testSequence.push(function (nextFn) {
        newList.tasks.fetch({
            success: function (collection) {
                expect(collection.length).toEqual(0);
                nextFn();
            }
        });
    });

    // Delete the newly created list.
    testSequence.push(function (nextFn) {
        newList.destroy({
            success: function (model, response) {
                expect(response).toBeNull();
                nextFn();
            }
        });
    });

    // Fetch all lists again, and see that its back to the original listing.
    testSequence.push(function (nextFn) {
        taskListsCollection.fetch({
            success: function (collection) {
                expect(collection.length).toEqual(initialListCount);
                nextFn();
            }
        });
    });


    // Testing is done, let Jasmine know of this.
    var flag = false;
    testSequence.push(function () {
        flag = true;
    });

    it('should work with the Google API endpoint flawlessly', function () {

        // Call the functions in the sequence in order, passing control around
        // like a ping-pong.
        runs(function () {
            var makeNextFn = function (i) {
                return function () {
                    testSequence[i](makeNextFn(i + 1));
                };
            };
            makeNextFn(0)();
        });

        waitsFor(function () { return flag; },
               'TaskList functionality testing is not stopping.',
               testSequenceTimeout);

    });

});
