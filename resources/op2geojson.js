( function ( $ ) {

op2geojson = function() {

	var instance = {},
		geojson;

	instance.fetch = function(url) {
    	$.getJSON("http://overpass-api.de/api/interpreter?data=[out:json];node[amenity=hospital](52.34,13.3,52.52,13.6);out;", {
				format: "json"
			},
			function(data) {
				$.each(data, function(i, item) {
					console.log(item);
				});
			}
		);
	};

	instance.feature = function() {
		point = {
			"geometry" : {
				"type" : "Point",
				"coordinates" : [52.480732,13.3172386]
			},
			"type" : "Feature",
			"properties" : { "name" : "Sankt Gertrauden-Krankenhaus" },
		};
		return point;
	}

	instance.featureCollection = function() {
		collection = {
			"type" : "FeatureCollection",
			"features" : [
				instance.feature(),
			]
		};
		return collection;
	}

	instance.geojson = function() {
		return instance.featureCollection();
	}

	return instance;

};

})( jQuery );
