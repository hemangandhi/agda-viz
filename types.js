// TODO: this is a mess and a few things need to be reasoned about. For example:
// 1) -> is not actually infix right now and should be (it's probably reasonably
//    faked and I can't contrive an example where this lack is noticable)
// 2) the objects make no sense
// 3) how to even attempt higher inductive types?
// 4) is it enough just to ask if a constructor is referring to sections?
// 5) there is no notion of constructor arity. Does this even matter?
// 6) please beat me up with a JS style guide. I know I should be punished.
// 7) should equality types be a third kind of former for the vizualizations
var AgdaParsing = function (utils) {
    // Given the tokens, a starting point that is where an opening
    // bracket is, an end index, and the bracket format (ie. '()'),
    // provides the index of the matching bracket or end if that was
    // not found.
    var indexOfMatchingParen = function(tokens, start, end, parens){
	var i = 1;
	for(var pc = 1; i + start < end && pc > 0; i++) {
	    if(tokens[i + start] === parens[0]) {
		pc++;
	    } else if(tokens[i + start] === parens[1]) {
		pc--;
	    }
	}
	return i - 1;
    }
    
    var AdgaTypeFormers = function() {
	var formers = {"fn": true, "→": true, "prod": false, "pair": false};
	var AgdaTypeFormer = function(constructor, is_sections, args) {
	    this.constructor = constructor;
	    this.is_sections = is_sections;
	    this.args = args;
	};

	return {
	    add_former: function(constructor, is_dep) {
		formers[constructor] = is_dep;
	    },
	    try_to_make: function(value, args) {
		if (value in formers) {
		    return utils.ErrorOr.Value(new AgdaTypeFormer(value, formers[value], args));
		}
		return utils.ErrorOr.Error(utils.ErrorKind.NotFound);
	    }
	};
    }();

    var AgdaTypeDecl = function(name, top_level_toks){
	this.name = name;

	// a utility to parse the top_level_toks.
	// the grammar is expected to be something like (with [ acting as (
	// in the meta-language): top_level_toks =
	// { <identifiers> : <top_level_toks> } [-> <top_level_toks>]*
	// { <identifiers> : <top_level_toks> } (-> <top_level_toks>)*
	// <ctor>
	// where ctor = Constructor <args>*
	//       args = <identifier> | (<top_level_toks>)
	var parseDecl = function(top_level_toks, start, end){
	    var ctor = function(tokens, start, end) {
		var name = tokens[start];
		var args = [];
		for(var i = start + 1; i < end;) {
		    if(tokens[i] !== '(') {
			args.push(tokens[i]);
			i++;
			continue;
		    }
		    var new_i = indexOfMatchingParen(tokens, i, end, '()');
		    args.push(parseDecl(tokens, i + 1, new_i));
		    i = new_i;
		}
		return AdgaTypeFormers.try_to_make(name, args);
	    };

	    // [string] -> (int, int)                       -- the tokens and the bounds to care about
	    //   -> Either (Either Constructor Error)       -- if it's just a parenthesized ctor
	    //             [Map string (Either type error)] -- the identifiers and then the type (or an error)
	    var inner_typedef = function(tokens, start, end) {
		var colon_idx;
		for(colon_idx = start; colon_idx < end && tokens[colon_idx] != ':'; colon_idx++);

		if(colon_idx === end) {
		    return ctor(tokens, start, end);
		} else {
		    var type = parseDecl(tokens, colon_idx + 1, end);
		    return Array(start - colon_idx)
			.map(function(idx) { return idx + start; })
		        .map(function(tok_idx) { return {tokens[tok_idx]}});
		}
	    }

	    // TODO: at least exit early on errors?
	    var inner_types = [];
	    for(var i = 0; i < end;) {
		if(tokens[i] == '('){
		    var matching_paren = indexOfMatchingParen(tokens, i, end, '()');
		    inner_types.push(inner_typedef(tokens, i + 1, matching_paren));
		    i = matching_paren + 1;
		}else if(tokens[i] == '{'){
		    var matching_paren = indexOfMatchingParen(tokens, i, end, '{}');
		    inner_types.push(inner_typedef(tokens, i + 1, matching_paren));
		    i = matching_paren + 1;
		}else{
		    var arrow_idx;
		    for(arrow_idx = i;
			arrow_idx < end && (tokens[arrow_idx] === "->" || tokens[arrow_idx] === "→");
			arrow_idx++);
		    inner_types.push(ctor(tokens, start, arrow_idx));
		    i = arrow_idx + 1;
		}
	    }
	    return inner_types;
	}

	this.parameters = parseDecl(top_level_toks, 0, top_level_toks.length);
    }

    // data ctor_rval = Either Error AdgaTypeFormer
    // string -> Map string [Either ctor_rval [Map string ctor_rval]]
    var getTopLevelDefs = function(agda_code){
	var NON_TYPE_DECL_KWDS = ['module', 'open', 'record'];

	var lines = agda_code.split("\n");
	var toks = lines.filter(function (line){
	    return !NON_TYPE_DECL_KWDS.any(function(kwd) {
		return line.startsWith(kwd);
	    });
	}).map(function (line){
	    // don't flat map so that we can use the fact that
	    // <top-level identifier> : <decl>
	    // must appear on its own line.
	    return line.split(/\s+/);
	});

	var top_level_defs = {};
	for(var i = 0; i < toks.length; i++){
	    //TODO: are where clauses different?
	    //How?
	    if(toks[i][1] === ':'){
		var top_level_name = toks[i][0];
		var top_level_toks = [];
		for(var keep_going = true, advanced = false;
		    keep_going && i < toks.length;
		    i++, advanced = true){
		    for(var j = (advanced)?0:2;
			j < toks[i].length && (keep_going = toks[i][j] == top_level_name);
			j++, top_level_toks.push(toks[i][j]));
		}
		top_level_defs[top_level_name] = new AgdaTypeDecl(top_level_name, top_level_toks);
	    }
	}
    };

    // data ctor_rval = Either Error AdgaTypeFormer
    // string -> ((string, AdgaTypeFormer) -> ())
    //   -> (Error -> ()) -> Map string [Either ctor_rval [Map string ctor_rval]]
    // where the functions are applied on each element of the maps
    var forEachType = function(source_code, map_fn, on_error) {
	// data ctor_rval = Either Error AdgaTypeFormer
	// string -> Map string [Either ctor_rval [Map string ctor_rval]]
	var decls = getTopLevelDefs(source_code);
	for(decl in decls) {
	    
	}
    }

    // Victoriously, I hold the fork
    // with a neat bundle of noodles;
    // forgetting the spaghetti on the plate.
    return {
	parseAgda: getTopLevelDefs,
	typeFormers: AdgaTypeFormers,
	TypeDecl: AdgaTypeDecl
    };

};
