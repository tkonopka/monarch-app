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

// Module and namespace checking.
if (typeof bbop == 'undefined') { var bbop = {};}
if (typeof bbop.monarch == 'undefined') { bbop.monarch = {};}

// The beginnings of a monarch specific handler, just a copy of amigo's
// handler right now

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
/* 
 * Package: linker.js
 * 
 * Namespace: bbop.monarch.linker
 * 
 * Generic Monarch link generator
 * 
 * Server information generated from conf/server_config*
 * files
 * 
 * External inks generated with conf/xrefs.json
 * 
 * Global variables passed by PupTent in webapp.js:
 * 
 * global_app_base: App host address from conf/server_config*
 * global_xrefs_conf: Xrefs conf file from conf/xrefs.json
 * 
 */

// Module and namespace checking.
if (typeof bbop == 'undefined') { var bbop = {};}
if (typeof bbop.monarch == 'undefined') { bbop.monarch = {};}

/*
 * Constructor: linker
 * 
 * Create an object that can make URLs and/or anchors.
 * 
 * These functions have a well defined interface so that other
 * packages can use it.
 * 
 * Arguments:
 *  n/a
 * 
 * Returns:
 *  self
 */
bbop.monarch.linker = function (){
    this._is_a = 'bbop.monarch.linker';

    // With the new dispatcher, relative URLs no longer work, so we
    // have to bring in server data--first let's ensure it.
    if(typeof global_app_base === 'undefined'){
    throw new Error('we are missing access to global_app_base!');
    }
    // Easy app base.
    this.app_base = global_app_base;

    // Categories for different special cases (internal links).
    this.generic_item = {
        'subject': true,
        'object': true
    };
};

/*
 * Function: url
 * 
 * Return a url string.
 * 
 * Arguments:
 *  args - id
 *  xid - *[optional]* an internal transformation id
 *  modifier - *[optional]* modify xid; only used with xid
 * 
 * Returns:
 *  string (url); null if it couldn't create anything
 */
bbop.monarch.linker.prototype.url = function (id, xid, modifier, category){
    
    var retval = null;

    ///
    /// Monarch hard-coded internal link types.
    ///

    // For us, having an xid means that we will be doing some more
    // complicated routing.
    if(xid && xid != ''){

        // First let's do the ones that need an associated id to
        // function--either data urls or searches.
        if(id && id != ''){
            if(this.generic_item[xid]){
                if (typeof category === 'undefined'){
                    throw new Error('category is missing!');
                } else if (category != 'pathway' && !(/^_/.test(id))){
                    retval = this.app_base + '/' + category + '/' + id;
                }
            }
        }
    
        // Since we couldn't find anything with our explicit local
        // transformation set, drop into the great abyss of the xref data.
        if(!retval && id && id != ''){ // not internal, but still has an id
            if(!global_xrefs_conf){
                throw new Error('global_xrefs_conf is missing!');
            }
    
            // First, extract the probable source and break it into parts.
            var full_id_parts = bbop.core.first_split(':', id);
            if(full_id_parts && full_id_parts[0] && full_id_parts[1]){
                var src = full_id_parts[0];
                var sid = full_id_parts[1];
        
                // Now, check to see if it is indeed in our store.
                var lc_src = src.toLowerCase();
                var xref = global_xrefs_conf[lc_src];
                if (xref && xref['url_syntax']){
                    retval =
                        xref['url_syntax'].replace('[example_id]', sid, 'g');
                }
            }
        }
    }
    return retval;
};

/*
 * Function: img
 * 
 * Return a html img string.
 * 
 * Arguments:
 *  args - id
 *  xid - *[optional]* an internal transformation id
 *  modifier - *[optional]* modify xid; only used with xid
 * 
 * Returns:
 *  string (img tag); null if it couldn't create anything
 */
