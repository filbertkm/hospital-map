function getDataURIForRegion(self, region) {
    var dataURI = "data:text/csv,";
    dataURI += "Name,Size of Catchment Area,Population of Catchment Area,Average Distance to Health Post,Max Distance to the Health Post%0A";

    _.each(self.amenities["hospital"], function(amenity) {
        var catchmentArea = self.catchmentAreas[amenity.id];
        var settlements = catchmentArea.settlements;

        var format = new OpenLayers.Format.GeoJSON;

        var sumOfDistances = 0;
        var maxDistance = 0;

        var Geographic  = new OpenLayers.Projection("EPSG:4326");
        var Mercator = new OpenLayers.Projection("EPSG:900913");

        var amenityPoint = format.parseGeometry(amenity.geometry);
        if (amenity.geometry.type == "Point") {
            //amenityPoint = new OpenLayers.Geometry.Point(amenity.geometry.coordinates[0], amenity.geometry.coordinates[1]).transform(Geographic, Mercator);
        } else { // Its a polygon
            amenityPoint = amenityPoint.getCentroid();
        }

        _.each(catchmentArea.settlements, function (settlement) {
            var settlementGeo = format.parseGeometry(settlement.geometry);

            var distance = settlementGeo.distanceTo(amenityPoint);
            sumOfDistances += distance;
            if (distance > maxDistance)
                maxDistance = distance;
        });

        var openLayersGeo = format.parseGeometry(catchmentArea.geometry);

        var areaInSquareMeters = openLayersGeo.getGeodesicArea();

        var population = 0;
        var numberOfSettlementsWithoutPopulation = 0;

        _.each(settlements, function(settlement) {
            if (typeof settlement.properties.population != "undefined") {
                population += parseInt(settlement.properties.population);
            }});

        dataURI += amenity.properties["name"] + "," + areaInSquareMeters +"," + population + "," + (sumOfDistances/settlements.length) + "," + maxDistance + "%0A";
    });

    return dataURI;
}

function catchmentAreaProperties(catchmentArea, healthPost) {
    var settlements = catchmentArea.settlements;

    var format = new OpenLayers.Format.GeoJSON;
    var openLayersGeo = format.parseGeometry(catchmentArea.geometry);

    var sumOfDistances = 0;
    var maxDistance = 0;

    var Geographic  = new OpenLayers.Projection("EPSG:4326");
    var Mercator = new OpenLayers.Projection("EPSG:900913");

    var healthPostPoint = format.parseGeometry(healthPost.geometry);
    if (healthPost.geometry.type == "Point") {
        //amenityPoint = new OpenLayers.Geometry.Point(amenity.geometry.coordinates[0], amenity.geometry.coordinates[1]).transform(Geographic, Mercator);
    } else { // Its a polygon
        healthPostPoint = healthPostPoint.getCentroid();
    }

    _.each(catchmentArea.settlements, function (settlement) {
        var settlementGeo = format.parseGeometry(settlement.geometry);

        var distance = settlementGeo.distanceTo(healthPostPoint);
        sumOfDistances += distance;
        if (distance > maxDistance)
            maxDistance = distance;
    });

    var areaInSquareMeters = openLayersGeo.getGeodesicArea();
    var areaString = areaInSquareMeters.toFixed(2) + "m" + "2".sup();
    if (areaInSquareMeters > 1000000) {
        areaString = (areaInSquareMeters / 1000000).toFixed(2) + "km" + "2".sup();
    }

    var areaProperties;
    if (typeof settlements == "undefined") {
        areaProperties = { area: areaString,
                           number_of_settlements: "Unknown",
                           population: "Unknown",
                           greatest_settlement_dist: "Unknown",
                           average_settlement_dist: "Unknown"
                         }
    } else {
        var population = 0;
        var numberOfSettlementsWithoutPopulation = 0;

        _.each(settlements, function(settlement) {
            if (typeof settlement.properties.population != "undefined") {
                population += parseInt(settlement.properties.population);
            } else {
                numberOfSettlementsWithoutPopulation++;
            }});

        if (numberOfSettlementsWithoutPopulation != 0) {
            if (numberOfSettlementsWithoutPopulation == 1) {
                population = population + " (but " + numberOfSettlementsWithoutPopulation + " settlement has no population set)";
            } else {
                population = population + " (but " + numberOfSettlementsWithoutPopulation + " settlements have no population set)";
            }
        }

        areaProperties = { area: areaString,
                           number_of_settlements: settlements.length,
                           population: population,
                           greatest_settlement_dist: maxDistance,
                           average_settlement_dist: (sumOfDistances/catchmentArea.settlements.length)
                         }
    }

    return areaProperties;
}

