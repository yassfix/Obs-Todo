/**
 * Import function triggers from their respective submodules:
 *
 * const {onCall} = require("firebase-functions/v2/https");
 * const {onDocumentWritten} = require("firebase-functions/v2/firestore");
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

// V2 Imports for Firebase Functions
const {setGlobalOptions} = require("firebase-functions/v2");
const {onCall, HttpsError} = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");
const {defineString} = require("firebase-functions/params");

// V2 Import for Google AI
const {GoogleGenerativeAI} = require("@google/generative-ai");

// --- V2 Global Options (from your original file) ---
// This sets the max instances for all functions in this file
setGlobalOptions({maxInstances: 10});

// --- V2 Environment Variable Setup ---
// Define the environment variable for your API key.
// We will set this value in the next step.
const geminiApiKey = defineString("GEMINI_API_KEY");

// --- V2 Cloud Function ---
// This is the function your index.html will call
exports.generateInsights = onCall(async (request) => {
  // 1. Initialize Gemini AI *inside* the handler
  // This allows it to access the geminiApiKey.value()
  const genAI = new GoogleGenerativeAI(geminiApiKey.value());
  const model = genAI.getGenerativeModel({model: "gemini-2.0-flash"});

  // 2. Check authentication (V2 style)
  // The 'auth' object is part of the 'request' object
  if (!request.auth) {
    throw new HttpsError(
        "unauthenticated",
        "You must be logged in to request insights.",
    );
  }

  // 3. Get data from the request (V2 style)
  // The 'data' object is part of the 'request' object
  const data = request.data;

  const userDataJson = JSON.stringify(data, null, 2);

  // 4. Create a clean, text-based prompt for the AI
  const prompt = [
    "You are an expert productivity coach ",
    "and data analyst. A user from a ",
    "to-do list app ('Obs Todo') has ",
    "requested insights based on their ",
    "task history.",
    "\n",
    "Analyze the following JSON data, ",
    "which contains an array of their ",
    "completed tasks (allCompletedTasks) ",
    "and their summary ",
    "statistics ",
    "(stats).",
    "\nJSON",
    "\n",
    userDataJson,
    "\nBased only on the data provided, ",
    "generate a concise, encouraging, and ",
    "actionable report (under 200 ",
    "words).\n",
    "Your report ",
    "must:\n",
    "* Go beyond the stats: Do not just ",
    "repeat the 'total hours' or ",
    "'current streak.' Find ",
    "patterns.\n",
    "* Identify Productivity Patterns: ",
    "When is this user most productive? ",
    "(e.g., \"I notice you're a weekend ",
    "warrior, completing most of ",
    "your 'Work' tasks on ",
    "Saturdays.\")\n",
    "* Analyze Task Focus: Which keywords ",
    "or task types get the most time? ",
    "(e.g., \"A significant amount of ",
    "your time is spent on 'Personal' ",
    "projects, which is great for ",
    "work-life balance.\")\n",
    "* Find 1-2 Key Strengths: (e.g., ",
    "\"Your consistency is impressive, ",
    "with a solid ",
    "streak.\")\n",
    "* Find 1-2 Areas for Improvement: ",
    "(e.g., \"It seems many tasks are ",
    "completed late at night. If you're ",
    "feeling burned out, consider...\").\n",
    "* Give One Actionable Tip: (e.g., ",
    "\"Try time-blocking one 'Urgent' ",
    "task first thing in the morning, ",
    "as your most productive hours ",
    "seem to be before ",
    "noon.\")\n",
    "\nFormat the response using simple ",
    "markdown (bolding, bullets, ",
    "and newlines). Be encouraging and ",
    "start by addressing the user directly.",
  ].join("");
  // 5. Call the Gemini API and get the response
  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const insightsText = response.text();

    // 6. Send the text response back to your index.html
    return {insights: insightsText};
  } catch (error) {
    logger.error("Error calling Gemini API:", error); // Use the V2 logger
    throw new HttpsError("internal", "Error generating insights.");
  }
});
