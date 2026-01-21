const { IgApiClient } = require("instagram-private-api");
require("dotenv").config();

const ig = new IgApiClient();

async function login() {
  ig.state.generateDevice(process.env.IG_USERNAME);
  await ig.account.login(process.env.IG_USERNAME, process.env.IG_PASSWORD);
}

async function getProfile() {
  await login();
  return await ig.account.currentUser();
}

async function postToInsta(images, caption) {
  await login();

  if (images.length === 1) {
    const imageBuffer = images[0].buffer;
    await ig.publish.photo({
      file: imageBuffer,
      caption: caption,
    });
  } else {
    const items = await Promise.all(
      images.map(async (image) => {
        return {
          file: image.buffer,
        };
      })
    );

    await ig.publish.album({
      items: items,
      caption: caption,
    });
  }
}

module.exports = { postToInsta, getProfile };
