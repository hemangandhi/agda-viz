var UIUtils = function (utils) {
    var RenderingType = {
	POINT: 0,
	LINE: 1,
	PLANE: 2,
	BOX: 3,
	CIRCLE: 4,
	DISC: 5,
	BLOB_2: 6,
	BLOB_3: 7
    };
    
    var RenderableType = function(adga_type) {
	this.adga_info = adga_type;
	this.plotting = RenderingType.POINT;
    }
    
    var getDrawableTypes = function(defs){
	for(var top_level in defs) {
	    
	}
    };
}
