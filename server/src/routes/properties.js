// server/src/routes/properties.js
const express = require("express");
const fs = require("fs");
const path = require("path");
const multer = require("multer");
const Property = require("../models/Property");
const { auth } = require("../middleware/auth");

const router = express.Router();

/* ---------------------- Ensure Upload Directories ---------------------- */
const IMAGES_DIR = "uploads/images";
const VIDEOS_DIR = "uploads/videos";

const ensureDir = (p) => {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
};
ensureDir(IMAGES_DIR);
ensureDir(VIDEOS_DIR);

/* ------------------------- Multer Setup ------------------------- */
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (file.fieldname === "video") cb(null, VIDEOS_DIR);
    else cb(null, IMAGES_DIR);
  },
  filename: (req, file, cb) =>
    cb(
      null,
      Date.now() +
        "-" +
        Math.floor(Math.random() * 1e9) +
        path.extname(file.originalname)
    ),
});

const upload = multer({ storage });

/* ------------------------- Helpers ------------------------- */
function safeDelete(relPath) {
  try {
    if (!relPath) return;
    const abs = path.join(process.cwd(), relPath.replace(/^\//, ""));
    if (fs.existsSync(abs)) fs.unlinkSync(abs);
  } catch (e) {
    // ignore
  }
}

/* ===========================================================
   1) AGENT DASHBOARD LIST (Active only) — agent or admin
   GET /api/properties/agent/dashboard/list
   =========================================================== */
router.get("/agent/dashboard/list", auth, async (req, res) => {
  try {
    // allow agent and admin
    if (!req.user.isAgent && !req.user.isAdmin) {
      return res.status(403).json({ error: "Access denied" });
    }

    const userId = req.user.id; // using req.user.id (confirmed)
    const properties = await Property.find({
      active: { $ne: false },
      $or: [{ agent: userId }, { owner: userId }],
    })
      .populate("agent", "_id name email")
      .populate("owner", "_id name email")
      .sort({ createdAt: -1 });

    res.json(properties);
  } catch (err) {
    console.error("Dashboard error:", err);
    res.status(500).json({ error: "Dashboard error" });
  }
});

/* ===========================================================
   2) CREATE / POST PROPERTY (single route handling files)
   POST /api/properties
   =========================================================== */
router.post(
  "/",
  auth,
  upload.fields([
    { name: "images", maxCount: 10 },
    { name: "video", maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      // Only admins or subscribed users (agents) can post
      if (!req.user.isAdmin && !req.user.subscription?.active && !req.user.isAgent) {
        return res
          .status(403)
          .json({ error: "Subscription required to post properties" });
      }

      // req.body may come as fields (multipart). Required fields check:
      if (!req.body.title || req.body.title.trim() === "") {
        return res.status(400).json({ error: "Title is required" });
      }

      const data = req.body;

      // Build images list from uploaded files
      const images = (req.files?.images || []).map(
        (f) => `/${IMAGES_DIR}/${f.filename}`
      );

      const videoUrl =
        req.files?.video?.[0] && `/${VIDEOS_DIR}/${req.files.video[0].filename}`;

      // parse location if provided as JSON string
      let location;
      if (data.location) {
        try {
          const loc = typeof data.location === "string" ? JSON.parse(data.location) : data.location;
          if (loc && loc.lng !== undefined && loc.lat !== undefined) {
            location = {
              type: "Point",
              coordinates: [Number(loc.lng), Number(loc.lat)],
            };
          }
        } catch (err) {
          console.warn("Invalid location JSON:", err.message);
        }
      }

      // Ensure numeric fields are converted if needed
      if (data.price) data.price = Number(data.price);

      // Build property document
      const property = new Property({
        title: data.title,
        description: data.description || "",
         listingType: data.listingType || "Sell",
        areaName: data.areaName || "",
        city: data.city || "",
        price: data.price || 0,
        address: data.address || "",
        nearestPlace: data.nearestPlace || "",
        nearbyHighway: data.nearbyHighway || "",
        projectName: data.projectName || "",
        images,
        videoUrl,
        location,
        active: true,
        owner: req.user.id,
        postedBy: req.user.id,
        agent: req.user.isAgent ? req.user.id : null,
      });

      await property.save();

      res.json({ message: "Property posted successfully!", property });
    } catch (err) {
      console.error("Post property failed:", err);
      res.status(500).json({ error: "Post property failed" });
    }
  }
);

/* ===========================================================
   3) GET ALL ACTIVE PROPERTIES (PUBLIC)
   GET /api/properties
   =========================================================== */
router.get("/", async (req, res) => {
  try {
    const { city, areaName, search } = req.query;

    const query = {
      active: { $ne: false },
    };

    if (city) query.city = { $regex: city, $options: "i" };
    if (areaName) query.areaName = { $regex: areaName, $options: "i" };

    if (search) {
      const regex = new RegExp(search, "i");
      query.$or = [
        { title: regex },
        { description: regex },
        { city: regex },
        { areaName: regex },
      ];
    }

    const props = await Property.find(query)
      .populate("agent", "_id name email")
      .populate("owner", "_id name email")
      .sort({ createdAt: -1 });

    res.json(props);
  } catch (err) {
    console.error("Failed to load properties:", err);
    res.status(500).json({ error: "Failed to load properties" });
  }
});

/* ===========================================================
   4) GET SINGLE ACTIVE PROPERTY
   GET /api/properties/:id
   =========================================================== */
router.get("/:id", async (req, res) => {
  try {
    const property = await Property.findOne({
      _id: req.params.id,
      active: { $ne: false },
    })
      .populate("agent", "_id name email")
      .populate("owner", "_id name email");

    if (!property) return res.status(404).json({ error: "Property not found" });

    res.json(property);
  } catch (err) {
    console.error("Unable to load property:", err);
    res.status(500).json({ error: "Unable to load property" });
  }
});

/* ===========================================================
   5) UPDATE PROPERTY
   PUT /api/properties/:id
   =========================================================== */
router.put(
  "/:id",
  auth,
  upload.fields([
    { name: "images", maxCount: 10 },
    { name: "video", maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const property = await Property.findById(req.params.id);
      if (!property) return res.status(404).json({ error: "Property not found" });

      const isOwner = property.owner?.toString() === req.user.id;
      const isAgent = property.agent?.toString() === req.user.id;

      if (!isOwner && !isAgent && !req.user.isAdmin) {
        return res.status(403).json({ error: "Unauthorized" });
      }

      if (!req.user.isAdmin && !req.user.subscription?.active) {
        return res.status(403).json({ error: "Subscription inactive" });
      }

      const fields = [
        "title",
        "description",
        "areaName",
        "price",
        "address",
        "nearestPlace",
         "listingType",
        "nearbyHighway",
        "projectName",
        "city",
      ];

      fields.forEach((f) => {
        if (req.body[f] !== undefined) {
          // Convert price to number if necessary
          property[f] = f === "price" ? Number(req.body[f]) : req.body[f];
        }
      });

      // Location update
      if (req.body.location) {
        try {
          const loc = typeof req.body.location === "string" ? JSON.parse(req.body.location) : req.body.location;
          if (loc && loc.lng !== undefined && loc.lat !== undefined) {
            property.location = {
              type: "Point",
              coordinates: [Number(loc.lng), Number(loc.lat)],
            };
          }
        } catch {}
      }

      // Remove images by index if requested
      if (req.body.removeImages) {
        try {
          const remove = Array.isArray(req.body.removeImages)
            ? req.body.removeImages.map(Number)
            : JSON.parse(req.body.removeImages);
          remove.forEach((i) => {
            const img = property.images[i];
            if (img) safeDelete(img);
          });
          property.images = property.images.filter((_, i) => !remove.includes(i));
        } catch (e) {
          // ignore parse error
        }
      }

      // Append newly uploaded images
      if (req.files?.images?.length) {
        req.files.images.forEach((f) => property.images.push(`/${IMAGES_DIR}/${f.filename}`));
      }

      // Handle video upload (replace existing)
      if (req.files?.video?.length) {
        if (property.videoUrl) safeDelete(property.videoUrl);
        property.videoUrl = `/${VIDEOS_DIR}/${req.files.video[0].filename}`;
      }

      await property.save();

      res.json({ message: "Property updated", property });
    } catch (err) {
      console.error("Update failed:", err);
      res.status(500).json({ error: "Update failed" });
    }
  }
);

/* ===========================================================
   6) SOFT DELETE (Active → false)
   DELETE /api/properties/:id
   =========================================================== */
router.delete("/:id", auth, async (req, res) => {
  try {
    const property = await Property.findById(req.params.id);
    if (!property) return res.status(404).json({ error: "Not found" });

    const isOwner = property.owner?.toString() === req.user.id;
    const isAgent = property.agent?.toString() === req.user.id;

    if (!isOwner && !isAgent && !req.user.isAdmin) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    property.active = false;
    await property.save();

    res.json({ success: true, message: "Deleted" });
  } catch (err) {
    console.error("Delete failed:", err);
    res.status(500).json({ error: "Delete failed" });
  }
});

/* ===========================================================
   7) Filters & Suggestions
   =========================================================== */
router.get("/filters/cities", async (req, res) => {
  try {
    const cities = await Property.distinct("city");
    res.json(cities.filter((c) => c && c.trim() !== ""));
  } catch (err) {
    res.status(500).json({ error: "Failed to load cities" });
  }
});

router.get("/filters/areas", async (req, res) => {
  try {
    const { city } = req.query;
    if (!city) return res.json([]);
    const areas = await Property.distinct("areaName", { city });
    res.json(areas.filter((a) => a && a.trim() !== ""));
  } catch (err) {
    res.status(500).json({ error: "Failed to load areas" });
  }
});

router.get("/filters/suggestions", async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.trim() === "") return res.json([]);

    const regex = new RegExp(q, "i");

    const results = await Property.find(
      {
        $or: [
          { city: regex },
          { areaName: regex },
          { title: regex },
          { projectName: regex },
        ],
        active: { $ne: false },
      },
      { city: 1, areaName: 1, title: 1, projectName: 1 }
    )
      .limit(20);

    const suggestions = [];

    results.forEach((p) => {
      if (p.city) suggestions.push({ type: "city", value: p.city });
      if (p.areaName) suggestions.push({ type: "area", value: p.areaName });
      if (p.title) suggestions.push({ type: "project", value: p.title });
      if (p.projectName) suggestions.push({ type: "project", value: p.projectName });
    });

    // Remove duplicates
    const unique = Array.from(new Set(suggestions.map(JSON.stringify))).map(JSON.parse);

    res.json(unique);
  } catch (err) {
    console.error("Suggestion failed:", err);
    res.status(500).json({ error: "Suggestion failed" });
  }
});

module.exports = router;
