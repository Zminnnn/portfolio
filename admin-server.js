const express = require("express");
const multer = require("multer");
const AdmZip = require("adm-zip");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = 3000;

// Paths
const PUBLIC_DIR = path.join(__dirname, "public");
const DATA_DIR = path.join(__dirname, "data");
const WORKS_JSON = path.join(DATA_DIR, "works.json");
const ASSETS_DIR = path.join(__dirname, "assets");
const GAMES_DIR = path.join(ASSETS_DIR, "games");
const VIDEOS_DIR = path.join(ASSETS_DIR, "videos");
const THUMBS_DIR = path.join(ASSETS_DIR, "thumbnails");
const MODELS_DIR = path.join(ASSETS_DIR, "models");
const UPLOADS_DIR = path.join(__dirname, "_uploads");

// Ensure directories exist
[DATA_DIR, GAMES_DIR, VIDEOS_DIR, THUMBS_DIR, MODELS_DIR, UPLOADS_DIR].forEach((d) => {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
});

// Multer setup for file uploads (use temp then move)
const upload = multer({ dest: path.join(__dirname, "_uploads") });

// Helper: read works.json
function readWorksJSON() {
  try {
    return JSON.parse(fs.readFileSync(WORKS_JSON, "utf-8"));
  } catch {
    return { categories: [] };
  }
}

// Helper: write works.json
function writeWorksJSON(data) {
  fs.writeFileSync(WORKS_JSON, JSON.stringify(data, null, 2), "utf-8");
}

// Helper: slugify for safe filenames
function slugify(text) {
  // Use random hex ID to avoid encoding issues with non-ASCII chars
  const buf = require("crypto").randomBytes(4);
  return buf.toString("hex");
}

// Logging middleware
app.use((req, res, next) => {
  console.log(req.method, req.url);
  next();
});


// Brotli compression support for .br files (Unity WebGL)
app.use((req, res, next) => {
  if (req.path.endsWith(".br")) {
    res.setHeader("Content-Encoding", "br");
    const path = req.path;
    if (path.includes("framework")) {
      res.setHeader("Content-Type", "application/javascript");
    } else if (path.includes("wasm")) {
      res.setHeader("Content-Type", "application/wasm");
    } else if (path.includes("symbols")) {
      res.setHeader("Content-Type", "application/json");
    } else {
      res.setHeader("Content-Type", "application/octet-stream");
    }
  }
  next();
});

 // Serve static files
// Serve root index.html explicitly (moved from public/ to root for GitHub Pages)
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});
app.use(express.static(PUBLIC_DIR));
app.use('/data', express.static(DATA_DIR));
app.use('/assets', express.static(ASSETS_DIR));

// Redirect /admin -> /admin.html
app.get("/admin", (req, res) => {
  res.redirect("/admin.html");
});

// GET /api/works
app.get("/api/works", (req, res) => {
  res.json(readWorksJSON());
});