function initMap(self) {
	self.tileLayer = L.tileLayer('http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
		maxZoom: 18,
		attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors'
	});

	// Create the map
	var map = L.map( 'map', {
		zoom: 12,
		layers: [self.tileLayer],
	}).setView([12.4822, -11.9463], 11);

    var hash = new L.Hash(map);

	self.amenitiesShown = ["hospital"];
    self.amenities = {};
    self.amenityLayers = {};  // contains the layers for each amenity type
    self.catchmentAreaSettlementsLayers = {}; // Settlement layers, addressed by catchmentArea.id
    self.settlementsLayerGroup = L.layerGroup(); // A layer group for all the settlement layers, such that they can be treated as one layer in the control
    self.catchmentAreas = {};
    self.healthPosts = {};
    self.markers = {};
    self.converter = new op2geojson();

	// Layer controller
	self.layersControl = L.control.layers().addTo(map);

    map.addLayer(self.settlementsLayerGroup);
	self.layersControl.addOverlay(self.settlementsLayerGroup, "Settlements");

    var emptyFeatureCollection = { type: "FeatureCollection", features: [] };

    var hospitalIcon = L.icon({
        iconUrl: 'resources/img/hospital.png',

        iconSize:     [18, 18],
        iconAnchor:   [9, 9], // point on the icon corresponding to marker's location
        popupAnchor:  [2, -9] // point to open the popup from relative to iconAnchor
    });

    self.catchmentAreaLayer = L.geoJson(emptyFeatureCollection, {
        style: function(feature) {
            return {fillColor: 'green',
                    weight: 2,
                    opacity: 1,
                    color: 'black',
                    dashArray: '3',
                    fillOpacity: 0.1};
        },
        onEachFeature: function(feature, layer) {
            layer.on({
                mouseover: function(e) {
                    var layer = e.target;

                    layer.setStyle({
                        weight: 5,
                        color: '#666',
                        dashArray: '',
                        fillOpacity: 0.1
                    });

                    if (!L.Browser.ie && !L.Browser.opera) {
                        layer.bringToFront();
                    }
                },
                mouseout: function(e) {
                    self.catchmentAreaLayer.resetStyle(e.target);
                },
                click: function() {
                    self.markers[feature.properties.subject].openPopup();
                }
            });
        },
        filter: function(feature, layer) {
            return _.contains(_.values(feature.properties), "catchment_area");
        }
    });
    map.addLayer(self.catchmentAreaLayer);
    self.layersControl.addOverlay(self.catchmentAreaLayer, "Catchment Areas");

    function createAmenityLayer(amenity) {
        return L.geoJson(emptyFeatureCollection, {
            style: function(feature) {
                return {color: 'red',
                        fillColor: 'red',
                        fillOpacity: 0.2,
                        weight: 10};
            },
            onEachFeature: function(feature, layer) {
                self.amenities[amenity].push(feature);

                var center;
                if (feature.geometry.type === "Point") {
                    layer.options.icon = hospitalIcon;
                    center = feature.geometry.coordinates;
                } else {
                    center = feature.geometry.coordinates[0];
                }

                var catchmentArea = self.catchmentAreas[feature.id];

                layer.bindPopup(self.editorTemplate({coordinate: center}) +
                    self.healthPostTemplate(feature.properties) +
                    self.catchmentAreaTemplate(catchmentAreaProperties(catchmentArea, feature)));

                self.markers[feature.id] = layer;
            },
            filter: function(feature, layer) {
				// TODO: Fix and make more efficient
                return _.contains(_.values(feature.properties), amenity);
            }
        });
    }

    _.each(self.amenitiesShown, function(amenity, i) {
        self.amenityLayers[amenity] = createAmenityLayer(amenity);

        map.addLayer(self.amenityLayers[amenity]);
        self.layersControl.addOverlay(self.amenityLayers[amenity],
            self.amenitiesShown[i].charAt(0).toUpperCase() + self.amenitiesShown[i].slice(1));
    });

	L.control.locate().addTo(map);

	// Legend
    var legend = L.control({position: 'bottomright'});
    legend.onAdd = function (map) {
        var div = L.DomUtil.create('div', 'info legend');
        div.innerHTML += '<img src="resources/img/hospital.png"> Hospital<br>';
        return div;
    };
    legend.addTo(map);

	return map;
}

