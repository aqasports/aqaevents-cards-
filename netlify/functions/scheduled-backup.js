// A Netlify Serverless Function configured to run on a daily schedule (02:00 UTC).
// It triggers the /api/admin/backup endpoint to create a Prisma-based JSON backup
// and upload it to the Supabase Storage bucket in the staging project.

exports.handler = async function(event, context) {
  try {
    const siteUrl = process.env.URL || "https://aqasports.com";
    const backupUrl = `${siteUrl.replace(/\/$/, "")}/api/admin/backup`;

    console.log(`[Scheduled-Backup] Triggering backup at: ${backupUrl}`);

    const headers = {};
    if (process.env.BACKUP_API_KEY) {
      headers["X-Backup-Key"] = process.env.BACKUP_API_KEY;
    }

    const response = await fetch(backupUrl, {
      method: "POST",
      headers,
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`HTTP ${response.status}: ${text}`);
    }

    const data = await response.json();
    console.log("[Scheduled-Backup] Backup completed:", JSON.stringify(data.metadata || data, null, 2));

    return {
      statusCode: 200,
      body: JSON.stringify({ message: "Scheduled backup successful", details: data.metadata || data }),
    };
  } catch (error) {
    console.error("[Scheduled-Backup] Backup failed:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
