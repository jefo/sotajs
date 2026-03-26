/**
 * Demo Cloud Function: Hello World
 * 
 * This function returns a greeting message with timestamp.
 */
export const handler = async (event: any) => {
  console.log("Request received at:", new Date().toISOString());
  console.log("Event:", JSON.stringify(event, null, 2));
  
  return {
    statusCode: 200,
    headers: { 
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*"
    },
    body: JSON.stringify({
      message: "Hello from SotaJS Cloud Functions! 🚀",
      timestamp: new Date().toISOString(),
      status: "LIVE",
      managedBy: "SotaJS",
      runtime: "Node.js 18"
    })
  };
};