bbop.monarch.linker.prototype.img = function (id, xid, modifier, category){
    
    var retval = null;

    ///
    /// Monarch hard-coded internal link types.
    ///

    // For us, having an xid means that we will be doing some more
    // complicated routing.
    if(xid && xid != ''){

        if(!retval && id && id != ''){ // not internal, but still has an id
            if(!global_xrefs_conf){
                throw new Error('global_xrefs_conf is missing!');
            }
    
            // First, extract the probable source and break it into parts.
            var full_id_parts = bbop.core.first_split(':', id);
            if(full_id_parts && full_id_parts[0] && full_id_parts[1]){
                var src = full_id_parts[0];
                var sid = full_id_parts[1];
        
                // Now, check to see if it is indeed in our store.
                var lc_src = src.toLowerCase();
                var xref = global_xrefs_conf[lc_src];
                if (xref && xref['image_path']){
                    retval = '<img class="source" src="' + global_app_base 
                              + xref['image_path'] + '"/>';
                }
            }
        }
    }
    return retval;
};


/*
 * Function: anchor
 * 
 * Return a link as a chunk of HTML, all ready to consume in a
 * display.
 * 
 * If args['id'] is a list then iterate over this.set_anchor()
 * 
 * Arguments:
 *  args - hash--'id' required; 'label' and 'hilite' are inferred if not extant
 *  xid - *[optional]* an internal transformation id
 *  rest - *[optional]* modify xid; only used with xid
 * 
 * Returns:
 *  string (link); null if it couldn't create anything
 */
bbop.monarch.linker.prototype.anchor = function(args, xid, modifier){
    
    var anchor = this;
    var retval = null;

    // Don't even start if there is nothing.
    if(args){
        // Get what fundamental arguments we can.
        var id = args['id'];
        if (typeof id === 'string'){
            retval = this.set_anchor(id, args, xid, modifier);
        } else if (id instanceof Array){
            retval = '';
            for (var i = 0, l = id.length; i < l; i++){
                var anchor_tag = this.set_anchor(id[i], args, xid, modifier);
                
                if (anchor_tag){
                    retval = retval + ((retval) ? ', ' + anchor_tag : anchor_tag);
                } 
            }
            if (retval === ''){
                retval = null;
            }
        }
    }

    return retval;
};

/*
 * Function: set_anchor
 * 
 * Return a link as a chunk of HTML, all ready to consume in a
 * display.
 */
bbop.monarch.linker.prototype.set_anchor = function(id, args, xid, modifier){
    
    var retval = null;
    var label = args['label'];
    if (!label){ 
        label = id; 
    }
    
    // Infer hilite from label if not present.
    var hilite = args['hilite'];
    if (!hilite){ hilite = label; }
    
    var category = args['category'];
    
    // See if the URL is legit. If it is, make something for it.
    var url = this.url(id, xid, modifier, category);
    var img = this.img(id, xid, modifier, category);
    if (url){

        // If it wasn't in the special transformations, just make
        // something generic.
        if (!retval && img
                && xid == 'source-site'){
            retval = '<a title="' + id +
            ' (go to source page)" href="' + url + '">' + img + '</a>';
        } else if (!retval && img
                && xid == 'source'){
            retval = '<a title="' + id +
            ' (go to source page) " + href="' + url + '">' + id + '</a>';
        }
        else if (!retval){
            // We want to escape < and >
            // should probably break out into function
            hilite = hilite.replace(/\>/g,'&gt;');
            hilite = hilite.replace(/\</g,'&lt;');
            
            retval = '<a title="' + id +
            ' (go to the page for ' + label +
            ')" href="' + url + '">' + hilite + '</a>';
        }
    }
    return retval;
}
    

/*
 * Package: browse.js
 * 
 * Namespace: monarch.widget.browse
 * 
 * BBOP object to draw various UI elements that have to do with
 * autocompletion.
 * 
 * This is a completely self-contained UI and manager.
 */

