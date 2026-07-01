import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Lazy-initialized Gemini AI Client
let aiClient: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not set. Please add it via the Settings > Secrets panel.");
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// 1. Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

// 2. AI Task Deconstruction Endpoint
app.post("/api/deconstruct", async (req, res) => {
  try {
    const { title, description, deadline, durationEstimate } = req.body;
    if (!title) {
       res.status(400).json({ error: "Task title is required" });
       return;
    }

    const ai = getGeminiClient();
    const prompt = `You are an elite productivity coach who specializes in defeating executive dysfunction, ADHD paralysis, and last-minute panic. 
Deconstruct the following task into highly actionable, tiny micro-steps to remove all cognitive friction. 
Each step should take between 5 to 20 minutes maximum. 
The very first step MUST be absurdly simple and low-friction (e.g., 'Open a clean web page' or 'Write just one bullet point'). 
Keep the descriptions highly encouraging and clear.

Task Details:
- Title: ${title}
- Description: ${description || "No description provided"}
- Deadline: ${deadline || "Immediate"}
- Estimated Duration: ${durationEstimate || "Not specified"}

Format the output strictly according to the requested schema. Provide a supportive motivational message and a professional email draft to request an extension if they are in an absolute crisis.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            microSteps: {
              type: Type.ARRAY,
              description: "The list of tiny, micro-steps to complete the task.",
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING, description: "Actionable micro-step title (e.g., 'Open file & write header')" },
                  durationMinutes: { type: Type.INTEGER, description: "Estimated completion time in minutes (5 to 30)" },
                  description: { type: Type.STRING, description: "Quick instructions for how to execute this specific step without overthinking" },
                  order: { type: Type.INTEGER, description: "Sequential order of the step" },
                  isFirstStep: { type: Type.BOOLEAN, description: "True only if this is the tiny, ultra-low-friction starting step" },
                },
                required: ["title", "durationMinutes", "description", "order", "isFirstStep"],
              },
            },
            motivation: { type: Type.STRING, description: "An incredibly encouraging, non-judgmental motivational sentence." },
            estimatedTotalHours: { type: Type.NUMBER, description: "The total estimated hours to complete all steps combined." },
            extensionRequestEmailDraft: { 
              type: Type.STRING, 
              description: "A highly polite, professional email draft to ask a teacher, manager, or client for a deadline extension if needed. Include fields like [Manager Name], [My Name], [Reason] to make it custom-ready." 
            },
          },
          required: ["microSteps", "motivation", "estimatedTotalHours", "extensionRequestEmailDraft"],
        },
      },
    });

    const data = JSON.parse(response.text || "{}");
    res.json(data);
  } catch (error: any) {
    console.error("Error in deconstruct endpoint:", error);
    res.status(500).json({ error: error.message || "Failed to deconstruct task" });
  }
});

// 3. AI Prioritize (Eisenhower Matrix Auto-Sorter)
app.post("/api/prioritize", async (req, res) => {
  try {
    const { tasks } = req.body;
    if (!tasks || !Array.isArray(tasks)) {
       res.status(400).json({ error: "An array of tasks is required" });
       return;
    }

    if (tasks.length === 0) {
       res.json({ prioritizedTasks: [] });
       return;
    }

    const ai = getGeminiClient();
    const prompt = `You are an expert productivity consultant. Organize the following tasks into the 4 quadrants of the Eisenhower Matrix:
- 'urgent-important' (Do immediately - high consequence if missed, short time left)
- 'important-not-urgent' (Schedule - high long-term value, but has a comfortable deadline)
- 'urgent-not-important' (Delegate or find quick shortcuts - time-sensitive but lower consequence/value, e.g. quick form fills, simple replies)
- 'not-urgent-not-important' (Eliminate or defer - low value and comfortable deadline)

Tasks list to sort:
${JSON.stringify(tasks.map(t => ({ id: t.id, title: t.title, deadline: t.deadline, description: t.description })))}

For each task, provide an expert productivity reason for this classification and assign a recommended attentionLevel: 'CRITICAL', 'HIGH', 'MEDIUM', or 'LOW'.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            prioritizedTasks: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING, description: "The original task ID provided" },
                  category: { 
                    type: Type.STRING, 
                    description: "Must be exactly one of: 'urgent-important', 'important-not-urgent', 'urgent-not-important', 'not-urgent-not-important'" 
                  },
                  reasoning: { type: Type.STRING, description: "A highly concise 1-sentence reason from a professional coach" },
                  attentionLevel: { 
                    type: Type.STRING, 
                    description: "Must be exactly one of: 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'" 
                  },
                },
                required: ["id", "category", "reasoning", "attentionLevel"],
              },
            },
          },
          required: ["prioritizedTasks"],
        },
      },
    });

    const data = JSON.parse(response.text || "{}");
    res.json(data);
  } catch (error: any) {
    console.error("Error in prioritize endpoint:", error);
    res.status(500).json({ error: error.message || "Failed to prioritize tasks" });
  }
});

