import express from "express";
import cors from "cors";

const app = express();
app.use(cors());

const PORT = process.env.PORT || 3000;
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;

// Tes 2 boutiques
const STORES = [
  {
    label: "Camille Flammarion",
    query: "ZEA HIGH LAND Boulevard Camille Flammarion Marseille"
  },
  {
    label: "Pierre Roux",
    query: "Zea High Land Place Pierre Roux Marseille"
  }
];

// 🔍 Recherche du lieu
async function getPlace(query) {
  const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": GOOGLE_API_KEY,
      "X-Goog-FieldMask": "places.id"
    },
    body: JSON.stringify({
      textQuery: query,
      languageCode: "fr"
    })
  });

  const data = await res.json();
  return data.places?.[0];
}

// ⭐ Récupération des avis
async function getReviews(placeId, label) {
  const res = await fetch(`https://places.googleapis.com/v1/places/${placeId}`, {
    headers: {
      "X-Goog-Api-Key": GOOGLE_API_KEY,
      "X-Goog-FieldMask": "reviews"
    }
  });

  const data = await res.json();

  return (data.reviews || []).map(r => ({
    author_name: r.authorAttribution?.displayName || "Client",
    profile_photo_url: r.authorAttribution?.photoUri || "",
    rating: r.rating || 5,
    text: r.text?.text || "",
    relative_time_description: r.relativePublishTimeDescription || "",
    location_label: label
  }));
}

// 🚀 Endpoint API
app.get("/api/zeahighland-reviews", async (req, res) => {
  try {
    let all = [];

    for (const store of STORES) {
      const place = await getPlace(store.query);
      if (!place?.id) continue;

      const reviews = await getReviews(place.id, store.label);
      all.push(...reviews);
    }

    res.json({ reviews: all.slice(0, 16) });

  } catch (e) {
    res.status(500).json({
      reviews: [],
      error: e.message
    });
  }
});

app.get("/", (req, res) => {
  res.send("Zeahighland API OK");
});

app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});
