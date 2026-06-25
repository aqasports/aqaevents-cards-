// A Netlify Serverless Function configured to run on a daily schedule.
// It pings the Next.js /api/health endpoint which executes a Prisma query on Supabase,
// preventing the Supabase free-tier database from pausing due to inactivity.

exports.handler = async function(event, context) {
  try {
    // Netlify provides the site's primary URL in the process.env.URL environment variable
    const siteUrl = process.env.URL || "https://aqasports.com";
    const healthUrl = `${siteUrl.replace(/\/$/, "")}/api/health`;

    console.log(`[Keep-Alive] Triggering health check at: ${healthUrl}`);
    
    const response = await fetch(healthUrl);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log("[Keep-Alive] Database ping successful:", data);

    return {
      statusCode: 200,
      body: JSON.stringify({ message: "Keep-alive ping successful", details: data }),
    };
  } catch (error) {
    console.error("[Keep-Alive] Failed to ping database:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
