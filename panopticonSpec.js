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
  cities_visited: [String],
  pets: [{
    name: String,
    age: Number
  }]
});

var rules = {
    'name': function() {},
    'email': function() {},
    'address': {
        line1: function() {},
        line2: function() {}
    },
    'cities_visited': function() {},
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
                },
                cities_visited: ['Copenhagen'],
                pets: [{name: 'Fido', age: 4}, 
                       {name: 'Lucy', age: 8}]
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

            it("array item addition - returning diff", function(done){
                spyOn(rules, 'cities_visited');
                person.cities_visited.push('Paris');
                person.save(function(err, person){
                    expect(rules.cities_visited).toHaveBeenCalledWith({'_t': 'a', '1': ['Paris']});
                    done();
                });
            });

            it("object array item addition - returning diff", function(done){
                spyOn(rules, 'pets');
                person.pets.push({name: 'Coco'});
                var id = person.pets[person.pets.length - 1]._id.toString();
                person.save(function(err, person){
                    expect(rules.pets).toHaveBeenCalledWith({'_t': 'a', '2': [{name: 'Coco', _id: id}]});
                    done();
                });
            });
        });

    });

});

