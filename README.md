Panopticon
==========

A post-save handler for Mongoose.

Avoid callbacks with global rules for changes to Mongoose documents. Define functions which are called whenever chosen properties change.

## Usage
```
var mongoose = require('mongoose'),
  panopticon = require('panopticon');

var personSchema = mongoose.Schema({
  name: String,
  email: String,
  pets: [{
    name: String
  }]
});

var rules = {
    'name': function(newValue) {
        // called whenever a Person is saved with a new or altered name
    },
    'email': function(newValue) {
        // called whenever a Person is saved with a new or altered email
    },
    'pets': function(jsondiff) {
        // called whenever a Person is saved with changes to the 'pets' array
    }
};

pn.watch(personSchema, rules);
*/