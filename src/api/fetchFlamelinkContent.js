// src/api/fetchFlamelinkContent.js
import flamelinkApp from './flamelinkClient';

export async function fetchFlamelinkContent(schemaKey, options = {}) {
  try {
    // Ask Flamelink for everything in a schema
    const data = await flamelinkApp.content.get(schemaKey, {
      populate: true, // pull in referenced assets if needed
      ...options,
    });

    if (!data) return null;

    // If you specify a UID, return that content; otherwise return the first entry
    if (options.uid) return data[options.uid];
    const firstId = Object.keys(data)[0];
    return firstId ? data[firstId] : null;
  } catch (err) {
    console.error(`Could not fetch Flamelink content for ${schemaKey}:`, err);
    return null;
  }
}
