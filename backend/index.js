// ================= IMPORTS =================
// Standard & Third-party libraries
const express = require("express");
const cors = require("cors");
const axios = require("axios");
const multer = require("multer");
const FormData = require("form-data");
require("dotenv").config();

// Local modules
const { addPost, readDb } = require("./db");
const { postToInsta, getProfile } = require("./instagram");

// ================= APP CONFIGURATION =================
const app = express();
app.use(cors()); // Enable CORS for frontend communication
app.use(express.json()); // Parse JSON bodies

// ================= FILE UPLOAD CONFIG (Multer) =================
// Store files in memory buffer for processing before upload
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // Limit file size to 5MB
});

// ================= HELPER FUNCTIONS =================
/**
 * Uploads a single photo to Facebook but does not publish it to the feed immediately.
 * Returns the photo ID and URL.
 */
async function uploadPhotoToFacebook(file) {
  const formData = new FormData();

  formData.append("source", file.buffer, {
    filename: file.originalname,
    contentType: file.mimetype,
  });

  // "published": "false" means upload to album but don't show on feed yet
  formData.append("published", "false");
  formData.append("access_token", process.env.PAGE_TOKEN);

  const res = await axios.post(
    `https://graph.facebook.com/v19.0/${process.env.PAGE_ID}/photos`,
    formData,
    { headers: formData.getHeaders() }
  );

  const photoId = res.data.id;

  // Get the source URL of the uploaded photo
  const photoRes = await axios.get(
    `https://graph.facebook.com/${photoId}?fields=images&access_token=${process.env.PAGE_TOKEN}`
  );

  const photoUrl = photoRes.data.images[0].source;

  return { id: photoId, url: photoUrl };
}

// ================= API ROUTES =================

// --- GET: System Info ---
// Returns configuration info like Page ID and Instagram Username
app.get("/api/info", async (req, res) => {
  try {
    // Fetch Page Name & Picture from Facebook Graph API
    const pageRes = await axios.get(`https://graph.facebook.com/v19.0/${process.env.PAGE_ID}?fields=name,picture&access_token=${process.env.PAGE_TOKEN}`);

    // Fetch Instagram Name
    let instagramName = process.env.IG_USERNAME;
    try {
      const igUser = await getProfile();
      if (igUser.full_name) instagramName = igUser.full_name;
    } catch (e) {
      console.error("IG Info Error:", e.message);
    }

    res.json({
      facebookPage: process.env.PAGE_ID,
      facebookPageName: pageRes.data.name,
      facebookPagePicture: pageRes.data.picture?.data?.url,
      instagramUsername: process.env.IG_USERNAME,
      instagramName: instagramName,
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to load configuration" });
  }
});

// --- GET: Fetch Posts ---
// Retrieves list of posts from the local database
app.get("/api/posts", async (req, res) => {
  try {
    const posts = await readDb();
    res.json(posts);
  } catch (err) {
    res.status(500).json({ error: "Failed to read posts database" });
  }
});

// --- POST: Create New Post ---
// Handles uploading images to FB/IG and saving post data
// Accepts up to 4 images in the 'images' field
app.post("/api/post", upload.array("images", 4), async (req, res) => {
  try {
    const { title, category, short_description, content } = req.body;

    if (!title || !content) {
      return res.status(400).json({ error: "title and content required" });
    }

    // Construct the caption for social media
    const message = `
📌 ${title}
🗂 หมวดหมู่: ${category || "-"}
✍ ${short_description || ""}
--------------------
${content}
`;

    // --- Parallel Uploads ---
    // 1. Upload to Instagram (if images exist)
    const igPromise = (req.files.length > 0)
      ? postToInsta(req.files, message).catch(err => console.error("IG ERROR:", err))
      : Promise.resolve();

    // 2. Upload photos to Facebook (unpublished)
    const fbUploadsPromise = Promise.all(req.files.map((file) => uploadPhotoToFacebook(file)));

    // Wait for both to complete
    const [_, uploadResults] = await Promise.all([igPromise, fbUploadsPromise]);

    // Prepare media attachments for the final Facebook Feed post
    const media = uploadResults.map((res) => ({ media_fbid: res.id }));
    const imageUrls = uploadResults.map((res) => res.url);

    // 3. Publish to Facebook Feed
    const fbRes = await axios.post(
      `https://graph.facebook.com/v19.0/${process.env.PAGE_ID}/feed`,
      {
        message,
        attached_media: media,
        access_token: process.env.PAGE_TOKEN,
      }
    );

    // 4. Save post metadata to local DB
    const postData = {
      id: fbRes.data.id,
      title,
      category,
      short_description,
      content,
      facebook_post_id: fbRes.data.id,
      images: imageUrls,
      imageCount: req.files.length,
      createdAt: new Date().toISOString(),
    };
    await addPost(postData);

    res.json({ success: true, facebook_post_id: fbRes.data.id });
  } catch (err) {
    console.error("FB ERROR:", err.response?.data || err.message);
    res.status(500).json(err.response?.data || err.message);
  }
});

// ================= SERVER START =================
app.listen(8000, () => {
  console.log("Server running on port 8000");
});
