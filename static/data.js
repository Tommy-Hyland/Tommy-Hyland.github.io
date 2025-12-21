// static/data.js
// IMPORTANT:
// - boss icons: ./static/bosses/<Name>.png (spaces allowed)
// - portraits:  ./static/portraits/<slug>.png

window.__DATA__ = {
  bosses: [
    "Tricephalos",
    "Gaping Jaw",
    "Sentient Pest",
    "Augur",
    "Equilibrious Beast",
    "Darkdrift Knight",
    "Fissure in the Fog",
    "Night Aspect",
    "Balancers",
    "Dreglord",
  ].map(name => ({
    name,
    slug: slugify(name),
    imgUrl: `./static/bosses/${name}.png`,
  })),

  earth: [
    { name: "None", slug: "none" },
    "The Crater",
    "Mountaintop",
    "Rotted Woods",
    "Noklateo, the Shrouded City",
    "The Great Hollow",
  ].map(e => typeof e === "string" ? { name: e, slug: slugify(e) } : e),

  // Replace/add your real nightfarers list here.
  // slug must match portrait filenames in static/portraits/<slug>.png
  nightfarers: [
    { name: "Wylder", slug: "wylder", imgUrl: "./static/portraits/wylder.png" },
    { name: "Nightfarer 2", slug: "nightfarer-2", imgUrl: "./static/portraits/nightfarer-2.png" },
    { name: "Nightfarer 3", slug: "nightfarer-3", imgUrl: "./static/portraits/nightfarer-3.png" },
    { name: "Nightfarer 4", slug: "nightfarer-4", imgUrl: "./static/portraits/nightfarer-4.png" },
    { name: "Nightfarer 5", slug: "nightfarer-5", imgUrl: "./static/portraits/nightfarer-5.png" },
    { name: "Nightfarer 6", slug: "nightfarer-6", imgUrl: "./static/portraits/nightfarer-6.png" },
  ],
};

function slugify(s){
  return String(s || "")
    .trim()
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
