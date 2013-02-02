$(document).ready(function() {

	var self = this;  // the HTMLDocument

	self.popupTemplate = _.template('<a href="http://www.openstreetmap.org/edit?editor=potlatch2&lat=<%= coordinate[1] %>&lon=<%= coordinate[0] %>&zoom=18">\
<img src="resources/img/potlatch.png"></a>\
<a href="http://www.openstreetmap.org/edit?editor=remote&lat=<%= coordinate[1] %>&lon=<%= coordinate[0] %>&zoom=18">\
<img src="resources/img/josm.png"></a>\
<h2>Hospital</h2>\
<table width="100%">\
<tr><td>Name</td><td align="right"><%= properties["name"] %></td></tr>\
<tr><td>Emergency</td><td align="right" style="text-transform:capitalize;"><%= properties["emergency"] %></td></tr>\
</table>\
<h2>Catchment Area</h2>\
<table>\
<tr><td>Surface Area</td><td><%= properties["area"] %></td></tr>\
<tr><td>Number of villages</td><td></td></tr>\
<tr><td>Population</td><td></td></tr>\
<tr><td>Furthest Village from health structure</td><td></td></tr>\
<tr><td>Average distance of all villages from health structure</td><td></td></tr>\
</table>');

    var hospitalIcon = L.icon({
        iconUrl: 'resources/img/hospital.png',

        iconSize:     [18, 18],
        iconAnchor:   [9, 9], // point on the icon corresponding to marker's location
        popupAnchor:  [2, -9] // point to open the popup from relative to iconAnchor
    });

	self.tileLayer = L.tileLayer('http://{s}.www.toolserver.org/tiles/osm-no-labels/{z}/{x}/{y}.png', {
		maxZoom: 18,
		attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors'
	});

	var map = L.map( 'map', {
		zoom: 12,
		layers: [self.tileLayer],
	}).setView([12.4822, -11.9463], 11);
    // TODO: Not sure why the above call to setView is needed

	self.amenities = ["hospital", "doctors", "dentist"];
    // This contains the layers for each of the above amenities
    self.amenityLayers = {};

	self.layersControl = L.control.layers().addTo(map);

	L.control.locate().addTo(map);

	function createQueryData(bbox) {
		return "data=[out:json];(" +
				"(node[amenity=hospital]("+ bbox +");way[amenity=hospital]("+ bbox +");node(w););" +
				"(node[amenity=doctors]("+ bbox +");way[amenity=doctors]("+ bbox +");node(w););" +
				"(node[amenity=dentist]("+ bbox +");way[amenity=dentist]("+ bbox +");node(w););" +
                "(node(" + bbox + ");relation[type=boundary][boundary=catchment_area];way(r);node(w););" +
				");out;";
	}

    var legend = L.control({position: 'bottomright'});
    legend.onAdd = function (map) {
        var div = L.DomUtil.create('div', 'info legend');
        div.innerHTML += '<img src="resources/img/hospital.png"> Hospital<br>';
        return div;
    };
    legend.addTo(map);

	map.on('moveend', function(e) {
		var zoom = map.getZoom();
		if (zoom < 10) {
			return;
		}

		// Make the bounding box string
		var bounds = map.getBounds();
		var sw = bounds.getSouthWest();
		var ne = bounds.getNorthEast();
		bbox = [sw.lat, sw.lng, ne.lat, ne.lng].join(',');

		// Get the data
		var data = createQueryData(bbox);

		// Convert the data to GeoJSON
		converter = new op2geojson();
		converter.fetch("http://overpass-api.de/api/interpreter", data, zoom, function(data) {
            if (jQuery.isEmptyObject(self.amenityLayers)) {
                var markers = {};
                var catchmentAreaForAmenity = {};

                _.each(
                    _.filter(data.features,
                        function(feature) {
                            return _.contains(_.values(feature.properties), "catchment_area");
                        }),
                    function(catchmentArea) {
                        catchmentAreaForAmenity[catchmentArea.properties["subject"]] = catchmentArea;
                    });

                console.log(catchmentAreaForAmenity);

                // Now deal with the catchment areas
                self.catchmentAreaLayer = L.geoJson(data, {
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
                            mouseover: highlightFeature,
                            mouseout: resetHighlight,
                            click: function() {
                                markers[feature.properties.subject].openPopup();
                            }
                        });
		            },
			        filter: function(feature, layer) {
				        return _.contains(_.values(feature.properties), "catchment_area");
			        }
		        });

	            _.each(self.amenities, function(amenity, i) {
                    self.amenityLayers[amenity] = L.geoJson(data, {
                        style: function(feature) {
                            return {color: 'red',
                                    fillColor: 'red',
                                    fillOpacity: 0.2,
                                    weight: 10};
                        },
    			        onEachFeature: function(feature, layer) {
                            var center;
                            if (feature.geometry.type === "Point") {
                                layer.options.icon = hospitalIcon;
                                center = feature.geometry.coordinates;
                            } else {
                                center = feature.geometry.coordinates[0];
                            }

                            var catchmentArea = catchmentAreaForAmenity[feature.id];

                            var format = new OpenLayers.Format.GeoJSON;
                            var openLayersGeo = format.parseGeometry(catchmentArea.geometry);

                            var areaInSquareMeters = openLayersGeo.getGeodesicArea();
                            var areaString = areaInSquareMeters.toFixed(2) + "m" + "2".sup();
                            if (areaInSquareMeters > 1000000) {
                                areaString = (areaInSquareMeters / 1000000).toFixed(2) + "km" + "2".sup();
                            }
                            var areaProperties = { area: areaString }

				            layer.bindPopup(self.popupTemplate({ properties: $.extend(feature.properties, areaProperties), coordinate: center }));

                            markers[feature.id] = layer;
			            },
			            filter: function(feature, layer) {
				            return _.contains(_.values(feature.properties), amenity);
			            }
		            });

                    map.addLayer(self.amenityLayers[amenity]);
		            self.layersControl.addOverlay(self.amenityLayers[amenity],
						self.amenities[i].charAt(0).toUpperCase() + self.amenities[i].slice(1));
	    	    });

                map.addLayer(self.catchmentAreaLayer);
		        self.layersControl.addOverlay(self.catchmentAreaLayer, "Catchment Areas");
            } else {
                self.catchmentAreaLayer.clearLayers();
                self.catchmentAreaLayer.addData(data);

	            _.each(self.amenities, function(amenity, i) {
                    // Update the data for each amenity layer
                    self.amenityLayers[amenity].clearLayers();
                    self.amenityLayers[amenity].addData(data);
	    	    });
            }
		});
	})

    function highlightFeature(e) {
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
    }

    function resetHighlight(e) {
        self.catchmentAreaLayer.resetStyle(e.target);
    }

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
});
