( function ( $ ) {

op2geojson = function() {

	var instance = {},
		geojson;

	instance.fetch = function(url, callback) {
    	$.getJSON(url, { format: "json" },
			function(data) {
				// List all of the returned nodes
				var nodes = [];
				$.each(data.elements, function(i, item) {
					if (item.type === 'node') {
						nodes[item.id] = item;
					}
				});

				// Add nodes and ways to the layer
				var features = [];
				$.each(data.elements, function(i, item) {
					if( item.type === 'node' && item.tags != null ) {
						features.push( instance.point(item) );
					} else if (item.type === 'way') {
						features.push( instance.lineString(item, nodes) );
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

	instance.lineString = function(way, nodeArray) {
		// Get the node coordinates from nodeArray
		var coordinates = [];
		for (id in way.nodes) {
			var node = nodeArray[way.nodes[id]];
			coordinates.push([node.lon,node.lat]);
		}

		// Create the LineString
		var lineString = {
			"type" : "Feature",
			"geometry" : {
				"type" : "LineString",
				"coordinates" : coordinates
			},
			"properties" : {}
		};

		// Add the tags
		_.extend(lineString.properties, way.tags);
		return lineString;
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
