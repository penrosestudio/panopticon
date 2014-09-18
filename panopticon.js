/*
Example schema:

var personSchema = mongoose.Schema({
  name: String,
  email: String,
  pets: [{
    name: String
  }]
});

var pn = require('panopticon');

var rules = {
    'name': function(newValue) {
        this // the document at the point of post-save
    },
    'email': function() {
    },
    'pets': {
        'name': function() {}
    }
};

pn.watch(personSchema, rules);
*/

var jsondiffpatch = require('jsondiffpatch'),
    _ = require('underscore');

/*
 * getNewValue()
 *
 * Returns the new value of a document property
 *
 * @param {Array} diffItem representing change to property (see jsondiffpatch)
 */ 
function getNewValue(diffItem){
    if (!_.isArray(diffItem)) {
        throw new TypeError('diffItem must be an array');
    }
    if (diffItem.length === 3) {
        return null;
    }
    return _.last(diffItem);
};

var isDiffArray = function(diff) {
  return diff._t === 'a';
};

/*
 * applyRules()
 *
 * Calls rules functions
 *
 * @param {Object} doc the document just saved
 * @param {Object} rules the functions to call when paths in diff
 * @param {Object} diff the diff between the old and new document
 * 
 * @throws TypeError if diff is array (rule does not reflect model structure)
 * @throws TypeError if rules contains an array (invalid)
 */
var applyRules = function(doc, rules, diff, arrayIndex) {
  if (_.isArray(diff)) { 
      throw new TypeError('diff cannot be an array') 
  }

  _(diff).each(function(diffItem, key){
    
    if (typeof rules[key] === 'function') {
      newValue = isDiffArray(diffItem) ? diffItem : getNewValue(diffItem);
      var rule = rules[key];
      rule.call(doc, newValue);
    } else if (_.isObject(rules[key])) {
      applyRules(doc, rules[key], diffItem);
    } 

  });
};

/*
 * watch()
 * <schema> - a Mongoose schema
 * <rules>  - an object containing watch rules
 *
 */
exports.watch = function(schema, rules) {
    
    // SET UP ORIGINAL OBJECT
    schema.pre('init', function (next, doc) {
        // stringify prunes methods from the document
        doc._original = JSON.parse(JSON.stringify(doc));
        next();
    });
    
    // SET UP POST SAVE WITH DIFFING
    /* Example diff:
        diff: {
            pets: {
                name: ['berty', 'fred']
            },
            email: [oldEmail, newEmail]
        }
    */
    schema.post('save', function () {
        var doc = this;
        var original = doc.get('_original');
        if (original) {
            var updated = JSON.parse(JSON.stringify(doc));
            var differ = jsondiffpatch.create({
                // this is so the differ can tell what has changed for arrays of objects
                objectHash: function(obj) {
                    return obj.id || obj._id || obj._id || JSON.stringify(obj);
                }
            });
            var diff = differ.diff(original, updated);
            applyRules(doc, rules, diff);            
        }
    });
};