/*
 * Note, this heavily based on the bbop browse widget, and is attempt
 * to make functions more manager agnostic, i.e., this should accept
 * a golr jquery manager, or a more generic rest query manager.
 * 
 * As a starting point will just have this working with as a subclass of 
 *   
 */

if ( typeof bbop == "undefined" ){ var bbop = {}; }
if ( typeof bbop.monarch == "undefined" ){ bbop.monarch = {}; }
if ( typeof bbop.monarch.widget == "undefined" ){ bbop.monarch.widget = {}; }

/*
 * Constructor: browse
 * 
 * Contructor for the bbop.widget.browse object.
 * 
 * This is a specialized (and widgetized) subclass of
 * <bbop.golr.manager.jquery>.
 * 
 * While everything in the argument hash is technically optional,
 * there are probably some fields that you'll want to fill out to make
 * things work decently. The options for the argument hash are:
 * 
 *  topology_graph_field -  the field for the topology graph
 *  transitivity_graph_field - the field for the transitivity graph
 *  info_button_callback - functio to call when info clicked, gets doc
 *  base_icon_url - the url base that the fragments will be added to
 *  image_type - 'gif', 'png', etc.
 *  current_icon - the icon fragment for the current term
 *  info_icon - the icon fragment for the information icon
 *  info_alt - the alt text and title for the information icon
 * 
 * The basic formula for the icons is: base_icon_url + '/' + icon +
 * '.' + image_type; then all spaces are turned to underscores and all
 * uppercase letters are converted into lowercase letters.
 * 
 * The functions for the callbacks look like function(<term acc>,
 * <json data for the specific document>){}. If no function is given,
 * an empty function is used.
 * 
 * Arguments:
 *  server - string url to SciGraph server;
 *  manager - a <bbop.rest.manager.jquery> object
 *  reference_id - starting ontology class ID
 *  interface_id - string id of the HTML element to build on
 *  in_argument_hash - *[optional]* optional hash of optional arguments
 * 
 * Returns:
 *  this object
 */