function displayMap(self, map) {

	function createQueryData(bbox) {
		return "data=[out:json];(" +
				"(node[amenity=hospital]("+ bbox +");way[amenity=hospital]("+ bbox +");node(w););" +
				//"(node[amenity=doctors]("+ bbox +");way[amenity=doctors]("+ bbox +");node(w););" +
				//"(node[amenity=dentist]("+ bbox +");way[amenity=dentist]("+ bbox +");node(w););" +
                "(node(" + bbox + ");relation[type=boundary][boundary=catchment_area];way(r);node(w););" +
				");out;";
	}

	var zoom = map.getZoom();
	if (zoom < 10) {
		return;
	}

	// Make the bounding box string
	var bounds = map.getBounds();
	var sw = bounds.getSouthWest();
	var ne = bounds.getNorthEast();
	bbox = [sw.lat, sw.lng, ne.lat, ne.lng].join(',');

    self.converter = new op2geojson();

    function addSettlementsForArea(catchmentArea) {
		// Create the bounding polygon for the query
        var poly = "";
        _.each(catchmentArea.geometry.coordinates[0], function(coordinatePair) {
            poly += coordinatePair[1] + " " + coordinatePair[0] + " ";
        });
        poly = poly.slice(0, -1);

        var query = 'data=[out:json];(node(poly:"' + poly + '");<;node(w););out;';

        function processSettlements(data, catchmentArea) {
            data.features = _.filter(data.features, function(feature) {
                                    return _.contains(_.keys(feature.properties), "place") ||
                                       feature.properties["landuse"] == "residential";
                                });
            catchmentArea.settlements = data.features;

            if (catchmentArea.id in self.catchmentAreaSettlementsLayers) {
                self.catchmentAreaSettlementsLayers[catchmentArea.id].clearLayers();
                self.catchmentAreaSettlementsLayers[catchmentArea.id].addData(data);
            } else {
                self.catchmentAreaSettlementsLayers[catchmentArea.id] = L.geoJson(data, {
                    style: function(feature) {
                        return {fillColor: 'green',
                                weight: 2,
                                opacity: 1,
                                color: 'black',
                                dashArray: '3',
                                fillOpacity: 0.1};
                    },
                    onEachFeature: function(feature, layer) {
                        var center;
                        if (feature.geometry.type === "Point") {
                            center = feature.geometry.coordinates;
                        } else {
                            center = feature.geometry.coordinates[0];
                        }

                        var displayProperties = { name: feature.properties["name"], population: feature.properties["population"] };
                        if (typeof displayProperties["name"] == "undefined")
                            displayProperties["name"] = "Unknown";
                        if (typeof displayProperties["population"] == "undefined")
                            displayProperties["population"] = "Unknown";

                        layer.bindPopup(self.editorTemplate({coordinate: center}) + self.settlementTemplate(displayProperties));
                    }
                });
                self.settlementsLayerGroup.addLayer(self.catchmentAreaSettlementsLayers[catchmentArea.id]);

                var healthPost = self.healthPosts[catchmentArea.properties.subject];

                var center;
                if (healthPost.geometry.type === "Point") {
                    center = healthPost.geometry.coordinates;
                } else {
                    center = healthPost.geometry.coordinates[0];
                }

                self.markers[catchmentArea.properties.subject].bindPopup(self.editorTemplate({coordinate: center}) +
                    self.healthPostTemplate(healthPost.properties) +
                    self.catchmentAreaTemplate(catchmentAreaProperties(catchmentArea, healthPost)));
            }
        }

        // Fetch settlement data
        self.converter.fetch("http://overpass-api.de/api/interpreter", query, zoom,
            (function(catchmentArea) { return function (data) { processSettlements(data, catchmentArea); }; })(catchmentArea));
    }

	var query = createQueryData(bbox);

    _.each(self.amenitiesShown, function(amenity) {
        self.amenities[amenity] = [];
    });

	// Convert the data to GeoJSON
	self.converter.fetch("http://overpass-api.de/api/interpreter", query, zoom, function(data) {

		self.catchmentAreaLayer.clearLayers();
        var oldCatchmentAreas = self.catchmentAreas;
        self.catchmentAreas = {};
        self.healthPosts = {};

        // For each health post
        _.each(
            _.filter(data.features,
                function(feature) {
                    return feature.properties["amenity"] == "hospital";
                }),
            function(healthPost) {
                // Add it to the associative array
                self.healthPosts[healthPost.id] = healthPost;
            }
        );

        // For each catchment area polygon
        _.each(
            _.filter(data.features,
                function(feature) {
                    return _.contains(_.values(feature.properties), "catchment_area");
                }),
            function(catchmentArea) {
                // Add it to the associative array
                var subjectId = catchmentArea.properties["subject"];

                if (subjectId in oldCatchmentAreas) {
                    catchmentArea = oldCatchmentAreas[subjectId];
                }

                self.catchmentAreas[subjectId] = catchmentArea;

                // If the settlements for this catchment area have already been fetched
		        if (typeof catchmentArea.settlements == 'undefined') {
                    addSettlementsForArea(catchmentArea);
		        }
            }
        );

		self.catchmentAreaLayer.clearLayers();
		self.catchmentAreaLayer.addData(data);

        _.each(self.amenitiesShown, function(amenity, i) {
            // Update the data for each amenity layer
            self.amenityLayers[amenity].clearLayers();
            self.amenityLayers[amenity].addData(data);
        });
	});
}

