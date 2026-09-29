const axios = require("axios");

function extractVideoId(url) {
  const regex =
    /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i;
  const match = url.match(regex);
  return match ? match[1] : null;
}

const youtube = {
  async ytmp3(url, format = "mp3") {
    try {
      const videoId = extractVideoId(url);
      if (!videoId) throw new Error("Invalid YouTube URL");

      const targetUrl = `https://api.vkrdev.eu.org/api/v2/yt${format === "mp3" ? "mp3" : "mp4"}?url=https://www.youtube.com/watch?v=${videoId}`;
      
      const response = await axios.get(targetUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
        },
        timeout: 15000
      });

      const data = response.data;
      if (!data || (!data.downloadUrl && !data.link && !data.url)) {
        throw new Error("Failed to retrieve download link from server.");
      }

      const finalDownloadURL = data.downloadUrl || data.link || data.url;

      return {
        status: true,
        result: {
          title: data.title || "YouTube Video",
          downloads: [
            {
              type: format === "mp3" ? "audio" : "video",
              quality: format === "mp3" ? "320kbps" : "720p",
              url: finalDownloadURL
            }
          ]
        },
      };
    } catch (error) {
      return {
        status: false,
        message: error.message,
      };
    }
  }
};

const tiktok = {
  async scrape(url) {
    try {
      const res = await axios.get(`https://www.tikwm.com/api/?url=${encodeURIComponent(url)}`);
      const json = res.data;
      return { status: true, result: { title: json.data?.title || "TikTok", downloads: [{ type: "video", url: json.data?.play }] } };
    } catch (e) {
      return { status: false, message: e.message };
    }
  }
};

const instagram = async (url) => {
  return { status: true, result: null };
};

const facebook = async (url) => {
  return { status: true, result: { url: "" } };
};

const pinterest = async (url) => {
  return { status: true, result: { url: "" } };
};

module.exports = {
  youtube,
  tiktok,
  instagram,
  facebook,
  pinterest,
  extractVideoId
};
