chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === "save_password_encrypted") {
    chrome.storage.local.get("token", ({ token }) => {
      if (!token) return;
      fetch("http://localhost:5000/storage", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          site: msg.site,
          encrypted_data: msg.encrypted_data,
          iv: msg.iv
        })
      });
    });
  }
});