bbop.monarch.widget.browse = function(server, manager, reference_id, interface_id,
                  in_argument_hash){

    // Per-UI logger.
    var logger = new bbop.logger();
    logger.DEBUG = true;
    function ll(str){ logger.kvetch('B (widget): ' + str); }

    this._is_a = 'monarch.widget.browse';

    var anchor = this;
    var loop = bbop.core.each;
    
    // Our argument default hash.
    // Let's keep these in case we want to refactor to include a GOlr manager
    var default_hash =
    {
        'info_button_callback' : function(){},
        'base_icon_url' : null,
        'image_type' : 'gif',
        'current_icon' : 'this',
        'info_icon' : 'info',
        'info_alt' : 'Click for more information.'
    };
    var folding_hash = in_argument_hash || {};
    var arg_hash = bbop.core.fold(default_hash, folding_hash);

    // There should be a string interface_id argument.
    this._interface_id = interface_id;
    this._info_button_callback = arg_hash['info_button_callback'];
    var base_icon_url = arg_hash['base_icon_url'];
    var image_type = arg_hash['image_type'];
    var current_icon = arg_hash['current_icon'];
    var info_icon = arg_hash['info_icon'];
    var info_alt = arg_hash['info_alt'];
   
    // The current acc that we are interested in.
    this._current_acc = null;
    this._reference_id = reference_id;
    this.server = server;
    this.manager = manager;

    // Successful callbacks call draw_rich_layout.
    manager.register('success', 'do', draw_rich_layout);

    // Recursively draw a rich layout using nested uls.
    function draw_rich_layout(resp){
    
        ///
        /// Get the rich layout from the returned document if
        /// possible. Note the use of JSON, supplied by jQuery,
        /// instead of out internal method bbop.json.parse.
        ///

        var topo_graph = new bbop.model.bracket.graph();
        topo_graph.load_json(resp._raw);
        
        var ancestors = topo_graph.get_ancestor_subgraph(anchor._current_acc);
        
        var trans_graph = new bbop.model.graph()
        
        loop(ancestors.all_nodes(), function(n){
            if (n.id() != 'HP:0000118'){
                trans_graph.add_node(n);
                var edge = new bbop.model.edge(anchor._current_acc, n.id(), 'subClassOf');
                trans_graph.add_edge(edge);
            }
        });
        
        loop(topo_graph.get_child_nodes(anchor._current_acc), function(n){
            if (n.id() != 'HP:0000118'){
                trans_graph.add_node(n);
                var edge = new bbop.model.edge(n.id(), anchor._current_acc, 'subClassOf')
                trans_graph.add_edge(edge);
            }
        });

        //var trans_graph = new bbop.model.graph();
        //trans_graph.load_json(ancestors);

        //ll('to: ' + doc['topology_graph']);
        //ll('tr: ' + doc['transitivity_graph']);
        //ll('ro: ' + anchor._current_acc);
        //ll('g: ' + topo_graph.get_parent_nodes(anchor._current_acc));
        var rich_layout = topo_graph.rich_bracket_layout(anchor._current_acc,
                                 trans_graph);
        ll("rl: " + bbop.core.dump(rich_layout));

        ///
        /// Next, produce the raw HTML skeleton.
        /// TODO: Keep a cache of the interesting ids for adding
        /// events later.
        ///

        // I guess we'll just start by making the list.
        var tl_attrs = {
            'class': 'bbop-js-ui-browse'
        };
        var top_level = new bbop.html.list([], tl_attrs);

        // Store the navigation anf info buttons.
        var nav_button_hash = {};
        var info_button_hash = {};

        // Cycle down through the brackets, adding spaces every time
        // we go down another level.
        var spacing = '&nbsp;&nbsp;&nbsp;&nbsp;';
        var spaces = spacing;
        loop(rich_layout, // for every level
             function(layout_level){
             loop(layout_level, // for every item at this level
                  function(level_item){           

                  var nid = level_item[0];
                  var lbl = level_item[1];
                  var rel = level_item[2];
                  
                  // For various sections, decide to run image
                  // (img) or text code depending on whether
                  // or not it looks like we have a real URL.
                  var use_img_p = true;
                  if( base_icon_url == null || base_icon_url == '' ){
                      use_img_p = false;
                  }

                  // Clickable acc span.
                  // No images, so the same either way. Ignore
                  // it if we're current.
                  var nav_b = null;
                  if(anchor._current_acc == nid){
                      var inact_attrs = {
                      'class': 'bbop-js-text-button-sim-inactive',
                      'title': 'Current term.'
                      };
                      nav_b = new bbop.html.span(nid, inact_attrs);
                  }else{
                      var tbs = bbop.widget.display.text_button_sim;
                      var bttn_title =
                      'Reorient neighborhood onto this node (' +
                      nid + ').';
                      nav_b = new tbs(nid, bttn_title);
                      nav_button_hash[nav_b.get_id()] = nid;
                  }

                  // Clickable info span. A little difference
                  // if we have images.
                  var info_b = null;
                  if( use_img_p ){
                      // Do the icon version.
                      var imgsrc = bbop.core.resourcify(base_icon_url,
                                    info_icon,
                                    image_type);
                      info_b =
                      new bbop.html.image({'alt': info_alt,
                                   'title': info_alt,
                                   'src': imgsrc,
                                   'generate_id': true});
                  }else{
                      // Do a text-only version.
                      info_b =
                      new bbop.html.span('<b>[i]</b>',
                                 {'generate_id': true});
                  }
                  info_button_hash[info_b.get_id()] = nid;

                  // "Icon". If base_icon_url is defined as
                  // something try for images, otherwise fall
                  // back to this text ick.
                  var icon = null;
                  if( use_img_p ){
                      // Do the icon version.
                      var ialt = '[' + rel + ']';
                      var isrc = null;
                      if(anchor._current_acc == nid){
                      isrc = bbop.core.resourcify(base_icon_url,
                                          current_icon,
                                      image_type);
                      }else{
                      isrc = bbop.core.resourcify(base_icon_url,
                                          rel, image_type);
                      }
                      icon =
                      new bbop.html.image({'alt': ialt,
                                   'title': rel,
                                   'src': isrc,
                                   'generate_id': true});
                  }else{
                      // Do a text-only version.
                      if(anchor._current_acc == nid){
                      icon = '[[->]]';
                      }else if( rel && rel.length && rel.length > 0 ){
                      icon = '[' + rel + ']';
                      }else{
                      icon = '[???]';
                      }
                  }

                  // Stack the info, with the additional
                  // spaces, into the div.
                  top_level.add_to(spaces,
                           icon,
                           nav_b.to_string(),
                           lbl,
                           info_b.to_string());
                  }); 
             spaces = spaces + spacing;
             }); 

        // Add the skeleton to the doc.
        jQuery('#' + anchor._interface_id).empty();
        jQuery('#' + anchor._interface_id).append(top_level.to_string());

        ///
        /// Finally, attach any events to the browser HTML doc.
        ///

        // Navigation.
        loop(nav_button_hash,
             function(button_id, node_id){

             jQuery('#' + button_id).click(
                 function(){
                 var tid = jQuery(this).attr('id');
                 var call_time_node_id = nav_button_hash[tid];
                 //alert(call_time_node_id);
                 // Check if the reference class is a subclass of the current node
                 
                 parent_nodes = topo_graph.get_parent_nodes().map( function (val){ return val.id; });
                 if (parent_nodes.indexOf(anchor._reference_id) > -1){
                     anchor.draw_browser('HP:0000118', anchor._reference_id, call_time_node_id, call_time_node_id);
                 } else {
                     anchor.draw_browser('HP:0000118', call_time_node_id, anchor._reference_id, call_time_node_id);
                 }
                 });
             });

        // Information.
        loop(info_button_hash,
             function(button_id, node_id){

             jQuery('#' + button_id).click(
                 function(){
                 var tid = jQuery(this).attr('id');
                 var call_time_node_id = info_button_hash[tid];
                 var newurl = "/phenotype/"+call_time_node_id;
                 window.location.href = newurl;
                 
                 });
         });
    }
    
    /*
     * Function: draw_browser
     * 
     * Bootstraps the process.
     * 
     * Parameters:
     *  term_acc - acc of term we want to have as the term of interest
     * 
     * Returns
     *  n/a
     */
    this.draw_browser = function(root, middle, leaf, term_acc){
        anchor._current_acc = term_acc;
        // Data call setup
        // http://geoffrey.crbs.ucsd.edu:9000/scigraph/dynamic/browser/branch?start_id=MP%3A0005266&root_id=HP%3A0000118&leaf_id=HP%3A0011014
        var rsrc = this.server + "dynamic/browser/branch.json" + "?root_id=" + root 
                               + "&start_id=" + middle
                               + "&leaf_id=" + leaf + "&relationship=subClassOf|partOf|isA";
       
        anchor.manager.resource(rsrc);
        anchor.manager.method('get');
        anchor.manager.jsonp_callback('callback');
        
        anchor.manager.update('search');
    };
    
    /*
     * Function: init_browser
     * 
     * Bootstraps the process.
     * 
     * Parameters:
     *  term_acc - acc of term we want to have as the term of interest
     * 
     * Returns
     *  n/a
     */
    this.init_browser = function(term_acc){
        anchor._current_acc = term_acc;
        // Data call setup
        var rsrc = this.server + "dynamic/browser.json" + "?start_id=" + term_acc + "&root_id=HP:0000118&relationship=subClassOf|partOf|isA";
       
        anchor.manager.resource(rsrc);
        anchor.manager.method('get');
        anchor.manager.jsonp_callback('callback');
        
        anchor.manager.update('search');
    };
    
};
