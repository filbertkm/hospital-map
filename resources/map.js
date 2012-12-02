$(document).ready(function() {

	var self = this;

	self.popupTemplate = _.template('<dl> <% _.each(properties, function(val, key) { %> \
	 <% if (/\:/.exec(key)) { %> \
	 	<dl> \
	 		<dt><%= key.split(":")[1] %> </dt> \
			<dd><%= val %> </dd> \
		</dl> \
	 <% } else {%> \
	 <dt><%= key %> </dt> \
	 <dd><%= val %> </dd> \
	 <% } %> \
	 <% }); %> \
	 </dl>');

	// to filter them later
	self.hospitalAttributes = [];
	self.currentFilter = [];

	fetchLayers();
	var map = L.map( 'map', {
		zoom: 12,
		layers: [self.tileLayer],
	});
	GlobalMap = map;

	function addHospitalLayer(){
		var filteredLayers = _.map(self.hospitalAttributes, function (attr) {
			return L.geoJson(self.hospitals, {
					onEachFeature: function(feature, layer) {
						layer.bindPopup(self.popupTemplate({ properties: feature.properties }));
					},
					filter: function(feature, layer) {
						return _.contains(_.keys(feature.properties), attr);
					}
			});
		});

		self.layers = L.control.layers(null, {
			"Hospitals" : self.hospitalLayer
		}).addTo(map);

		debugger;
		_.each(filteredLayers, function(layer, i) {
			self.layers.addOverlay(layer, self.hospitalAttributes[i]);
		});

		// display layer
		$('.leaflet-control-layers-selector').first().trigger('click')
	}

	map.on('hospitalsfetched', addHospitalLayer);
	map.on('locationfound', onLocationFound);
	map.on('locationerror', onLocationError);

	map.on('moveend', function(e) {
		var zoom = map.getZoom();
		if (zoom < 10) {
			return;
		}
		if (!self.hospitalLayer)
			return;
		var bounds = map.getBounds();
		var sw = bounds.getSouthWest();
		var ne = bounds.getNorthEast();
		bbox = [sw.lat, sw.lng, ne.lat, ne.lng].join(',');
		var url = "http://overpass-api.de/api/interpreter?data=[out:json];node[amenity=hospital](" + bbox + ");out;";
		converter = new op2geojson();
		converter.fetch(url, function(data) {
			self.hospitals = data;
			layer = buildLayer(data)
			self.hospitalLayer.addData(data);
		});
	})

	map.locate({setView: true, maxZoom: 12});

	function buildLayer(data) {
		return L.geoJson(data, {
			onEachFeature: function(feature, layer) {
				storeBooleanAttributeKeys(feature);
				layer.bindPopup(self.popupTemplate({ properties: feature.properties }));
			},
		});
	}

	function storeBooleanAttributeKeys(feature) {
		var isHierarchical = new RegExp('\:');

		function isBoolean (val) {
			return val === 'yes' || val === 'no';
		}

		var keys = _.keys(feature.properties);
		_.each(feature.properties, function(val, key) {
			if (isHierarchical.exec(key)) {
				key = key.split(':')[1];
			}
			if (!_.contains(self.hospitalAttributes, key) && isBoolean(val)) {
				self.hospitalAttributes.push(key);
			}
		});
		self.hospitalAttributes;
	}

	function geojsonLayer() {
        url = "http://overpass-api.de/api/interpreter?data=[out:json];node[amenity=hospital](52.34,13.3,52.52,13.6);out;";
		converter = new op2geojson();
		converter.fetch(url, function(data) {
			self.hospitals = data;
			layer = buildLayer(data);
			self.hospitalLayer =  layer;
			map.fireEvent('hospitalsfetched');
		});
	}

	function fetchLayers() {
		geojsonLayer();
		self.tileLayer = L.tileLayer('http://{s}.www.toolserver.org/tiles/osm-no-labels/{z}/{x}/{y}.png', {
			maxZoom: 18,
			attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors'
		});
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
});
