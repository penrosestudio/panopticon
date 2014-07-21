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
    'email': {
        'surname': function() {
            create new audit item when person changes their email.surname;
        }
    },
    'pets': {
        'name': function() {}
    }
};

pn.watch(personSchema, rules);
*/

var mongoose = require('mongoose'),
    jsondiffpatch = require('jsondiffpatch'),
    _ = require('underscore');

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
            email: [oldEmail, newEmail].surname
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
                    return obj.name || obj.id || obj._id || obj._id || JSON.stringify(obj);
                }
            });
            var diff = differ.diff(original, updated);
            // FIRE RULES BEHAVIOURS
            // iterate over keys of rules
                // if value is function, call with document (as this) and newValue
                // if value is object, iterate over value

            /*
             * getNewValue()
             * <diffItem> - array representing diff of item. 
             *            - Length 1 is addition [new]
             *            - Length 2 is update [old, new]
             *            - Length 3 is deletion [old, 0, 0]
             */ 
            function getNewValue(diffItem){
                if (!_.isArray(diffItem)) {
                    throw new TypeError('diffItem must be an array');
                }
                if (diffItem.length === 3) {
                    return null;
                }
                return _.last(diffItem);
            }
            /*
             * applyRules()
             * <rules>
             * <diff>
             * 
             * <throws> TypeError if <diff> is array (rule does not reflect model structure)
             * <throws> TypeError if <rules> contains an array (invalid)
             */
            function applyRules(rules, diff) {
                if (_.isArray(diff)) { 
                    throw new TypeError('diff cannot be an array') 
                }
                
                _(rules).each(function(rule, key){
                    if(_.isArray(rule)) {
                        throw new TypeError('panopticon rule cannot be an array');
                    }
                
                    var diffItem = diff[key];
                    if (diffItem) {
                        if (typeof rule === 'function') {
                            newValue = getNewValue(diffItem);
                            rule.call(doc, newValue);            
                        } else if (_.isObject(rule)) {
                            applyRules(rule, diffItem);    
                        }
                    }
                }); 
            }
            applyRules(rules, diff);            
        }
    });
};