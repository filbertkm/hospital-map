$(document).ready(function() {

	var map = L.map( 'map' );

	L.tileLayer('http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
	   maxZoom: 18,
	   attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors'
	  }).addTo(map);

	function onLocationFound(e) {
	  var radius = e.accuracy / 2

	  L.marker(e.latlng).addTo(map)
	  	.bindPopup("You are within " + radius + " meters from this point").openPopup();
	}

	function onLocationError(e) {
	  alert(e.message);
	}

	map.on('locationfound', onLocationFound);
	map.on('locationerror', onLocationError);

	map.locate({setView: true, maxZoom: 16});
})( jQuery );