// POST /api/works - create or update a work with file uploads
app.post("/api/works", upload.fields([
  { name: "thumbnail", maxCount: 1 },
  { name: "webBuild", maxCount: 1 },
  { name: "video", maxCount: 1 },
  { name: "modelingImages", maxCount: 20 },
  { name: "fbx", maxCount: 1 },
]), async (req, res) => {
  try {
    const workData = JSON.parse(req.body.work);
    const categoryId = req.body.categoryId || "games";
    const data = readWorksJSON();

    let category = data.categories.find((c) => c.id === categoryId);
    if (!category) {
      return res.status(400).send("Category not found");
    }

    const isNew = !category.works.find((w) => w.id === workData.id);
    const safeSlug = slugify(workData.title);

    // Handle thumbnail upload
    if (req.files["thumbnail"]) {
      const file = req.files["thumbnail"][0];
      const ext = path.extname(file.originalname) || ".jpg";
      const thumbName = safeSlug + ext;
      const thumbPath = path.join(THUMBS_DIR, thumbName);
      fs.copyFileSync(file.path, thumbPath);
      fs.unlinkSync(file.path);
      workData.thumbnail = "assets/thumbnails/" + thumbName;
    } else if (isNew) {
      // For existing works, keep the old thumbnail if not replaced
    }

    // Handle web build upload (ZIP extraction)
    if (req.files["webBuild"]) {
      const file = req.files["webBuild"][0];
      const gameDir = path.join(GAMES_DIR, safeSlug);
      if (fs.existsSync(gameDir)) {
        fs.rmSync(gameDir, { recursive: true });
      }
      fs.mkdirSync(gameDir, { recursive: true });

      // Extract zip
      const zip = new AdmZip(file.path);
      zip.extractAllTo(gameDir, true);
      fs.unlinkSync(file.path);

      // Find the main index.html (search recursively)
      function findIndex(dir) {
        const files = fs.readdirSync(dir);
        for (const f of files) {
          const full = path.join(dir, f);
          if (f === "index.html") return full;
          if (fs.statSync(full).isDirectory()) {
            const found = findIndex(full);
            if (found) return found;
          }
        }
        return null;
      }

      const indexPath = findIndex(gameDir);
      if (indexPath) {
        const relPath = path.relative(gameDir, indexPath);
        workData.webBuildPath = "assets/games/" + safeSlug + "/" + relPath.replace(/\\/g, "/");
      } else {
        workData.webBuildPath = "assets/games/" + safeSlug + "/index.html";
      }
    }

    // Handle video upload
    if (req.files["video"]) {
      const file = req.files["video"][0];
      const ext = path.extname(file.originalname) || ".mp4";
      const videoName = safeSlug + ext;
      const videoPath = path.join(VIDEOS_DIR, videoName);
      if (fs.existsSync(videoPath)) fs.unlinkSync(videoPath);
      fs.copyFileSync(file.path, videoPath);
      fs.unlinkSync(file.path);
      workData.videoPath = "assets/videos/" + videoName;
    }

    // Handle FBX file upload
    if (req.files["fbx"]) {
      const file = req.files["fbx"][0];
      const modelDir = path.join(MODELS_DIR, safeSlug);
      if (!fs.existsSync(modelDir)) fs.mkdirSync(modelDir, { recursive: true });
      const ext = path.extname(file.originalname) || ".fbx";
      const fbxName = safeSlug + ext;
      const fbxPath = path.join(modelDir, fbxName);
      if (fs.existsSync(fbxPath)) fs.unlinkSync(fbxPath);
      fs.copyFileSync(file.path, fbxPath);
      fs.unlinkSync(file.path);
      workData.fbxPath = "assets/models/" + safeSlug + "/" + fbxName;
    }

    // Handle modeling images
    if (req.files["modelingImages"]) {
      const images = [];
      req.files["modelingImages"].forEach((file, index) => {
        const ext = path.extname(file.originalname) || ".jpg";
        const imgName = safeSlug + "-" + index + ext;
        const imgPath = path.join(THUMBS_DIR, imgName);
        fs.copyFileSync(file.path, imgPath);
        fs.unlinkSync(file.path);
        images.push("assets/thumbnails/" + imgName);
      });
      workData.images = images;
      // Set first image as thumbnail if no specific thumbnail was uploaded
      if (!workData.thumbnail && images.length > 0) {
        workData.thumbnail = images[0];
      }
    }

    // Save or update in works.json
    if (isNew) {
      category.works.push(workData);
    } else {
      const idx = category.works.findIndex((w) => w.id === workData.id);
      if (idx !== -1) {
        // Preserve existing file paths if not replaced
        const existing = category.works[idx];
        if (!workData.thumbnail) workData.thumbnail = existing.thumbnail;
        if (!workData.webBuildPath) workData.webBuildPath = existing.webBuildPath;
        if (!workData.videoPath) workData.videoPath = existing.videoPath;
        if (!workData.images) workData.images = existing.images;
        category.works[idx] = workData;
      } else {
        category.works.push(workData);
      }
    }

    writeWorksJSON(data);

    // If the category changed, move the work
    const origCatId = req.body.originalCategoryId;
    if (origCatId && origCatId !== categoryId) {
      const origCat = data.categories.find((c) => c.id === origCatId);
      if (origCat) {
        origCat.works = origCat.works.filter((w) => w.id !== workData.id);
        writeWorksJSON(data);
      }
    }

    res.json({ success: true, work: workData });
  } catch (e) {
    console.error("Save error:", e);
    res.status(500).send(e.message);
  }
});

// DELETE /api/works/:categoryId/:workId
app.delete("/api/works/:categoryId/:workId", (req, res) => {
  try {
    const { categoryId, workId } = req.params;
    const data = readWorksJSON();
    const category = data.categories.find((c) => c.id === categoryId);
    if (!category) return res.status(404).send("Category not found");

    const workIdx = category.works.findIndex((w) => w.id === workId);
    if (workIdx === -1) return res.status(404).send("Work not found");

    category.works.splice(workIdx, 1);
    writeWorksJSON(data);
    res.json({ success: true });
  } catch (e) {
    res.status(500).send(e.message);
  }
});



// PATCH /api/works/reorder - reorder works in a category
app.patch("/api/works/reorder", express.json(), (req, res) => {
  try {
    const { categoryId, workIds } = req.body;
    const data = readWorksJSON();
    const category = data.categories.find(c => c.id === categoryId);
    if (!category) return res.status(404).send("Category not found");
    const reordered = workIds.map(id => category.works.find(w => w.id === id)).filter(Boolean);
    category.works = reordered;
    writeWorksJSON(data);
    res.json({ success: true });
  } catch (e) {
    res.status(500).send(e.message);
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log("> 管理后台已启动：http://localhost:" + PORT);
  console.log("> 访客页面：http://localhost:" + PORT + "/");
  console.log("> 管理页面：http://localhost:" + PORT + "/admin");
});



