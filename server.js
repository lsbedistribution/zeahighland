import express from "express";
import cors from "cors";

const app = express();
app.use(cors());

const PORT = process.env.PORT || 3000;
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;

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

async function getPlace(query) {
  const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": GOOGLE_API_KEY,
      "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress"
    },
    body: JSON.stringify({
      textQuery: query,
      languageCode: "fr"
    })
  });

  const data = await res.json();

  return {
    status: res.status,
    raw: data,
    place: data.places?.[0] || null
  };
}

async function getReviews(placeId, label) {
  const res = await fetch(`https://places.googleapis.com/v1/places/${placeId}`, {
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": GOOGLE_API_KEY,
      "X-Goog-FieldMask": "id,displayName,formattedAddress,rating,userRatingCount,reviews"
    }
  });

  const data = await res.json();

  return {
    status: res.status,
    raw: data,
    reviews: (data.reviews || []).map(r => ({
      author_name: r.authorAttribution?.displayName || "Client",
      profile_photo_url: r.authorAttribution?.photoUri || "",
      rating: r.rating || 5,
      text: r.text?.text || "",
      relative_time_description: r.relativePublishTimeDescription || "",
      location_label: label
    }))
  };
}

app.get("/", (req, res) => {
  res.send("Zeahighland API OK");
});

app.get("/api/zeahighland-reviews", async (req, res) => {
  try {
    let all = [];
    const debug = [];

    for (const store of STORES) {
      const found = await getPlace(store.query);

      const dbg = {
        label: store.label,
        query: store.query,
        search_status: found.status,
        found_place_id: found.place?.id || null,
        found_display_name: found.place?.displayName?.text || null,
        found_address: found.place?.formattedAddress || null
      };

      if (!found.place?.id) {
        dbg.details_status = null;
        dbg.review_count = 0;
        debug.push(dbg);
        continue;
      }

      const details = await getReviews(found.place.id, store.label);

      dbg.details_status = details.status;
      dbg.review_count = details.reviews.length;

      debug.push(dbg);
      all.push(...details.reviews);
    }

    res.json({
      reviews: all.slice(0, 16),
      debug
    });
  } catch (e) {
    res.status(500).json({
      reviews: [],
      error: e.message
    });
  }
});

app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});
