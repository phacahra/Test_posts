const fs = require("fs/promises");
const path = require("path");

const dbPath = path.join(__dirname, "posts.json");

async function readDb() {
  try {
    const data = await fs.readFile(dbPath, "utf-8");
    return JSON.parse(data);
  } catch (error) {
    // If file doesn't exist or is empty, return empty array
    if (error.code === "ENOENT" || error.message.includes("Unexpected end of JSON input")) {
      return [];
    }
    throw error;
  }
}

async function writeDb(data) {
  await fs.writeFile(dbPath, JSON.stringify(data, null, 2), "utf-8");
}

async function addPost(post) {
  const posts = await readDb();
  posts.unshift(post); // Add to the beginning of the array
  await writeDb(posts);
  return post;
}

module.exports = {
  readDb,
  addPost,
};