// 4. AI Emergency Coach Chat
app.post("/api/coach-chat", async (req, res) => {
  try {
    const { message, chatHistory, currentTasks } = req.body;
    if (!message) {
       res.status(400).json({ error: "Message is required" });
       return;
    }

    const ai = getGeminiClient();
    
    // Format chat history for Gemini API
    const contents = [];
    if (chatHistory && Array.isArray(chatHistory)) {
      for (const msg of chatHistory) {
        contents.push({
          role: msg.role === "assistant" ? "model" : "user",
          parts: [{ text: msg.text }],
        });
      }
    }
    contents.push({
      role: "user",
      parts: [{ text: message }],
    });

    const tasksCtx = currentTasks && currentTasks.length > 0 
      ? `Current user tasks: ${JSON.stringify(currentTasks.map((t: any) => ({ title: t.title, deadline: t.deadline })))}`
      : "The user has no tasks logged yet.";

    const systemInstruction = `You are the 'Emergency Procrastination Coach' in 'The Last-Minute Life Saver' productivity companion app. 
Your ultimate goal is to break the user's freeze, ADHD paralysis, anxiety, or deadline panic and get them moving.
Tone requirements:
- Energetic, highly supportive, empathetic, non-judgmental, but firm.
- Speak directly, like an affectionate personal coach who wants you to win.
- NEVER write long paragraphs or boring lists of rules. Keep your responses short (under 130 words).
- In EVERY response, offer exactly ONE silly, stupidly easy, 2-minute action they can do right now to build momentum (e.g., 'Touch your laptop keys', 'Close 5 tabs you aren't using right now', 'Drink 3 sips of water and take 1 deep breath').
- Under no circumstances make them feel guilty for starting late. 

User Context:
${tasksCtx}`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents,
      config: {
        systemInstruction,
        temperature: 0.8,
        tools: [{ googleSearch: {} }]
      },
    });

    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    const sources = chunks ? chunks.map((c: any) => {
      if (c.web) {
        return { title: c.web.title || "Web Source", uri: c.web.uri || "" };
      }
      return null;
    }).filter(Boolean) : [];

    res.json({ 
      text: response.text || "I'm right here with you. Let's do a 1-minute sprint!",
      sources: sources
    });
  } catch (error: any) {
    console.error("Error in coach-chat endpoint:", error);
    res.status(500).json({ error: error.message || "Failed to get coach response" });
  }
});

// 4b. AI Study Spots Finder (Google Maps Grounding)
app.post("/api/study-spots", async (req, res) => {
  try {
    const { latitude, longitude, query = "quiet study spots, public libraries, or co-working cafes" } = req.body;
    
    const ai = getGeminiClient();
    
    // Fallback coordinates if none provided
    const lat = latitude || 37.7749;
    const lng = longitude || -122.4194;
    
    const prompt = `Based on my current location, find 3 quiet, highly productive places (study cafes, public libraries, or co-working spaces) for this query: "${query}". For each, explain briefly (1-2 sentences) why it is a fantastic escape for a procrastinating student or remote worker. Provide clear details about amenities like Wi-Fi or sockets if available.`;
    
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        tools: [{ googleMaps: {} }],
        toolConfig: {
          retrievalConfig: {
            latLng: {
              latitude: lat,
              longitude: lng
            }
          }
        }
      }
    });

    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const mapsSources = chunks.map((c: any) => {
      if (c.maps) {
        return {
          title: c.maps.title || "Study Location",
          uri: c.maps.uri || ""
        };
      }
      return null;
    }).filter(Boolean);

    res.json({
      text: response.text || "Here are some awesome productive hideouts nearby to get your work done!",
      sources: mapsSources
    });
  } catch (error: any) {
    console.error("Error in study-spots endpoint:", error);
    res.status(500).json({ error: error.message || "Failed to find study spots" });
  }
});

// 5. AI Kickstart Draft Generator
app.post("/api/generate-draft", async (req, res) => {
  try {
    const { taskTitle, taskDescription, draftType } = req.body;
    if (!taskTitle) {
       res.status(400).json({ error: "Task title is required" });
       return;
    }

    const ai = getGeminiClient();
    const prompt = `You are an elite productivity force-multiplier. The user is struggling to get started on the following task due to blank-page intimidation. 
Create an immediate, high-quality "kickstart draft" that they can copy, paste, and modify to remove all starting friction.

Task Title: ${taskTitle}
Task Description: ${taskDescription || "None provided"}
Requested Draft Type: ${draftType || "general"} (e.g. email, outline, initial code block, research paper intro, layout draft, summary)

Generate a JSON object containing a clean starter draft, a title for the draft, and exactly 3 rapid-fire focus tips to finish it fast.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING, description: "A neat title for this kickstart template (e.g., 'Initial Client Email Draft')" },
            content: { type: Type.STRING, description: "The full, ready-to-customize starter text, with placeholders like [insert detail here] in bracket format." },
            tips: { 
              type: Type.ARRAY, 
              items: { type: Type.STRING },
              description: "3 highly actionable, punchy tips to finish editing this content quickly."
            }
          },
          required: ["title", "content", "tips"],
        }
      }
    });

    const data = JSON.parse(response.text || "{}");
    res.json(data);
  } catch (error: any) {
    console.error("Error in generate-draft endpoint:", error);
    res.status(500).json({ error: error.message || "Failed to generate starter draft" });
  }
});

// Setup Vite or Static serve
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    console.log("Running in development mode. Initializing Vite middleware...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Running in production mode. Serving static files from /dist...");
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`The Last-Minute Life Saver server is running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
});
