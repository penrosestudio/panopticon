var panopticon = require('panopticon'),
    mongoose = require('mongoose');

/*
 *  clearCollections
 *  - Removes documents from collections
 *  - Used after tests to reset db
 *  - https://github.com/elliotf/mocha-mongoose/blob/master/index.js
 */ 
var clearCollections = function(db, callback) {
  db.collections(function(err, collections){
    if (err) return callback(err);

    var todo = collections.length;
    if (!todo) return callback(null);

    collections.forEach(function(collection){
      if (collection.collectionName.match(/^system\./)) return --todo;

      collection.remove({},{safe: true}, function(){
        if (--todo === 0) callback(null);
      });
    });
  });
};

var personSchema = mongoose.Schema({
  name: String,
  email: String,
  address: {
    line1: String,
    line2: String
  },
  pets: [{
    name: String
  }]
});
var rules = {
    'name': function() {},
    'email': function() {},
    'address': {
        line1: function() {},
        line2: function() {}
    },
    'pets': {
        'name': function() {}
    }
};
panopticon.watch(personSchema, rules);
var Person = mongoose.model('Person', personSchema);

describe("Panopticon", function() {

    beforeEach(function(done){
        // Connect to the DB
        var mongoUri = 'mongodb://localhost/test';
        mongoose.connect(mongoUri, done);
    });
  
    afterEach(function(done){
        clearCollections(mongoose.connection.db, function(){
            mongoose.connection.close(done);
        });
    });
  
    describe("#watch", function(){
        var person;

        beforeEach(function(done){
            Person.create({
                name: 'Adam',
                address: {
                    line1: '123 Street Lane'
                }
            }, function(err, p){
                // Get for 'init'
                Person.findById(p.id, function(err, p){
                    person = p;
                    done();
                });
            });
        });

        describe("calls rule handler after", function(){
            it("property addition", function(done){
                spyOn(rules, 'email');
                person.email = 'adam@email.com';
                person.save(function(err, person){
                    expect(rules.email).toHaveBeenCalledWith('adam@email.com');
                    done();
                });
            });
            it("property update", function(done){
                spyOn(rules, 'name');
                person.name = 'Bert';
                person.save(function(err, person){
                    expect(rules.name).toHaveBeenCalledWith('Bert');
                    done();
                });
            });
            it("property deletion", function(done){
                spyOn(rules, 'name');
                person.name = null;
                person.save(function(err, person){
                    expect(rules.name).toHaveBeenCalledWith(null);
                    done();
                });
            });

            it("nested property addition", function(done){
                spyOn(rules.address, 'line2');
                person.address.line2 = 'Townville';
                person.save(function(err, person){
                    expect(rules.address.line2).toHaveBeenCalledWith('Townville');
                    done();
                });
            });
            it("nested property update", function(done){
                spyOn(rules.address, 'line1');
                person.address.line1 = '56 Another Street';
                person.save(function(err, person){
                    expect(rules.address.line1).toHaveBeenCalledWith('56 Another Street');
                    done();
                });
            });
            it("nested property deletion", function(done){
                spyOn(rules.address, 'line1');
                person.address.line1 = null;
                person.save(function(err, person){
                    expect(rules.address.line1).toHaveBeenCalledWith(null);
                    done();
                });
            });
        });

    });

});

