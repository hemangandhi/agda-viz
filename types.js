// TODO: make this an actual enum like the type formers below.
var ErrorKind = {
    NoError: 0,
    InvalidToken: 1,
    ArityMismatch: 2
}

var AdgaTypeFormers = function() {
    var AgdaTypeFormer = function(aliases, form_type, valid_arity) {
	this.form_type = form_type;
	this.aliases = aliases;
	this.valid_arity = valid_arity;
	this.try_parse = function(tokens, nesting_callback){
	    if(tokens.length == 0 ||
	       !aliases.any(function(alias) {return alias == tokens[0]})){
		return ErrorKind.InvalidToken;
	    }
	};
    };

    // both of these include their dependent variants.
    return {
	FUNCTION: new AgdaTypeFormer(["fn", "→"], function(v){
	    this.a = v[0];
	    this.r = v[1];
	}),
	PRODUCT: new AdgaTypeFormer(["prod"], function(v){
	    this.l = v[0];
	    this.r = v[1];
	}),
	USER_DEFINED: new AdgaTypeFormer([], function(){
	    this.params = [];
	})
    };
}();

var AgdaTypeDecl = function(name, top_level_toks){
    this.name = name;
    this.hidden = false;

    var parseDecl = function(){
	
    }
}

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
	    top_level_defs[top_level_name] = top_level_toks;
	}
    }
};
