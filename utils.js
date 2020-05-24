var ErrorKind = {
    NoError: 0,
    InvalidArgument: 1,
    NotFound: 2
}

var SumType = (function () {
    var typ = function(l, r, parity) {
	var _this = this;
	this.l = l;
	this.r = r;
	this.parity = parity;
	this.ind = function(lf, rf) {
	    if (parity) {
		return lf(_this.l);
	    } else {
		return rf(_this.r);
	    }
	}
    }

    return {
	inl: function(l) {return new typ(l, null, true);},
	inr: function(r) {return new typ(null, r, false);},

    }
})();

// TODO: merge with the above?
var ErrorOr = (function () {
    var ErrorOrType = function(e, b) {n
	var eot_t = this;
	
	this.value = e;
	this.is_error = b;
	this.bind = function(m) {
	    if(eot_t.is_error) {
		return eot_t;
	    } else {
		return m(eot_t.value);
	    }
	}
	this.value_or = function(or) {
	    if(eot_t.is_error) {
		return or;
	    } else {
		return eot_t.value;
	    }
	}
	this.on_error = function(m) {
	    if(eot_t.is_error) {
		return m(eot_t.value);
	    } else {
		return eot_t;
	    }
	}
    };

    return {
	Error: function(v) { return ErrorOrType(v, true); },
	Value: function(v) { return ErrorOrType(v, false); },
    }
})();
