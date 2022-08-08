export const displayMap = (locations) => {
  mapboxgl.accessToken =
    'pk.eyJ1Ijoia3VsdW9uZzIwMDAiLCJhIjoiY2w2YnlzYTY2MGNoMzNibW10djJzMXpkZCJ9.AYjE2JShHUR5aF3xbTJNRQ';

  var map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/kuluong2000/cl6ca6uca003615pq17iiaa72', // kiểu hiển thị map, được cài đặt từ studio map
    scrollZoom: false,
    // center: [-118.113491, 34.111745],
    // zoom: 10,
    // interactive: true,
  });

  const bounds = new mapboxgl.LngLatBounds();

  locations.forEach((loc) => {
    // Create marker
    const el = document.createElement('div');
    el.className = 'marker';

    // Add marker
    new mapboxgl.Marker({
      element: el,
      anchor: 'bottom',
    })
      .setLngLat(loc.coordinates)
      .addTo(map);
    console.log(loc.coordinates);
    // Add popup

    new mapboxgl.Popup({
      offset: 30,
    })
      .setLngLat(loc.coordinates)
      .setHTML(`<p>Day ${loc.day}: ${loc.description}</p>`)
      .addTo(map);

    // Extend map bounds to include current location
    bounds.extend(loc.coordinates);
  });

  map.fitBounds(bounds, {
    padding: {
      top: 200,
      bottom: 150,
      left: 100,
      right: 100,
    },
  });
};
