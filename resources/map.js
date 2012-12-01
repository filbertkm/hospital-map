$(document).ready(function() {

	var self = this;

	fetchLayers();
	var map = L.map( 'map', {
		zoom: 12,
		layers: [self.tileLayer, self.hospitalLayer]
	});

	map.on('locationfound', onLocationFound);
	map.on('locationerror', onLocationError);

	map.locate({setView: true, maxZoom: 12});
	initLayerControl();

	function geojsonLayer() {
		var converter = new op2geojson();
		var data = converter.geojson();
		var layer = L.geoJson(data, {
			onEachFeature: function(feature, layer) {
				layer.bindPopup(feature.properties.name);
			}
		});
		return layer;
	}

	function fetchLayers() {
		self.hospitalLayer = geojsonLayer();
		self.tileLayer = L.tileLayer('http://{s}.www.toolserver.org/tiles/osm-no-labels/{z}/{x}/{y}.png', {
			maxZoom: 18,
			attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors'
		});
	}

	function initLayerControl() {
		L.control.layers(null, {
			"Hospitals" : self.hospitalLayer
		}).addTo(map);
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
