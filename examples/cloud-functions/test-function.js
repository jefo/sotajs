/**
 * Test Hello World Function
 * 
 * Build: bun build examples/cloud-functions/test-function.js --target node --outfile dist/test.js
 * Deploy: bun run examples/cloud-functions/sota-deploy.ts dist/test.js --name=test-hello --folder=$YC_FOLDER_ID --token=$YC_OAUTH_TOKEN
 */

export const handler = async (event) => {
  console.log("Request received at:", new Date().toISOString());
  
  return {
    statusCode: 200,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*"
    },
    body: JSON.stringify({
      message: "Hello from SotaJS! 🚀",
      timestamp: new Date().toISOString(),
      status: "LIVE"
    })
  };
};
