$(document).ready(function() {

	var self = this;

	fetchLayers();
	var map = L.map( 'map', {
		zoom: 12,
		layers: [self.tileLayer]
	});

	function addHospitalLayer(){
		L.control.layers(null, {
			"Hospitals" : self.hospitalLayer
		}).addTo(map);
		// display layer
		$('.leaflet-control-layers-selector').first().trigger('click')
	}

	$('body').bind('hospitalsfetched', addHospitalLayer);
	map.on('locationfound', onLocationFound);
	map.on('locationerror', onLocationError);

	map.locate({setView: true, maxZoom: 12});

	function geojsonLayer() {
        url = "http://overpass-api.de/api/interpreter?data=[out:json];node[amenity=hospital](52.34,13.3,52.52,13.6);out;";
		converter = new op2geojson();
		converter.fetch(url, function(data) {
			var style = {
				"color": "red",
				"weight" : 50,
				"opacity" : 0.65
			};
			layer = L.geoJson(data, {
				style: function(feature) {
					return style;
				},
				onEachFeature: function(feature, layer) {
					layer.bindPopup(feature.properties.name);
				}
			});
			self.hospitalLayer =  layer;
			$('body').trigger('hospitalsfetched');
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

	function renderHospitalIcon() {
		var hospitalIcon = L.icon({
			iconUrl: 'resources/img/hospital.png'
		});
		self.hospitalLayer.addTo(map);
//		if (self.currentLocation) {
//			L.marker([self.currentLocation.lat, self.currentLocation.lng], {icon: hospitalIcon})
//				.addTo(self.hospitalLayer)
//				.bindPopup('Hospital 1');
//		}
	}
});
