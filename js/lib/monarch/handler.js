/* eslint space-unary-ops: 0 */
/* eslint no-redeclare: 0 */
/* eslint no-eval: 0 */

/*
 * Package: handler.js
 *
 * Namespace: bbop.monarch.handler
 *
 * External inks generated with conf/xrefs.json
 * Global variables passed by PupTent in webapp.js:
 *
 * global_xrefs_conf: Xrefs conf file from conf/xrefs.json
 */

function InitMonarchBBOPHandler() {
    var jq = require('jquery');
    if (typeof(globalUseBundle) === 'undefined' || !globalUseBundle) {
        var bbop = loaderGlobals.bbop;
    }
    else {
        var bbop = require('bbop');
    }

    // Module and namespace checking.
    // if ( typeof bbop == "undefined" ){ var bbop = {}; }

    if ( typeof bbop.monarch == "undefined" ){ bbop.monarch = {}; }
    if ( typeof bbop.monarch.widget == "undefined" ){ bbop.monarch.widget = {}; }

    if (typeof(loaderGlobals) === 'object') {
        loaderGlobals.bbop = bbop;
    }
    if (typeof(global) === 'object') {
        global.bbop = bbop;
    }
    if( typeof(exports) != 'undefined' ) {
        exports.bbop = bbop;
    }



/*
 * Constructor: handler
 *
 * Create an object that will run functions in the namespace with a
 * specific profile.
 *
 * These functions have a well defined interface so that other
 * packages can use them (for example, the results display in
 * LiveSearch.js).
 *
 * Arguments:
 *  n/a
 *
 * Returns:
 *  self
 */
bbop.monarch.handler = function (){
    this._is_a = 'bbop.monarch.handler';

    var is_def = bbop.core.is_defined;

    // Let's ensure we're sane.
    if(!global_xrefs_conf){
                throw new Error('global_xrefs_conf is missing!');
    }

    // Okay, since trying functions into existence is slow, we'll
    // create a cache of strings to functions.
    this.mangle = bbop.core.uuid();
    this.string_to_function_map = {};
    this.entries = 0; // a little extra for debugging and testing
};

/*
 * Function: dispatch
 *
 * Return a string.
 *
 * The fallback function is called if no match could be found in the
 * global_xrefs_conf. It is called with the name and context
 * arguments in the same order.
 *
 * Arguments:
 *  data - the incoming thing to be handled
 *  name - the field name to be processed
 *  context - *[optional]* a string to add extra context to the call
 *  fallback - *[optional]* a fallback function to call in case nothing is found
 *
 * Returns:
 *  string; null if it couldn't create anything
 */
bbop.monarch.handler.prototype.dispatch = function(data, name, context, fallback){

    // Aliases.
    var is_def = bbop.core.is_defined;

    // First, get the specific id for this combination.
    var did = name || '';
    did += '_' + this.mangle;
    if( context ){
	did += '_' + context;
    }

    // If the combination is not already in the map, fill it in as
    // best we can.
    if(!is_def(this.string_to_function_map[did])){

	this.entries += 1;

	// First, try and get the most specific.

	if( is_def(global_xrefs_conf[name]) ){

	    var field_hash = global_xrefs_conf[name];
	    var function_string = null;

	    if (is_def(field_hash['context'])
                && is_def(field_hash['context'][context])){
		    // The most specific.
		    function_string = field_hash['context'][context];
	    } else {
		// If the most specific cannot be found, try and get
		// the more general one.
		if (is_def(field_hash['default'])){
		    function_string = field_hash['default'];
        }
    }

	    // At the end of this section, if we don't have a string
	    // to resolve into a function, the data format we're
	    // working from is damaged.
	    if (function_string == null){
            throw new Error('global_xrefs_conf appears to be damaged!');
        }

	    // We have a string. Pop it into existance with eval.
	    var evalled_thing = eval(function_string);

	    // Final test, make sure it is a function.
	    if (! is_def(evalled_thing)
	            || evalled_thing == null
	            || bbop.core.what_is(evalled_thing) != 'function'){
            throw new Error('"' + function_string + '" did not resolve!');
	    } else {
            this.string_to_function_map[did] = evalled_thing;
	    }

	} else if( is_def(fallback) ){
	    // Nothing could be found, so add the fallback if it is
	    // there.
	    this.string_to_function_map[did] = fallback;
	}else{
	    // Whelp, nothing there, so stick an indicator in.
	    this.string_to_function_map[did] = null;
	}
    }

    // We are now ensured that either we have a callable function or
    // null, so let's finish it--either the return value of the called
    // function or null.
    var retval = null;
    if(this.string_to_function_map[did] != null){
        var cfunc = this.string_to_function_map[did];
        retval = cfunc(data, name, context);
    }

    return retval;
};

}


if (typeof loaderGlobals === 'object') {
    loaderGlobals.InitMonarchBBOPHandler = InitMonarchBBOPHandler;
}
if (typeof global === 'object') {
    global.InitMonarchBBOPHandler = InitMonarchBBOPHandler;
}