$(document).ready(function() {

	var self = this;  // the HTMLDocument

    self.editorTemplate = _.template('<a href="http://www.openstreetmap.org/edit?editor=potlatch2&lat=<%= coordinate[1] %>&lon=<%= coordinate[0] %>&zoom=18">\
<img src="resources/img/potlatch.png"></a>\
<a href="http://www.openstreetmap.org/edit?editor=remote&lat=<%= coordinate[1] %>&lon=<%= coordinate[0] %>&zoom=18">\
<img src="resources/img/josm.png"></a>');

	self.healthPostTemplate = _.template('<h2>Hospital</h2>\
<table width="100%">\
<tr><td>Name</td><td align="right"><%= name %></td></tr>\
<tr><td>Emergency</td><td align="right" style="text-transform:capitalize;"><%= emergency %></td></tr>\
</table>');

	self.catchmentAreaTemplate = _.template('<h2>Catchment Area</h2>\
<table>\
<tr><td>Surface Area</td><td align="right"><%= area %></td></tr>\
<tr><td>Number of Settlements</td><td align="right"><%= number_of_settlements %></td></tr>\
<tr><td>Population</td><td align="right"><%= population %></td></tr>\
<tr><td>Furthest distance from settlement to health structure</td><td align="right"><%= greatest_settlement_dist %></td></tr>\
<tr><td>Average distance of all settlements from health structure</td><td align="right"><%= average_settlement_dist %></td></tr>\
</table>');

	self.settlementTemplate = _.template('<h3>Settlement</h3>\
<table width="100%">\
<tr><td>Name</td><td align="right"><%= name %></td></tr>\
<tr><td>Population</td><td align="right"><%= population %></td></tr>\
</table>');

	var map = initMap(self);

	map.on('moveend', function(e) {
		displayMap(self, map);
	})

	function onLocationFound(e) {
		self.currentLocation = e.latlng;
		var radius = e.accuracy / 2;
		L.marker(e.latlng).addTo(map)
			.bindPopup("You are within " + radius + " meters of this point.").openPopup();
	}

	function onLocationError(e) {
		alert(e.message);
	}

	map.on('locationfound', onLocationFound);
	map.on('locationerror', onLocationError);

	map.locate({setView: true, maxZoom: 12});
	displayMap(self, map);
});
