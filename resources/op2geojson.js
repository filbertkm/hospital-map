( function ( $ ) {

op2geojson = function() {

	var instance = {},
		geojson;

	instance.fetch = function(url, callback) {
    	$.getJSON(url, { format: "json" },
			function(data) {
				var features = [];
				$.each(data.elements, function(i, item) {
					if( item.type === 'node' ) {
						features.push( instance.point(item) );
					}
				});
				geojson = instance.featureCollection(features);
				callback(geojson);
			}
		);
	};

	instance.point = function(node) {
		var point = {
			"type" : "Feature",
			"geometry" : {
				"type" : "Point",
				"coordinates" : [node.lon,node.lat]
			},
			"properties" : {}
		};
		_.extend(point.properties, node.tags);
		return point;
	}

	instance.featureCollection = function(features) {
		collection = {
			"type" : "FeatureCollection",
			"features" : features
		};
		return collection;
	}

	instance.geojson = function() {
		url = "http://overpass-api.de/api/interpreter?data=[out:json];node[amenity=hospital](52.34,13.3,52.52,13.6);out;";
		instance.fetch(url, function(data) {
			return data;
		});
	}

	return instance;

};

})( jQuery );
