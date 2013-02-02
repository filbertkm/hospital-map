( function ( $ ) {

op2geojson = function() {

	var instance = {},
		geojson;

	instance.fetch = function(url, data, zoom, callback) {
		var postCallback = function(data) {
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
					if (item.tags != undefined && item.tags['amenity'] != undefined) {
						features.push( instance.point(item) );
					}

				} else if (item.type === 'way') {
					ways[item.id] = item;
				} else if (item.type === 'relation') {
					relations[item.id] = item;
				}
			});

			$.each(ways, function(i, way) {
				if (zoom < 16) {
					var node = nodes[way.nodes[0]];
					var point = {
						type : "Feature",
						id : way.id,
						geometry : {
							type : "Point",
							coordinates : [node.lon,node.lat]
						},
						properties : {}
					};
					_.extend(point.properties, way.tags);
					features.push(point);
				} else {
					features.push(instance.lineString(way, nodes));
				}
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
    	$.post(url, data, postCallback, "json");
	};

	instance.point = function(node) {
		var point = {
			type : "Feature",
			geometry : {
				type : "Point",
				coordinates : [node.lon,node.lat]
			},
			properties : {}
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
			type : "Feature",
			geometry : {
				type : "LineString",
				coordinates : coordinates
			},
			properties : {}
		};

		// Add the tags
		_.extend(lineString.properties, way.tags);
		return lineString;
	}

	instance.featureCollection = function(features) {
		collection = {
			type : "FeatureCollection",
			features : features
		};
		return collection;
	}

	instance.polygon = function(relation, ways, nodes) {
        polyCoords = [];
        var firstCheck = true;
        var subject;

		$.each(relation.members, function(i, member) {
            if (member.role == "outer") {
                var way = ways[member.ref];
                var wayCoords = instance.lineString(way, nodes).geometry.coordinates;
				var numNodes = wayCoords.length

                // Need to ensure that the first way is in the correct direction, but this can
                // only be checked when looking at the second way
                if (firstCheck && polyCoords.length != 0) {
                    firstCheck = false;
                    if ((polyCoords[0][0] == wayCoords[0][0] &&
                        polyCoords[0][1] == wayCoords[0][1]) ||
                        (polyCoords[0][0] == wayCoords[numNodes - 1][0] &&
                        polyCoords[0][1] == wayCoords[numNodes - 1][1])) {

                        polyCoords.reverse();
                    }
                }

                if (polyCoords.length != 0) {
                    // If this way is backward
                    if (polyCoords[polyCoords.length - 1][0] != wayCoords[0][0] ||
                        polyCoords[polyCoords.length - 1][1] != wayCoords[0][1]) {

                        wayCoords.reverse();
                    }
                    polyCoords.pop();
                }
			    polyCoords = polyCoords.concat( wayCoords );
            } else if (member.role == "subject") {
                subject = member.ref;
            }
		});

        var poly = {
			type : "Feature",
			geometry : {
				type : "Polygon",
				coordinates : [polyCoords]
			},
			properties : {}
		};

		// Add the tags
		_.extend(poly.properties, relation.tags);
        poly.properties["subject"] = subject;

		return poly;
	}

	return instance;

};

})( jQuery );
