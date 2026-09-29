const axios = require("axios");

// ==================== YOUTUBE SCRAPER ====================
function extractVideoId(url) {
  const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i;
  const match = url.match(regex);
  return match ? match[1] : null;
}

const youtube = {
  async ytmp3(url, format = "mp3") {
    try {
      const videoId = extractVideoId(url);
      if (!videoId) throw new Error("Invalid YouTube URL");
      const targetUrl = `https://api.vkrdev.eu.org/api/v2/yt${format === "mp3" ? "mp3" : "mp4"}?url=https://www.youtube.com/watch?v=${videoId}`;
      const response = await axios.get(targetUrl, { timeout: 15000 });
      const data = response.data;
      if (!data || (!data.downloadUrl && !data.link && !data.url)) throw new Error("Failed to retrieve download link.");
      const finalDownloadURL = data.downloadUrl || data.link || data.url;
      return {
        status: true,
        result: {
          title: data.title || "YouTube Video",
          downloads: [{ type: format === "mp3" ? "audio" : "video", url: finalDownloadURL }]
        }
      };
    } catch (error) {
      return { status: false, message: error.message };
    }
  }
};

// ==================== TIKTOK SCRAPER ====================
const tiktok = {
  async scrape(url) {
    try {
      const res = await axios.get(`https://www.tikwm.com/api/?url=${encodeURIComponent(url)}`);
      const json = res.data;
      if (!json || !json.data) throw new Error("Gagal mengambil data TikTok.");
      return {
        status: true,
        result: {
          title: json.data.title || "TikTok Video",
          downloads: json.data.play ? [{ type: "video", url: json.data.play }] : []
        }
      };
    } catch (error) {
      return { status: false, message: error.message };
    }
  }
};

// ==================== INSTAGRAM SCRAPER ====================
const instagram = async (url) => {
  try {
    const response = await axios.post("https://api.zoraahub.com/fetch.php", { url }, {
      headers: { "Content-Type": "application/json", "Origin": "https://downreels.com", "Referer": "https://downreels.com/" },
      timeout: 20000
    });
    const data = response.data;
    if (data.status !== "ok") throw new Error("Gagal mengambil media Instagram.");
    const mediaItems = data.videos || data.images || [];
    return { status: true, result: mediaItems[0]?.url || null };
  } catch (error) {
    return { status: false, message: error.message };
  }
};

// ==================== FACEBOOK SCRAPER ====================
const facebook = async (url) => {
  try {
    const response = await axios.post("https://api.zoraahub.com/fetch.php", { url }, {
      headers: { "Content-Type": "application/json", "Origin": "https://fdown.net", "Referer": "https://fdown.net/" },
      timeout: 20000
    });
    const data = response.data;
    const mediaUrl = data.videos?.[0]?.url || data.url || null;
    if (!mediaUrl) throw new Error("Gagal mengunduh video Facebook.");
    return { status: true, result: { url: mediaUrl } };
  } catch (error) {
    return { status: false, message: error.message };
  }
};

// ==================== PINTEREST SCRAPER ====================
const pinterest = async (url) => {
  try {
    const response = await axios.get(`https://api.vkrdev.eu.org/api/search/pinterest?url=${encodeURIComponent(url)}`, { timeout: 15000 });
    const data = response.data;
    const mediaUrl = data?.result || data?.url || null;
    if (!mediaUrl) throw new Error("Gagal mengunduh dari Pinterest.");
    return { status: true, result: { url: mediaUrl } };
  } catch (error) {
    return { status: false, message: error.message };
  }
};

module.exports = {
  youtube,
  tiktok,
  instagram,
  facebook,
  pinterest
};