function getVillages(area, zoom) {
	var poly = "12.3 -12.3 12.4 -12.3 12.48 -12.25 12.35 -12.19";
	var query = 'data=[out:json];(node(poly:"' + poly + '");<;);out;';

	converter = new op2geojson();
	converter.fetch("http://overpass-api.de/api/interpreter", query, zoom, function(data) {
		
	});
}
