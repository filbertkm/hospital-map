$(document).ready(function() {

	var self = this;

	self.popupTemplate = _.template('<a href="http://www.openstreetmap.org/edit?editor=potlatch2&lat=<%= coordinate[1] %>&lon=<%= coordinate[0] %>&zoom=18">\
<img src="resources/img/potlatch.png">\
</a>\
<a href="http://www.openstreetmap.org/edit?editor=remote&lat=<%= coordinate[1] %>&lon=<%= coordinate[0] %>&zoom=18">\
<img src="resources/img/josm.png">\
</a>\
<table>\
<tr><th>Key</th><th>Value</th></tr>\
<% _.each(properties, function(val, key) { %> \
<% if (/\:/.exec(key)) { %> \
<tr> \
<td><%= key.split(":")[1] %> </td> \
<td><%= val %> </td> \
</tr> \
<% } else {%> \
<tr>\
<td><%= key %> </td> \
<td><%= val %> </td> \
</tr>\
<% } %> \
<% }); %> \
</table>');

	self.tileLayer = L.tileLayer('http://{s}.www.toolserver.org/tiles/osm-no-labels/{z}/{x}/{y}.png', {
		maxZoom: 18,
		attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors'
	});

	var map = L.map( 'map', {
		zoom: 12,
		layers: [self.tileLayer],
	}).setView([12.4822, -11.9463], 11);
    // TODO: Not sure why the above call to setView is needed
	GlobalMap = map;

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

        div.innerHTML += '<img href="resources/img/hospital.png"> Hospital<br>';

        return div;
    };
    legend.addTo(map);

	map.on('moveend', function(e) {
		var zoom = map.getZoom();
		if (zoom < 10) {
			return;
		}

		var bounds = map.getBounds();
		var sw = bounds.getSouthWest();
		var ne = bounds.getNorthEast();
		bbox = [sw.lat, sw.lng, ne.lat, ne.lng].join(',');
		var data = createQueryData(bbox);
		converter = new op2geojson();
		converter.fetch("http://overpass-api.de/api/interpreter", data, function(data) {

            if (jQuery.isEmptyObject(self.amenityLayers)) {
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
                            click: zoomToFeature
                        });
                        /*var center;
                        if (feature.geometry.type === "Point") {
                            center = feature.geometry.coordinates;
                        } else {
                            center = feature.geometry.coordinates[0];
                        }

			            layer.bindPopup(self.popupTemplate({ properties: feature.properties, coordinate: center }));*/
		            },
			        filter: function(feature, layer) {
				        return _.contains(_.values(feature.properties), "catchment_area");
			        }
		        });

                map.addLayer(self.catchmentAreaLayer);
		        self.layersControl.addOverlay(self.catchmentAreaLayer, "Catchment Areas");

	            _.each(self.amenities, function(amenity, i) {
                    self.amenityLayers[amenity] = L.geoJson(data, {
                        style: function(feature) {
                            return {color: 'red',
                                    weight: 10};
                        },
    			        onEachFeature: function(feature, layer) {
                            var center;
                            if (feature.geometry.type === "Point") {
                                center = feature.geometry.coordinates;
                            } else {
                                center = feature.geometry.coordinates[0];
                            }

				            layer.bindPopup(self.popupTemplate({ properties: feature.properties, coordinate: center }));
			            },
			            filter: function(feature, layer) {
				            return _.contains(_.values(feature.properties), amenity);
			            }
		            });
                    map.addLayer(self.amenityLayers[amenity]);
		            self.layersControl.addOverlay(self.amenityLayers[amenity], self.amenities[i].charAt(0).toUpperCase() + self.amenities[i].slice(1));
	    	    });
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
        var geojsonLayer = self.catchmentAreaLayer;
        self.catchmentAreaLayer.resetStyle(e.target);
    }

    function zoomToFeature(e) {
        map.fitBounds(e.target.getBounds());
    }

	function onLocationFound(e) {
		self.currentLocation = e.latlng;
		var radius = e.accuracy / 2;
		L.marker(e.latlng).addTo(map)
		.bindPopup("You are within " + radius + " meters from this point").openPopup();
	}

	function onLocationError(e) {
		alert(e.message);
	}

	map.on('locationfound', onLocationFound);
	map.on('locationerror', onLocationError);

	map.locate({setView: true, maxZoom: 12});
});
