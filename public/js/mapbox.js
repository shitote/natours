/* eslint disable */

const locations = JSON.parse(document.getElementById('map').dataset.locations);
console.log(locations);

mapboxgl.accessToken =
  'pk.eyJ1Ijoic3RldmVzaGl0b3RlIiwiYSI6ImNsbnIxcTUxeDE0NXUyaXM2bmNodXc0ZnIifQ.QodxPjh3bA07N_w8kxTDPQ';
var map = new mapboxgl.Map({
  container: 'map',
  style: 'mapbox://styles/steveshitote/clnr21gw000fs01qye96e0sue',
  scrollZoom: false,
});

const bounds = new mapboxgl.LngLatBounds();

location.forEach((loc) => {
  // Add marker
  const el = document.createElement('div');
  el.className = 'marker';

  // Add marker
  new mapboxgl.Marker({
    element: el,
    anchor: 'bottom',
  })
    .setLngLat(loc.coordinates)
    .addTo(Map);

  // add a popup
  new mapboxgl(),
    Popup({
      offset: 30,
    })
      .setLngLat(loc.coordinates)
      .setHTML(`<p>Day ${loc.day}: ${loc.description}</>`)
      .addTo(map);

  // Extend map bounds to include current location
  bounds.extend(loc.coordinates);
});

map.fitBounds(bounds, {
  padding: {
    top: 200,
    bottom: 250,
    left: 100,
    right: 100,
  },
});
