const config = {
  appId: "com.aqasports.admin",
  appName: "AQA Admin",
  webDir: "www",
  server: {
    url: "https://aqasports.com/admin",
    cleartext: false,
    ...(process.env.AQA_ADMIN_APP_TOKEN
      ? {
          headers: {
            "X-Admin-App-Token": process.env.AQA_ADMIN_APP_TOKEN,
          },
        }
      : {}),
  },
};

module.exports = config;
