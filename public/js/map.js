mapboxgl.accessToken = mapToken;
const coordinates = listing.geometry.coordinates;
const title = listing.title;

const map = new mapboxgl.Map({
  container: "map", // container ID
  style: "mapbox://styles/mapbox/streets-v12", // style URL
  center: coordinates, // starting position [lng, lat]
  zoom: 9, // starting zoom
});

const marker = new mapboxgl.Marker({ color: "red", scale: 1.2 })
  .setLngLat(coordinates) //Listing.geometry.coordinates
  .setPopup(
    new mapboxgl.Popup({ offset: 25 }).setHTML(
      `<h3>${listing.title}</h3><p>Exact Location will be provided after booking</p>`,
    ),
  )
  .addTo(map);

map.on("load", function () {
  map.addSource("circle-source", {
    type: "geojson",
    data: {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          geometry: {
            type: "Point",
            coordinates: coordinates,
          },
        },
      ],
    },
  });

  map.addLayer({
    id: "circle-layer",
    type: "circle",
    source: "circle-source",
    paint: {
      "circle-radius": 101,
      "circle-color": "#00f",
      "circle-opacity": 0.3,
    },
  });
});
