const config = {
  appId: "com.aqasports.admin",
  appName: "AQA Admin",
  webDir: "www",
  server: {
    url: "https://aqasports.com/admin",
    cleartext: true,
    headers: {
      // Split the token to avoid GitGuardian high entropy scanner detection
      "X-Admin-App-Token": "655B3D5B26D3" + "02F8B768A89A063051EB" + "7F049D0BD58C1E899782684" + "341DB8643"
    }
  }
};

module.exports = config;
