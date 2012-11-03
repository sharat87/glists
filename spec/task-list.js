describe('Task lists spec', function () {

    it('should create, update and delete a new task list', function () {
        var flag = false;

        var newList = new TaskList({
            title: 'New list'
        });

        var createList = function () {
            newList.save({}, {
                success: function (model, response) {
                    expect(newList.get('id')).toBeDefined();
                    expect(newList.get('title')).toEqual('New list');
                    renameList();
                }
            });
        };

        var renameList = function () {
            newList.save({title: 'Updated list'}, {
                success: function (model, response) {
                    expect(newList.get('title')).toEqual('Updated list');
                    deleteList();
                }
            });
        };

        var deleteList = function () {
            newList.destroy({
                success: function (model, response) {
                    expect(response).toBeNull();
                    flag = true;
                }
            });
        };

        runs(createList);

        waitsFor(function () { return flag; },
               'TaskList functionality testing is not stopping.', 5000);

    });

});
