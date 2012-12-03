HealthMap
=========

# Summary 

[Health Map](http://jups.pegasus.uberspace.de/healthmap/) shows health care institutions like hospitals, clinics and doctors. Patients, health care workers, journalists or emergency response teams can find out which health care institutions have given property via filtering boolean attributes like wheelchairs/emergency. While displaying the institutions on a map people also see where to find them. It targets the problem [Granular Health Map](http://www.rhok.org/problems/granular-health-map).

![See all health care institutions](http://jups.pegasus.uberspace.de/dropbox/all-health-care.jpg)

![Filter to see only wheelchair-friendly health care institutions with emergency service](http://jups.pegasus.uberspace.de/dropbox/wheelchair-emergency.jpg)

# What we accomplished during the RHoK December 2012

Creating a JavaScript only application which fetches the [Overpass API](http://overpass-api.de/) (Open Street Map) for health care institutions. The app renders them on a map using [Leaflet](http://leafletjs.com/) which offers mobile friendly maps with layers and controls.

# Traction

For patients,  HealthMap offers the ability to find the right health care institution. The see where to find one with accessability for wheelchairs, which offer a dentistry and in the future more fine-grained, custom attributes.

Health care workers, health insurances, journalists and politians can explore the structure of the healt care system und understand it better.

Emergency response teams can use a specialized map that works offline (thanks to Open Streat Map) and on mobile devices (thanks to leaflet) too. If an editor with predefined forms is also porvided, it is much easier for them to quickly edit the map.

# Installation

The map doesn't need a server. Just open index.html in a web browser or visit http://jups.pegasus.uberspace.de/healthmap/

# Next steps aka TODO

Set up a database where people who want to map can store extended, more fine-grained attributes for hospitals. The problem is that the Open Street Map only supports a whitelist of tags. In the long run we want to merge the new attributes (based on the problem owners needs) into the Open Street Map. This will remove the responsibility from our infrastructure.

# Community help: 

Help convince Open Street Map community to incorporate addional attributes.

Create preset forms for Open Street Map editors to make editing easier for health care mappers.


# Dev Notes

Tags

* http://wiki.openstreetmap.org/wiki/Humanitarian_OSM_Tags/Humanitarian_Data_Model#Health_Facility

Queries

* http://overpass-api.de/api/interpreter?data=[out:json];node[amenity=hospital](52.34,13.3,52.52,13.6);out;
