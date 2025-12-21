from __future__ import annotations

import os
import random
from dataclasses import dataclass
from typing import Optional, List

from flask import Flask, jsonify, render_template, request, url_for

app = Flask(__name__)

# -----------------------------
# Models
# -----------------------------

@dataclass(frozen=True)
class Item:
    name: str
    slug: str


IMG_EXTS = (".png", ".jpg", ".jpeg", ".webp")

# -----------------------------
# Data (edit Nightfarers if needed)
# -----------------------------

NIGHTFARERS: List[Item] = [
    Item("Wylder", "wylder"),
    Item("Guardian", "guardian"),
    Item("Duchess", "duchess"),
    Item("Revenant", "revenant"),
    Item("Ironeye", "ironeye"),
    Item("Raider", "raider"),
    Item("Recluse", "recluse"),
    Item("Executor", "executor"),
    Item("Undertaker", "undertaker"),
    Item("Scholar", "scholar"),
]

# Expeditions (boss list you provided)
BOSSES: List[Item] = [
    Item("Tricephalos", "tricephalos"),
    Item("Gaping Jaw", "gaping-jaw"),
    Item("Sentient Pest", "sentient-pest"),
    Item("Augur", "augur"),
    Item("Equilibrious Beast", "equilibrious-beast"),
    Item("Darkdrift Knight", "darkdrift-knight"),
    Item("Fissure in the Fog", "fissure-in-the-fog"),
    Item("Night Aspect", "night-aspect"),
    Item("Balancers", "balancers"),
    Item("Dreglord", "dreglord"),
]

# Shifting Earth (no pictures)
SHIFTING_EARTH: List[Item] = [
    Item("None", "none"),
    Item("The Crater", "the-crater"),
    Item("Mountaintop", "mountaintop"),
    Item("Rotted Woods", "rotted-woods"),
    Item("Noklateo, the Shrouded City", "noklateo-the-shrouded-city"),
    Item("The Great Hollow", "the-great-hollow"),
]



# -----------------------------
# Helpers
# -----------------------------

def find_image(folder: Optional[str], candidates: List[str]) -> Optional[str]:
    """
    Supports boss icon convention: 'Darkdrift Knight.png' (spaces allowed).
    Tries item.name first, then item.slug.
    """
    if not folder:
        return None

    base_dir = os.path.join(app.static_folder, folder)
    for base in candidates:
        if not base:
            continue
        for ext in IMG_EXTS:
            filename = f"{base}{ext}"
            path = os.path.join(base_dir, filename)
            if os.path.exists(path):
                return url_for("static", filename=f"{folder}/{filename}")
    return None


def pack_item(item: Item, folder: Optional[str]) -> dict:
    img = find_image(folder, [item.name, item.slug])  # name-first for bosses
    return {"name": item.name, "slug": item.slug, "imgUrl": img}


# -----------------------------
# Routes
# -----------------------------

@app.get("/")
def index():
    return render_template(
        "index.html",
        nightfarers=[pack_item(x, "portraits") for x in NIGHTFARERS],
        bosses=[pack_item(x, "bosses") for x in BOSSES],
        earth=[pack_item(x, None) for x in SHIFTING_EARTH],  # no images
    )


@app.post("/api/roll")
def api_roll():
    payload = request.get_json(force=True) or {}
    count = int(payload.get("count", 1))
    count = max(1, min(3, count))
    count = min(count, len(NIGHTFARERS))

    picks = random.sample(NIGHTFARERS, k=count)
    boss = random.choice(BOSSES)
    earth = random.choice(SHIFTING_EARTH)

    return jsonify({
        "ok": True,
        "boss": pack_item(boss, "bosses"),
        "earth": pack_item(earth, None),
        "picks": [pack_item(x, "portraits") for x in picks],
    })



if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5177, debug=True)
