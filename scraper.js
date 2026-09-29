const axios = require("axios");

// ==================== HELPER: HEADERS & SANITIZER ====================
function getUserAgent() {
  const userAgents = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2.1 Safari/605.1.15",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36"
  ];
  return userAgents[Math.floor(Math.random() * userAgents.length)];
}

function buildDownloadHeaders(actualDownloadUrl, sourceUrl, url) {
  const isYtmp3GG = actualDownloadUrl.includes("ytmp3.gg") || actualDownloadUrl.includes("convert1s.com");
  const downloadHeaders = { "User-Agent": getUserAgent() };

  if (isYtmp3GG) {
    downloadHeaders["Referer"] = "https://media.ytmp3.gg/";
    downloadHeaders["Origin"] = "https://media.ytmp3.gg";
  }
  return downloadHeaders;
}

// ==================== YOUTUBE SCRAPER (Using convert1s engine) ====================
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

      const ytUrl = `https://www.youtube.com/watch?v=${videoId}`;
      const headers = buildDownloadHeaders("https://hub.convert1s.com/api/download", ytUrl, ytUrl);

      // 1. Inisialisasi konversi via convert1s API
      let conv = null;
      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          const res = await axios.post("https://hub.convert1s.com/api/download", {
            url: ytUrl,
            os: "macos",
            output: {
              type: format === "mp4" ? "video" : "audio",
              format: format === "mp3" ? "mp3" : "mp4",
              quality: "128"
            },
            audio: { bitrate: "128k" }
          }, { headers, timeout: 15000 });

          if (res.data && res.data.statusUrl) {
            conv = res.data;
            break;
          }
        } catch (e) {
          if (attempt === 2) throw new Error("Gagal terhubung ke server konversi YouTube.");
        }
      }

      if (!conv || !conv.statusUrl) {
        throw new Error("Gagal memulai proses konversi YouTube.");
      }

      // 2. Polling status konversi sampai beres
      let downloadUrl = null;
      let pollCount = 0;
      const maxPolls = 30;

      while (!downloadUrl && pollCount < maxPolls) {
        await new Promise(r => setTimeout(r, 2000));
        try {
          const pollRes = await axios.get(conv.statusUrl, { headers, timeout: 10000 });
          const poll = pollRes.data;

          if (poll && poll.status === "completed" && poll.downloadUrl) {
            downloadUrl = poll.downloadUrl;
            break;
          }
          if (poll && (poll.status === "error" || poll.status === "failed")) {
            break;
          }
        } catch (err) {
          // Lanjutkan polling jika timeout sementara
        }
        pollCount++;
      }

      if (!downloadUrl) {
        throw new Error("Waktu konversi habis (Timeout). Coba lagi.");
      }

      return {
        status: true,
        result: {
          title: "YouTube Audio",
          downloads: [{ type: format === "mp3" ? "audio" : "video", quality: "128kbps", url: downloadUrl }]
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
      const res = await axios.get(`https://www.tikwm.com/api/?url=${encodeURIComponent(url)}`, {
        headers: { "User-Agent": getUserAgent() }
      });
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
    const res = await axios.get(`https://api.siputzx.my.id/api/d/igdl?url=${encodeURIComponent(url)}`, { timeout: 20000 });
    const json = res.data;
    if (!json || !json.status || !json.data?.[0]?.url) throw new Error("Gagal mengambil media Instagram.");
    return { status: true, result: json.data[0].url };
  } catch (error) {
    return { status: false, message: error.message };
  }
};

// ==================== FACEBOOK SCRAPER ====================
const facebook = async (url) => {
  try {
    const res = await axios.get(`https://api.siputzx.my.id/api/d/fbdl?url=${encodeURIComponent(url)}`, { timeout: 20000 });
    const json = res.data;
    if (!json || !json.status || !json.data?.[0]?.url) throw new Error("Gagal mengunduh video Facebook.");
    return { status: true, result: { url: json.data[0].url } };
  } catch (error) {
    return { status: false, message: error.message };
  }
};

// ==================== PINTEREST SCRAPER ====================
const pinterest = async (url) => {
  try {
    const res = await axios.get(`https://api.siputzx.my.id/api/d/pinterest?url=${encodeURIComponent(url)}`, { timeout: 20000 });
    const json = res.data;
    const mediaUrl = json?.data?.dl || json?.data?.url || json?.url;
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
  pinterest,
  extractVideoId,
  buildDownloadHeaders
};
