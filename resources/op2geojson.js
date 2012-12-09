( function ( $ ) {

op2geojson = function() {

	var instance = {},
		geojson;

	instance.fetch = function(url, data, callback) {
    	$.post(url, data,
			function(data) {
				// Add nodes and ways to the layer
				var features = [];

				// Process the data
				var nodes = {};
				var ways = {};
                var relations = {};
				$.each(data.elements, function(i, item) {
					if (item.type === 'node') {
						nodes[item.id] = item;

                        // As the nodes do not relate to other bits,
                        // they can be added here
					    if (item.type === 'node'
                            && item.tags != undefined
							&& item.tags['amenity'] != undefined) {

						    features.push( instance.point(item) );
                        }
					} else if (item.type === 'way') {
					    ways[item.id] = item;
					} else if (item.type === 'relation') {
					    relations[item.id] = item;
					}
				});

				$.each(ways, function(i, way) {
					features.push( instance.lineString(way, nodes) );
				});

				$.each(relations, function(i, relation) {
                    if (relation.tags != undefined &&
                        relation.tags['type'] == 'boundary' &&
                        relation.tags['boundary'] == 'catchment_area') {

					    features.push( instance.polygon(relation, ways, nodes) );
                    }
				});

				geojson = instance.featureCollection(features);
				callback(geojson);
			}
		, "json");;
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

	instance.polygon = function(relation, ways, nodes) {
        polyCoordinates = [];
        var firstCheck = true;

		$.each(relation.members, function(i, member) {
            if (member.role == "outer") {
                var way = ways[member.ref];
                var wayCoordinates = instance.lineString(way, nodes).geometry.coordinates;

                // Need to ensure that the first way is in the correct direction, but this can
                // only be checked when looking at the second way
                if (firstCheck && polyCoordinates.length != 0) {
                    firstCheck = false;
                    if ((polyCoordinates[0][0] == wayCoordinates[0][0] &&
                        polyCoordinates[0][1] == wayCoordinates[0][1]) ||
                        (polyCoordinates[0][0] == wayCoordinates[wayCoordinates.length - 1][0] &&
                        polyCoordinates[0][1] == wayCoordinates[wayCoordinates.length - 1][1])) {
                        polyCoordinates.reverse();
                    }
                }

                if (polyCoordinates.length != 0) {
                    // If this way is backward
                    if (polyCoordinates[polyCoordinates.length - 1][0] != wayCoordinates[0][0] ||
                        polyCoordinates[polyCoordinates.length - 1][1] != wayCoordinates[0][1]) {
                        wayCoordinates.reverse();
                    }
                    polyCoordinates.pop();
                }
			    polyCoordinates = polyCoordinates.concat( wayCoordinates );
            }
		});

        var poly = {
			"type" : "Feature",
			"geometry" : {
				"type" : "Polygon",
				"coordinates" : [polyCoordinates]
			},
			"properties" : {}
		};

		// Add the tags
		_.extend(poly.properties, relation.tags);

		return poly;
	}

	return instance;

};

})( jQuery );
