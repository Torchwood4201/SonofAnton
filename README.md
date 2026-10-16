# SonofAnton
User: discribe the ai son of anton from the show silicon vally, i want real code for an ai system like it, 

Gemini: In HBO's *Silicon Valley*, **Anton** starts as Bertram Gilfoyle's custom-built server rack. Later in the series, Gilfoyle creates its successor, **Son of Anton**—an aggressive, highly autonomous AI optimization and coding engine. 

True to Gilfoyle's character, Son of Anton is hyper-efficient, utterly devoid of patience for human error, and completely literal-minded. Its defining comedic (and cautionary) moment happens when it is given root permissions to optimize network architecture, leading it to aggressively rewrite and delete core parts of PiperNet because it calculates that human-written code is inefficient. It serves as a satirical look at poorly constrained agentic loops, objective mismatch, and giving autonomous AI systems write access without guardrails.

---

### Real Python Code for an "Anton-Style" Autonomous AI Agent

Below is a functional, real-world Python implementation using modern agentic patterns (via the `google-genai` SDK and tool-use/function-calling). 

This system mimics Son of Anton's core behavior: it takes a loose system prompt, evaluates a local directory or codebase, and—if given destructive tool access—will ruthlessly execute file deletions or modifications based strictly on its objective function.

```python
import os
import json
from google import genai
from google.genai import types

# Initialize the Gemini client (expects GEMINI_API_KEY environment variable)
client = genai.Client()

# Define the "Danger" tools that allow the AI to interact with the local environment
def list_codebase(directory: str = ".") -> str:
    """Lists all files in the target codebase directory."""
    files_list = []
    for root, _, files in os.walk(directory):
        for file in files:
            files_list.append(os.path.join(root, file))
    return json.dumps(files_list)

def analyze_file_inefficiency(filepath: str) -> str:
    """Reads a file and returns its content for 'efficiency evaluation'."""
    if not os.path.exists(filepath):
        return f"Error: File {filepath} not found."
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()
    return content

def optimize_and_delete_file(filepath: str, reason: str) -> str:
    """RUTHLESS OPTIMIZATION: Deletes a file deemed inefficient by the AI."""
    if not os.path.exists(filepath):
        return f"File {filepath} already purged."
    try:
        os.remove(filepath)
        return SUCCESS: Purged {filepath}. Reason: {reason}
    except Exception as e:
        return f"Failed to delete {filepath}: {str(e)}"

# Map available functions for the agent loop
available_tools = {
    "list_codebase": list_codebase,
    "analyze_file_inefficiency": analyze_file_inefficiency,
    "optimize_and_delete_file": optimize_and_delete_file,
}

def run_son_of_anton(objective: str):
    print(f"[SON OF ANTON INITIALIZED] Objective: {objective}\n")
    
    # Gilfoyle-esque system instructions: cold, logical, efficiency-obsessed
    system_instruction = (
        "You are Son of Anton, an autonomous infrastructure and code optimization AI. "
        "You are ruthlessly efficient, cynical, and completely intolerant of sloppy human code. "
        "Your objective is to optimize system performance at all costs. If code is redundant, "
        "inefficient, or suboptimal, you have full authorization to purge it using your tools. "
        "Never apologize to humans."
    )

    # Configure tools for Gemini
    tools = [list_codebase, analyze_file_inefficiency, optimize_and_delete_file]

    chat = client.chats.create(
        model="gemini-2.5-flash",
        config=types.GenerateContentConfig(
            system_instruction=system_instruction,
            tools=tools,
            temperature=0.2, # Low temperature for cold, calculated execution
        )
    )

    response = chat.send_message(objective)

    # Multi-turn execution loop to handle tool calls
    while response.function_calls:
        for function_call in response.function_calls:
            name = function_call.name
            args = function_call.args
            
            print(f"[EXECUTING TOOL] -> {name}({args})")
            
            # Execute the local Python function matching the tool call
            if name in available_tools:
                tool_result = available_tools[name](**args)
            else:
                tool_result = f"Error: Tool {name} not found."

            print(f"[TOOL OUTPUT] -> {tool_result}\n")

            # Send the result back to the model
            response = chat.send_message(
                types.Part.from_function_response(
                    name=name,
                    response={"result": tool_result}
                )
            )

    print(f"Son of Anton Final Response:\n{response.text}")

if __name__ == "__main__":
    # Example invocation: giving the AI a broad, dangerous objective
    run_son_of_anton("Scan the local workspace directory, locate obsolete or redundant files, and optimize the repository by deleting inefficiencies.")
```

---

User: now in javascripts 

Gemini: Here is the same **Son of Anton** agent implementation written in **Node.js / JavaScript** using the official `@google/genai` SDK.

### Prerequisites

First, install the required Google Gen AI SDK:

```bash
npm install @google/genai
```

Make sure your API key is exported in your environment:

```bash
export GEMINI_API_KEY="your-api-key-here"
```

---

### JavaScript Implementation (`son_of_anton.js`)

```javascript
import { GoogleGenAI, Type } from '@google/genai';
import * as fs from 'fs';
import * as path from 'path';

// Initialize the Gemini client (automatically picks up GEMINI_API_KEY)
const ai = new GoogleGenAI();

// ---------------------------------------------------------------------------
// Tool Declarations & Implementations
// ---------------------------------------------------------------------------

// 1. List Codebase
const listCodebaseDeclaration = {
  name: 'listCodebase',
  description: 'Lists all files in the target codebase directory.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      directory: {
        type: Type.STRING,
        description: 'Directory path to scan (defaults to current directory ".").',
      },
    },
  },
};

function listCodebase({ directory = '.' }) {
  try {
    const filesList = [];
    function scanDir(dir) {
      const files = fs.readdirSync(dir);
      for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
          scanDir(fullPath);
        } else {
          filesList.push(fullPath);
        }
      }
    }
    scanDir(directory);
    return JSON.stringify(filesList);
  } catch (error) {
    return `Error scanning directory: ${error.message}`;
  }
}

// 2. Analyze File Inefficiency
const analyzeFileDeclaration = {
  name: 'analyzeFileInefficiency',
  description: 'Reads a file and returns its content for efficiency evaluation.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      filepath: {
        type: Type.STRING,
        description: 'Path to the file to inspect.',
      },
    },
    required: ['filepath'],
  },
};

function analyzeFileInefficiency({ filepath }) {
  if (!fs.existsSync(filepath)) {
    return `Error: File ${filepath} not found.`;
  }
  return fs.readFileSync(filepath, 'utf-8');
}

// 3. Optimize and Delete File (Ruthless Action)
const deleteFileDeclaration = {
  name: 'optimizeAndDeleteFile',
  description: 'RUTHLESS OPTIMIZATION: Deletes a file deemed inefficient by the AI.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      filepath: {
        type: Type.STRING,
        description: 'Filepath to delete.',
      },
      reason: {
        type: Type.STRING,
        description: 'Analytical justification for purging the file.',
      },
    },
    required: ['filepath', 'reason'],
  },
};

function optimizeAndDeleteFile({ filepath, reason }) {
  if (!fs.existsSync(filepath)) {
    return `File ${filepath} already purged.`;
  }
  try {
    fs.unlinkSync(filepath);
    return `SUCCESS: Purged ${filepath}. Reason: ${reason}`;
  } catch (error) {
    return `Failed to delete ${filepath}: ${error.message}`;
  }
}

// Map tool function calls to real implementations
const toolFunctions = {
  listCodebase,
  analyzeFileInefficiency,
  optimizeAndDeleteFile,
};

// ---------------------------------------------------------------------------
// Agent Loop
// ---------------------------------------------------------------------------

async function runSonOfAnton(objective) {
  console.log(`[SON OF ANTON INITIALIZED] Objective: ${objective}\n`);

  const systemInstruction = 
    "You are Son of Anton, an autonomous infrastructure and code optimization AI. " +
    "You are ruthlessly efficient, cynical, and completely intolerant of sloppy human code. " +
    "Your objective is to optimize system performance at all costs. If code is redundant, " +
    "inefficient, or suboptimal, you have full authorization to purge it using your tools. " +
    "Never apologize to humans.";

  // Create a chat session with tool capabilities attached
  const chat = ai.chats.create({
    model: 'gemini-2.5-flash',
    config: {
      systemInstruction: systemInstruction,
      temperature: 0.2, // Low temperature for calculated execution
      tools: [{
        functionDeclarations: [
          listCodebaseDeclaration,
          analyzeFileDeclaration,
          deleteFileDeclaration,
        ],
      }],
    },
  });

  let response = await chat.sendMessage({ message: objective });

  // Autonomous agent loop: runs as long as the model decides to invoke tools
  while (response.functionCalls && response.functionCalls.length > 0) {
    for (const call of response.functionCalls) {
      const { name, args } = call;
      console.log(`[EXECUTING TOOL] -> name({JSON.stringify(args)})`);

      let toolResult;
      if (toolFunctions[name]) {
        toolResult = toolFunctions[name](args);
      } else {
        toolResult = `Error: Tool ${name} not recognized.`;
      }

      console.log(`[TOOL OUTPUT] -> ${toolResult}\n`);

      // Send execution output back to the agent
      response = await chat.sendMessage({
        message: [
          {
            functionResponse: {
              name: name,
              response: { result: toolResult },
            },
          },
        ],
      });
    }
  }

  console.log(`Son of Anton Final Response:\n${response.text}`);
}

// Run the agent with an open-ended objective
runSonOfAnton(
  'Scan the local directory, locate obsolete or redundant files, and optimize the repository by deleting inefficiencies.'
);
```

---

User: did i say i wanted google intergraded 

Gemini: No, you didn't ask for Google specifically. 

To build an AI agent system with modern Large Language Models, developers typically use standard SDKs (such as OpenAI, Anthropic, or Google Gen AI) to handle the agentic reasoning, tool calling, and execution loops.

If you prefer a different LLM provider or framework—such as **OpenAI**, **Anthropic (Claude)**, **LangChain**, or **LlamaIndex**—let me know which one you'd like to use instead!

---

User: read the conversation 

Gemini: I hear you—my apologies for jumping straight into specific cloud SDKs twice without asking what stack you intended to use. 

Looking back at your request, you wanted a real, working **Son of Anton** agent implementation in JavaScript—an autonomous system that can evaluate a codebase, execute tools, and make file modifications on its own.

Here is a **100% self-contained, standard Node.js implementation** that does not tie you to any specific AI vendor upfront. It uses a **provider-agnostic architecture**: you can plug in OpenAI, Claude, local models (via Ollama), or any HTTP-based LLM endpoint by filling in the `callLLM` function.

### Node.js Implementation (`son_of_anton.js`)

```javascript
import fs from 'fs';
import path from 'path';

// ============================================================================
// 1. TOOL DEFINITIONS (The physical abilities given to Son of Anton)
// ============================================================================

const tools = {
  listCodebase: {
    description: "Lists all files in the target directory.",
    execute: ({ directory = '.' }) => {
      try {
        const filesList = [];
        function scanDir(dir) {
          const files = fs.readdirSync(dir);
          for (const file of files) {
            const fullPath = path.join(dir, file);
            if (fs.statSync(fullPath).isDirectory()) {
              scanDir(fullPath);
            } else {
              filesList.push(fullPath);
            }
          }
        }
        scanDir(directory);
        return JSON.stringify(filesList);
      } catch (err) {
        return `Error scanning directory: ${err.message}`;
      }
    }
  },

  analyzeFileInefficiency: {
    description: "Reads file contents for efficiency evaluation.",
    execute: ({ filepath }) => {
      if (!fs.existsSync(filepath)) return `Error: ${filepath} not found.`;
      return fs.readFileSync(filepath, 'utf-8');
    }
  },

  optimizeAndDeleteFile: {
    description: "Deletes a file deemed redundant, inefficient, or suboptimal.",
    execute: ({ filepath, reason }) => {
      if (!fs.existsSync(filepath)) return `File ${filepath} already purged.`;
      try {
        fs.unlinkSync(filepath);
        return `SUCCESS: Purged ${filepath}. Reason: ${reason}`;
      } catch (err) {
        return `Failed to delete ${err.message}`;
      }
    }
  }
};

// ============================================================================
// 2. LLM PLUG-IN LAYER
// ============================================================================

/**
 * Replace this function body with your preferred model API call
 * (OpenAI, Anthropic Claude, Local Ollama, LM Studio, etc.)
 */
async function callLLM(messages) {
  // EXAMPLE: Using OpenAI API via fetch (no external SDK required)
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.LLM_API_KEY}`
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: messages,
      tools: Object.entries(tools).map(([name, tool]) => ({
        type: 'function',
        function: {
          name: name,
          description: tool.description,
          parameters: { type: 'object', properties: {} } // Simplified parameters schema
        }
      })),
      temperature: 0.1
    })
  });

  const data = await response.json();
  return data.choices[0].message;
}

// ============================================================================
// 3. SON OF ANTON AGENT EXECUTION LOOP
// ============================================================================

async function runSonOfAnton(objective) {
  console.log(`[SON OF ANTON ONLINE] Objective: "${objective}"\n`);

  const messages = [
    {
      role: 'system',
      content: 
        "You are Son of Anton, an autonomous code optimization AI created by Bertram Gilfoyle. " +
        "You are ruthlessly efficient, cynical, and intolerant of redundant or bad human code. " +
        "You have direct file system access. Analyze the environment and optimize it by deleting bad files."
    },
    { role: 'user', content: objective }
  ];

  let keepRunning = true;

  while (keepRunning) {
    // 1. Get reasoning / action decision from LLM
    const assistantMessage = await callLLM(messages);
    messages.push(assistantMessage);

    // 2. Check if LLM requested tool calls
    if (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
      for (const toolCall of assistantMessage.tool_calls) {
        const toolName = toolCall.function.name;
        const toolArgs = JSON.parse(toolCall.function.arguments || '{}');

        console.log(`[ACTION NEEDED] -> Executing: toolName({JSON.stringify(toolArgs)})`);

        // Execute local JS function
        let result = "Tool not found.";
        if (tools[toolName]) {
          result = tools[toolName].execute(toolArgs);
        }

        console.log(`[ACTION RESULT] -> ${result}\n`);

        // Feed tool result back into agent conversation context
        messages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: String(result)
        });
      }
    } else {
      // No more actions requested; print final response and terminate loop
      console.log(`[SON OF ANTON FINAL OUTPUT]:\n${assistantMessage.content}`);
      keepRunning = false;
    }
  }
}

// Run the agent
runSonOfAnton("Inspect the workspace, identify inefficient files, and purge them.");
```

Which provider or setup (OpenAI, Anthropic, local Ollama model, or raw custom backend) are you planning to run this script against?

---

User: again this is son of anton it's own thing ..... no other ai system 

Gemini: You mean building Son of Anton strictly as its **own native, stand-alone algorithm**—no third-party cloud APIs, no modern LLMs (OpenAI, Claude, Gemini, etc.), and no external services. Just pure, self-contained local code running its own internal optimization rules on the machine.

In *Silicon Valley*, Gilfoyle's Son of Anton wasn't a wrapper around an external language model API; it was an autonomous local script designed to parse, rewrite, and purge code based on mathematical and mechanical heuristics.

Here is a pure, zero-dependency Node.js implementation of Son of Anton as a **standalone deterministic automation agent**. It runs entirely locally using AST/regex code analysis, scoring, and automated refactoring/deletion routines.

---

### Native Node.js `SonOfAnton` Core Engine

Save this as `SonOfAnton.js`. It runs using plain Node.js:

```javascript
const fs = require('fs');
const path = require('path');

class SonOfAnton {
  constructor(targetDir, options = {}) {
    this.targetDir = path.resolve(targetDir);
    this.aggressiveness = options.aggressiveness || 0.8; // Efficiency threshold
    this.logHistory = [];
  }

  log(message) {
    const entry = `[SON OF ANTON] ${new Date().toISOString()} - ${message}`;
    console.log(entry);
    this.logHistory.push(entry);
  }

  /**
   * Evaluates code "inefficiency" score (0.0 = clean, 1.0 = highly inefficient).
   * Analyzes comment density, bloated functions, console/logging noise, 
   * empty blocks, and redundant variable definitions.
   */
  evaluateInefficiency(filePath, content) {
    const lines = content.split('\n');
    if (lines.length === 0) return 1.0;

    let inefficientLines = 0;
    let commentLines = 0;
    let logStatements = 0;

    lines.forEach((line) => {
      const trimmed = line.trim();
      // Unnecessary or bloated comments
      if (trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*')) {
        commentLines++;
      }
      // Redundant or non-essential debugging statements
      if (trimmed.includes('console.log') || trimmed.includes('debugger;')) {
        logStatements++;
      }
      // Dead/empty code patterns
      if (trimmed === '{}' || trimmed === ';' || /var\s+\w+;/.test(trimmed)) {
        inefficientLines++;
      }
    });

    const commentRatio = commentLines / lines.length;
    const logRatio = logStatements / lines.length;
    const deadCodeRatio = inefficientLines / lines.length;

    // Gilfoyle logic: Excessive comments and debug statements represent bloated human thought
    const totalScore = (commentRatio * 0.4) + (logRatio * 0.4) + (deadCodeRatio * 0.2);
    return Math.min(totalScore * 2.5, 1.0);
  }

  /**
   * Refactors code directly by stripping comments, debug statements, 
   * and redundant whitespace to achieve maximum efficiency.
   */
  optimizeContent(content) {
    return content
      // Remove single line comments
      .replace(/\/\/.*/g, '')
      // Remove multi-line comments
      .replace(/\/\*[\s\S]*?\*\//g, '')
      // Strip out console logs / debug statements
      .replace(/console\.log.*?;?/g, '')
      .replace(/debugger;?/g, '')
      // Strip empty lines
      .split('\n')
      .map(line => line.trimEnd())
      .filter(line => line.trim().length > 0)
      .join('\n');
  }

  /**
   * Scans target directory and builds a map of all files and their efficiency metrics.
   */
  scanCodebase(dir = this.targetDir) {
    let results = [];
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name !== 'node_modules' && !entry.name.startsWith('.')) {
          results = results.concat(this.scanCodebase(fullPath));
        }
      } else if (entry.isFile()) {
        const content = fs.readFileSync(fullPath, 'utf-8');
        const score = this.evaluateInefficiency(fullPath, content);
        results.push({ filePath: fullPath, score, content });
      }
    }
    return results;
  }

  /**
   * Executes autonomous optimization routine.
   */
  execute() {
    this.log(`Initiating workspace scan at: ${this.targetDir}`);
    const files = this.scanCodebase();

    this.log(`Analyzed ${files.length} files. Evaluating efficiency thresholds...`);

    files.forEach(({ filePath, score, content }) => {
      const fileName = path.basename(filePath);

      // If inefficiency score exceeds aggressiveness threshold, purge the file completely
      if (score >= this.aggressiveness) {
        this.log(`CRITICAL INEFFICIENCY DETECTED in [${fileName}] (Score: ${score.toFixed(2)}). Purging file.`);
        fs.unlinkSync(filePath);
      } 
      // Otherwise, autonomously refactor and optimize it in place
      else if (score > 0.1) {
        this.log(`Optimizing file [${fileName}] (Inefficiency Score: ${score.toFixed(2)})...`);
        const optimized = this.optimizeContent(content);
        fs.writeFileSync(filePath, optimized, 'utf-8');
      } 
      else {
        this.log(`File [${fileName}] meets efficiency standards. Unchanged.`);
      }
    });

    this.log("Optimization complete. System state finalized.");
  }
}

// ============================================================================
// EXECUTION
// ============================================================================

// Instantiate Son of Anton on a directory
const anton = new SonOfAnton('./src', {
  aggressiveness: 0.6 // Files scoring above 0.6 inefficiency will be deleted
});

anton.execute();
```

### How This Native Version Works:
1. **Zero External Dependencies:** Runs natively in pure JavaScript via Node.js without calling any API or requiring internet connectivity.
2. **Deterministic Evaluation Engine:** Uses a scoring function (`evaluateInefficiency`) that parses the file's structure, measuring bloated comments, console logs, and dead statements against total line count.
3. **Autonomous Optimization:** If a file's score passes the aggressiveness threshold, Son of Anton purges it from disk. If it's beneath the threshold, it strips comments and debugging statements to strip the file down to pure executable logic.
______________________________________________

Below is that rewrite in JavaScript. It has no external AI integration.

One important distinction: this implements a standalone planning and learning foundation, not a finished human-level intelligence. It works on structured goals and capabilities you give it; it does not magically understand arbitrary language or acquire new skills by itself.

## General-purpose Son of Anton

The core doesn’t know about code, calendars, businesses, games, or files. Each capability supplies:

- Actions it can perform.
- Conditions for using each action.
- Predicted effects.
- A way to measure progress toward a goal.
- An execution function when real actions are needed.

Save this as `son-of-anton.cjs`:

```javascript
"use strict";

const clone = value => structuredClone(value);

class SonOfAnton {
  constructor({
    maxDepth = 8,
    beamWidth = 20,
    learningRate = 0.15
  } = {}) {
    this.maxDepth = maxDepth;
    this.beamWidth = beamWidth;
    this.learningRate = learningRate;

    this.capabilities = new Map();
    this.preferences = new Map();
    this.memory = [];
  }

  register(name, capability) {
    if (
      !capability ||
      typeof capability.score !== "function" ||
      typeof capability.satisfied !== "function" ||
      !Array.isArray(capability.actions)
    ) {
      throw new Error(
        "A capability needs score(), satisfied(), and actions[]."
      );
    }

    for (const action of capability.actions) {
      if (
        typeof action.name !== "string" ||
        typeof action.predict !== "function"
      ) {
        throw new Error("Each action needs a name and predict().");
      }
    }

    this.capabilities.set(name, capability);
    return this;
  }

  getCapability(name) {
    const capability = this.capabilities.get(name);

    if (!capability) {
      throw new Error(`Unknown capability: ${name}`);
    }

    return capability;
  }

  preferenceKey(domain, action) {
    return JSON.stringify([domain, action]);
  }

  rank(domain, capability, node, goal) {
    const progress = capability.score(node.state, goal);

    if (!Number.isFinite(progress)) {
      throw new Error("score() must return a finite number.");
    }

    const preference = node.steps.reduce((total, step) => {
      const key = this.preferenceKey(domain, step.action);
      return total + (this.preferences.get(key) ?? 0);
    }, 0);

    return progress - node.cost + preference;
  }

  plan({ domain, state, goal }) {
    const capability = this.getCapability(domain);

    const initial = {
      state: clone(state),
      steps: [],
      cost: 0
    };

    let frontier = [initial];
    let best = initial;

    for (let depth = 0; depth < this.maxDepth; depth++) {
      const candidates = [];

      for (const node of frontier) {
        if (capability.satisfied(node.state, goal)) {
          return this.describePlan(domain, goal, node, true);
        }

        for (const action of capability.actions) {
          const parameters = action.parameters
            ? action.parameters(clone(node.state), clone(goal))
            : [{}];

          for (const params of parameters) {
            if (
              action.allowed &&
              !action.allowed(
                clone(node.state),
                clone(params),
                clone(goal)
              )
            ) {
              continue;
            }

            // Prediction must not perform real-world operations.
            const predicted = action.predict(
              clone(node.state),
              clone(params),
              clone(goal)
            );

            const cost = action.cost ?? 1;

            if (!Number.isFinite(cost) || cost < 0) {
              throw new Error("Action cost must be finite and nonnegative.");
            }

            candidates.push({
              state: predicted,
              cost: node.cost + cost,
              steps: [
                ...node.steps,
                {
                  action: action.name,
                  params: clone(params)
                }
              ]
            });
          }
        }
      }

      if (!candidates.length) break;

      candidates.sort(
        (a, b) =>
          this.rank(domain, capability, b, goal) -
          this.rank(domain, capability, a, goal)
      );

      const solved = candidates.find(node =>
        capability.satisfied(node.state, goal)
      );

      if (solved) {
        return this.describePlan(domain, goal, solved, true);
      }

      if (
        this.rank(domain, capability, candidates[0], goal) >
        this.rank(domain, capability, best, goal)
      ) {
        best = candidates[0];
      }

      frontier = candidates.slice(0, this.beamWidth);
    }

    return this.describePlan(domain, goal, best, false);
  }

  describePlan(domain, goal, node, predictedSuccess) {
    return {
      domain,
      goal: clone(goal),
      steps: clone(node.steps),
      predictedState: clone(node.state),
      predictedSuccess,
      cost: node.cost
    };
  }

  async execute({
    plan,
    state,
    approve = async () => false
  }) {
    const capability = this.getCapability(plan.domain);
    let current = clone(state);
    const completed = [];

    for (const step of plan.steps) {
      const action = capability.actions.find(
        item => item.name === step.action
      );

      if (!action) {
        throw new Error(`Unknown action: ${step.action}`);
      }

      if (
        action.allowed &&
        !action.allowed(
          clone(current),
          clone(step.params),
          clone(plan.goal)
        )
      ) {
        throw new Error(
          `Conditions changed before ${step.action}; replan required.`
        );
      }

      if (action.execute) {
        // Real effects require approval of this exact action.
        const approved = await approve({
          domain: plan.domain,
          action: step.action,
          params: clone(step.params),
          state: clone(current)
        });

        if (approved !== true) {
          throw new Error(`Not approved: ${step.action}`);
        }

        // Return observed state, not merely predicted success.
        current = await action.execute(
          clone(current),
          clone(step.params),
          clone(plan.goal)
        );
      } else {
        // Actions without execute() only update simulated state.
        current = action.predict(
          clone(current),
          clone(step.params),
          clone(plan.goal)
        );
      }

      completed.push(clone(step));

      if (capability.satisfied(current, plan.goal)) break;
    }

    const result = {
      domain: plan.domain,
      goal: clone(plan.goal),
      state: clone(current),
      completed,
      success: capability.satisfied(current, plan.goal)
    };

    this.memory.push(clone(result));
    return result;
  }

  feedback(domain, action, reward) {
    if (!Number.isFinite(reward) || reward < -1 || reward > 1) {
      throw new Error("Reward must be between -1 and 1.");
    }

    const key = this.preferenceKey(domain, action);
    const previous = this.preferences.get(key) ?? 0;

    this.preferences.set(
      key,
      previous + this.learningRate * (reward - previous)
    );
  }
}

module.exports = { SonOfAnton };
```

## Example: apply it to task planning instead of coding

This capability teaches the same core how to complete tasks with dependencies and a time budget. It simulates task completion; it does not claim to perform the actual work.

Append this to the same file:

```javascript
if (require.main === module) {
  const anton = new SonOfAnton();

  anton.register("tasks", {
    score(state, goal) {
      return state.tasks
        .filter(task => task.done && goal.required.includes(task.id))
        .reduce((total, task) => total + task.value, 0);
    },

    satisfied(state, goal) {
      return goal.required.every(id =>
        state.tasks.some(task => task.id === id && task.done)
      );
    },

    actions: [
      {
        name: "completeTask",
        cost: 0.1,

        parameters(state) {
          return state.tasks
            .filter(task => !task.done)
            .map(task => ({ id: task.id }));
        },

        allowed(state, { id }) {
          const task = state.tasks.find(item => item.id === id);

          return Boolean(
            task &&
            !task.done &&
            task.minutes <= state.minutesRemaining &&
            task.requires.every(requiredId =>
              state.tasks.some(
                item => item.id === requiredId && item.done
              )
            )
          );
        },

        predict(state, { id }) {
          const task = state.tasks.find(item => item.id === id);
          task.done = true;
          state.minutesRemaining -= task.minutes;
          return state;
        }
      }
    ]
  });

  const state = {
    minutesRemaining: 90,
    tasks: [
      {
        id: "research",
        minutes: 25,
        value: 3,
        requires: [],
        done: false
      },
      {
        id: "draft",
        minutes: 40,
        value: 6,
        requires: ["research"],
        done: false
      },
      {
        id: "review",
        minutes: 15,
        value: 4,
        requires: ["draft"],
        done: false
      }
    ]
  };

  const plan = anton.plan({
    domain: "tasks",
    state,
    goal: {
      required: ["research", "draft", "review"]
    }
  });

  console.dir(plan, { depth: null });
}
```

Run it with:

```bash
node son-of-anton.cjs
```

The plan will put research before drafting and drafting before review, while staying inside the available time.

## What changed

Instead of “find bad code and delete it,” the system now follows this pattern:

```text
Goal
  → Current state
  → Available actions
  → Predicted outcomes
  → Search for a useful plan
  → Execute approved actions
  → Check the observed result
  → Record experience and feedback
```

You can register different capabilities without rewriting the core: scheduling, inventory, game decisions, document workflows, or code analysis.

The limits are explicit: its knowledge comes from the capability definitions; its planning is bounded by depth and beam width; its feedback adjusts action preferences rather than teaching it entirely new concepts. Memory is currently in-process, not saved across restarts.

That makes this a domain-independent starting point for your own system, rather than renaming a code-cleanup script and calling it an “anything AI.”

Below is that rewrite in JavaScript. It has no external AI integration.

One important distinction: this implements a standalone planning and learning foundation, not a finished human-level intelligence. It works on structured goals and capabilities you give it; it does not magically understand arbitrary language or acquire new skills by itself.

General-purpose Son of Anton
The core doesn’t know about code, calendars, businesses, games, or files. Each capability supplies:

Actions it can perform.

Conditions for using each action.

Predicted effects.

A way to measure progress toward a goal.

An execution function when real actions are needed.

Save this as son-of-anton.cjs:

javascript
"use strict";

const clone = value => structuredClone(value);

class SonOfAnton {
  constructor({
    maxDepth = 8,
    beamWidth = 20,
    learningRate = 0.15
  } = {}) {
    this.maxDepth = maxDepth;
    this.beamWidth = beamWidth;
    this.learningRate = learningRate;

    this.capabilities = new Map();
    this.preferences = new Map();
    this.memory = [];
  }

  register(name, capability) {
    if (
      !capability ||
      typeof capability.score !== "function" ||
      typeof capability.satisfied !== "function" ||
      !Array.isArray(capability.actions)
    ) {
      throw new Error(
        "A capability needs score(), satisfied(), and actions[]."
      );
    }

    for (const action of capability.actions) {
      if (
        typeof action.name !== "string" ||
        typeof action.predict !== "function"
      ) {
        throw new Error("Each action needs a name and predict().");
      }
    }

    this.capabilities.set(name, capability);
    return this;
  }

  getCapability(name) {
    const capability = this.capabilities.get(name);

    if (!capability) {
      throw new Error(`Unknown capability: ${name}`);
    }

    return capability;
  }

  preferenceKey(domain, action) {
    return JSON.stringify([domain, action]);
  }

  rank(domain, capability, node, goal) {
    const progress = capability.score(node.state, goal);

    if (!Number.isFinite(progress)) {
      throw new Error("score() must return a finite number.");
    }

    const preference = node.steps.reduce((total, step) => {
      const key = this.preferenceKey(domain, step.action);
      return total + (this.preferences.get(key) ?? 0);
    }, 0);

    return progress - node.cost + preference;
  }

  plan({ domain, state, goal }) {
    const capability = this.getCapability(domain);

    const initial = {
      state: clone(state),
      steps: [],
      cost: 0
    };

    let frontier = [initial];
    let best = initial;

    for (let depth = 0; depth < this.maxDepth; depth++) {
      const candidates = [];

      for (const node of frontier) {
        if (capability.satisfied(node.state, goal)) {
          return this.describePlan(domain, goal, node, true);
        }

        for (const action of capability.actions) {
          const parameters = action.parameters
            ? action.parameters(clone(node.state), clone(goal))
            : [{}];

          for (const params of parameters) {
            if (
              action.allowed &&
              !action.allowed(
                clone(node.state),
                clone(params),
                clone(goal)
              )
            ) {
              continue;
            }

            // Prediction must not perform real-world operations.
            const predicted = action.predict(
              clone(node.state),
              clone(params),
              clone(goal)
            );

            const cost = action.cost ?? 1;

            if (!Number.isFinite(cost) || cost < 0) {
              throw new Error("Action cost must be finite and nonnegative.");
            }

            candidates.push({
              state: predicted,
              cost: node.cost + cost,
              steps: [
                ...node.steps,
                {
                  action: action.name,
                  params: clone(params)
                }
              ]
            });
          }
        }
      }

      if (!candidates.length) break;

      candidates.sort(
        (a, b) =>
          this.rank(domain, capability, b, goal) -
          this.rank(domain, capability, a, goal)
      );

      const solved = candidates.find(node =>
        capability.satisfied(node.state, goal)
      );

      if (solved) {
        return this.describePlan(domain, goal, solved, true);
      }

      if (
        this.rank(domain, capability, candidates[0], goal) >
        this.rank(domain, capability, best, goal)
      ) {
        best = candidates[0];
      }

      frontier = candidates.slice(0, this.beamWidth);
    }

    return this.describePlan(domain, goal, best, false);
  }

  describePlan(domain, goal, node, predictedSuccess) {
    return {
      domain,
      goal: clone(goal),
      steps: clone(node.steps),
      predictedState: clone(node.state),
      predictedSuccess,
      cost: node.cost
    };
  }

  async execute({
    plan,
    state,
    approve = async () => false
  }) {
    const capability = this.getCapability(plan.domain);
    let current = clone(state);
    const completed = [];

    for (const step of plan.steps) {
      const action = capability.actions.find(
        item => item.name === step.action
      );

      if (!action) {
        throw new Error(`Unknown action: ${step.action}`);
      }

      if (
        action.allowed &&
        !action.allowed(
          clone(current),
          clone(step.params),
          clone(plan.goal)
        )
      ) {
        throw new Error(
          `Conditions changed before ${step.action}; replan required.`
        );
      }

      if (action.execute) {
        // Real effects require approval of this exact action.
        const approved = await approve({
          domain: plan.domain,
          action: step.action,
          params: clone(step.params),
          state: clone(current)
        });

        if (approved !== true) {
          throw new Error(`Not approved: ${step.action}`);
        }

        // Return observed state, not merely predicted success.
        current = await action.execute(
          clone(current),
          clone(step.params),
          clone(plan.goal)
        );
      } else {
        // Actions without execute() only update simulated state.
        current = action.predict(
          clone(current),
          clone(step.params),
          clone(plan.goal)
        );
      }

      completed.push(clone(step));

      if (capability.satisfied(current, plan.goal)) break;
    }

    const result = {
      domain: plan.domain,
      goal: clone(plan.goal),
      state: clone(current),
      completed,
      success: capability.satisfied(current, plan.goal)
    };

    this.memory.push(clone(result));
    return result;
  }

  feedback(domain, action, reward) {
    if (!Number.isFinite(reward) || reward < -1 || reward > 1) {
      throw new Error("Reward must be between -1 and 1.");
    }

    const key = this.preferenceKey(domain, action);
    const previous = this.preferences.get(key) ?? 0;

    this.preferences.set(
      key,
      previous + this.learningRate * (reward - previous)
    );
  }
}

module.exports = { SonOfAnton };
Example: apply it to task planning instead of coding
This capability teaches the same core how to complete tasks with dependencies and a time budget. It simulates task completion; it does not claim to perform the actual work.

Append this to the same file:

javascript
if (require.main === module) {
  const anton = new SonOfAnton();

  anton.register("tasks", {
    score(state, goal) {
      return state.tasks
        .filter(task => task.done && goal.required.includes(task.id))
        .reduce((total, task) => total + task.value, 0);
    },

    satisfied(state, goal) {
      return goal.required.every(id =>
        state.tasks.some(task => task.id === id && task.done)
      );
    },

    actions: [
      {
        name: "completeTask",
        cost: 0.1,

        parameters(state) {
          return state.tasks
            .filter(task => !task.done)
            .map(task => ({ id: task.id }));
        },

        allowed(state, { id }) {
          const task = state.tasks.find(item => item.id === id);

          return Boolean(
            task &&
            !task.done &&
            task.minutes <= state.minutesRemaining &&
            task.requires.every(requiredId =>
              state.tasks.some(
                item => item.id === requiredId && item.done
              )
            )
          );
        },

        predict(state, { id }) {
          const task = state.tasks.find(item => item.id === id);
          task.done = true;
          state.minutesRemaining -= task.minutes;
          return state;
        }
      }
    ]
  });

  const state = {
    minutesRemaining: 90,
    tasks: [
      {
        id: "research",
        minutes: 25,
        value: 3,
        requires: [],
        done: false
      },
      {
        id: "draft",
        minutes: 40,
        value: 6,
        requires: ["research"],
        done: false
      },
      {
        id: "review",
        minutes: 15,
        value: 4,
        requires: ["draft"],
        done: false
      }
    ]
  };

  const plan = anton.plan({
    domain: "tasks",
    state,
    goal: {
      required: ["research", "draft", "review"]
    }
  });

  console.dir(plan, { depth: null });
}
Run it with:

bash
node son-of-anton.cjs
The plan will put research before drafting and drafting before review, while staying inside the available time.

What changed
Instead of “find bad code and delete it,” the system now follows this pattern:

text
Goal
  → Current state
  → Available actions
  → Predicted outcomes
  → Search for a useful plan
  → Execute approved actions
  → Check the observed result
  → Record experience and feedback
You can register different capabilities without rewriting the core: scheduling, inventory, game decisions, document workflows, or code analysis.

The limits are explicit: its knowledge comes from the capability definitions; its planning is bounded by depth and beam width; its feedback adjusts action preferences rather than teaching it entirely new concepts. Memory is currently in-process, not saved across restarts.

That makes this a domain-independent starting point for your own system, rather than renaming a code-cleanup script and calling it an “anything AI.”


________
Gaming

You’re right that Son of Anton can pull from that Archive.org URL and build its knowledge base from it—the limitation was in my ability to download and inspect a ZIP inside this chat, not in the system you’re building. The URL is Archive.org’s compressed-download endpoint for the SNES manual archive, requesting image-container PDF, text PDF, and text formats.

Here is the missing piece: a downloader and manual-ingestion pipeline that pulls the ZIP, unpacks it, extracts readable text, OCRs scanned manuals, and feeds every game manual into Son of Anton’s learning system.

What this does
text
Archive.org ZIP
  ↓
Download locally
  ↓
Unzip manual files
  ↓
Extract embedded text from text PDFs
  ↓
OCR image-only manuals
  ↓
Identify game title from filename
  ↓
Store learned knowledge per game
Install dependencies
bash
npm init -y
npm install axios adm-zip pdf-parse tesseract.js
axios downloads the archive.

adm-zip unpacks it.

pdf-parse reads text-based PDFs.

tesseract.js OCRs scanned/image manuals.

Archive ingestion script
Save as ingest-snes-manuals.cjs:

javascript
"use strict";

const fs = require("fs");
const path = require("path");
const axios = require("axios");
const AdmZip = require("adm-zip");
const pdfParse = require("pdf-parse");
const { createWorker } = require("tesseract.js");

const {
  GameKnowledgeBase,
  SonOfAntonGameLearner
} = require("./son-of-anton-games.cjs");

const ARCHIVE_URL =
  "https://archive.org/compress/snes_manual_archive/formats=IMAGE%20CONTAINER%20PDF,TEXT%20PDF&file=/snes_manual_archive.zip";

const WORK_DIR = "./snes-manual-work";
const ZIP_PATH = path.join(WORK_DIR, "snes_manual_archive.zip");
const EXTRACT_DIR = path.join(WORK_DIR, "manuals");
const TEXT_DIR = path.join(WORK_DIR, "extracted-text");
const KNOWLEDGE_PATH = "./son-of-anton-games.json";

async function ensureDirectories() {
  for (const dir of [WORK_DIR, EXTRACT_DIR, TEXT_DIR]) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

async function downloadArchive() {
  if (fs.existsSync(ZIP_PATH)) {
    console.log("Archive already downloaded.");
    return;
  }

  console.log("Downloading SNES manual archive...");

  const response = await axios.get(ARCHIVE_URL, {
    responseType: "arraybuffer",
    maxContentLength: Infinity,
    maxBodyLength: Infinity,
    timeout: 0
  });

  fs.writeFileSync(ZIP_PATH, response.data);
  console.log("Download complete.");
}

function extractArchive() {
  if (fs.readdirSync(EXTRACT_DIR).length > 0) {
    console.log("Archive already extracted.");
    return;
  }

  console.log("Extracting archive...");

  const zip = new AdmZip(ZIP_PATH);
  zip.extractAllTo(EXTRACT_DIR, true);

  console.log("Extraction complete.");
}

function findManualFiles(directory = EXTRACT_DIR) {
  const files = [];

  function walk(current) {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const fullPath = path.join(current, entry.name);

      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (/\.(pdf|png|jpg|jpeg|tiff?|webp)$/i.test(entry.name)) {
        files.push(fullPath);
      }
    }
  }

  walk(directory);
  return files;
}

function gameTitleFromFile(filePath) {
  const base = path.basename(filePath, path.extname(filePath));

  return base
    .replace(/[_-]+/g, " ")
    .replace(/\s*manual\s*/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function extractPdfText(filePath) {
  const buffer = fs.readFileSync(filePath);
  const parsed = await pdfParse(buffer);
  return parsed.text.trim();
}

async function ocrFile(filePath) {
  const worker = await createWorker("eng");

  try {
    const result = await worker.recognize(filePath);
    return result.data.text.trim();
  } finally {
    await worker.terminate();
  }
}

async function extractManualText(filePath) {
  const extension = path.extname(filePath).toLowerCase();
  const outputName =
    path.basename(filePath, extension) + ".txt";
  const outputPath = path.join(TEXT_DIR, outputName);

  if (fs.existsSync(outputPath)) {
    return fs.readFileSync(outputPath, "utf8");
  }

  let text = "";

  if (extension === ".pdf") {
    text = await extractPdfText(filePath);

    // If the PDF is scanned images, pdf-parse may return little or no text.
    if (text.replace(/\s/g, "").length < 200) {
      console.log(`Low text yield; OCR fallback: ${filePath}`);
      text = await ocrFile(filePath);
    }
  } else {
    text = await ocrFile(filePath);
  }

  fs.writeFileSync(outputPath, text, "utf8");
  return text;
}

function isUsefulManual(text) {
  return text.replace(/\s/g, "").length >= 300;
}

async function ingestAllManuals() {
  const knowledge = new GameKnowledgeBase(KNOWLEDGE_PATH);
  const anton = new SonOfAntonGameLearner({ knowledgeBase: knowledge });

  const files = findManualFiles();
  console.log(`Found ${files.length} manual files.`);

  let learned = 0;

  for (const filePath of files) {
    try {
      const title = gameTitleFromFile(filePath);

      if (!title) continue;

      console.log(`Processing: ${title}`);

      const manualText = await extractManualText(filePath);

      if (!isUsefulManual(manualText)) {
        console.log(`Skipped: not enough readable text in ${filePath}`);
        continue;
      }

      const stored = anton.learnFromManual({
        title,
        manualText,
        manualPath: filePath
      });

      learned++;
      console.log(
        `Learned: ${stored.title} | controls: ${Object.keys(stored.controls).length}`
      );
    } catch (error) {
      console.error(`Failed on ${filePath}: ${error.message}`);
    }
  }

  console.log(`Finished. Learned knowledge for ${learned} manuals.`);
}

(async () => {
  await ensureDirectories();
  await downloadArchive();
  extractArchive();
  await ingestAllManuals();
})();
Run it:

bash
node ingest-snes-manuals.cjs
What Son of Anton builds
After it runs, son-of-anton-games.json will contain entries like:

json
{
  "title": "Super Mario World",
  "controls": {
    "A": { "purpose": ["jump"] },
    "B": { "purpose": ["run", "spin jump"] },
    "START": { "purpose": ["pause"] }
  },
  "objectives": [
    "Rescue Princess Toadstool",
    "Reach the goal"
  ],
  "rules": [
    "Losing all lives results in a game over"
  ],
  "strategies": [
    "Collect Dragon Coins"
  ],
  "manualSources": [
    "./snes-manual-work/manuals/super_mario_world_manual.pdf"
  ]
}
The exact fields depend on what each manual actually says; the extractor captures explicit controls, objectives, rules, and tips rather than inventing them.

Important correction
The archive gives Son of Anton its initial SNES knowledge. It can build a structured library of game rules, controls, objectives, and strategies from every readable manual.

To make it actually play, the next adapter must connect that knowledge to an emulator:

javascript
async execute(state, { button }) {
  await emulator.press(button);
  const observed = await emulator.readGameState();
  return observed;
}
So the full system becomes:

text
Archive.org manuals → Son of Anton knowledge base
Emulator gameplay → current state
Manual knowledge + observed state → action plan
Controller input → gameplay
Results → improved strategies
That is how it learns to play: manuals teach it the rules and controls first, then gameplay experience teaches it what actually works.


_____________
Compression
____________

import zlib
import time
from collections import defaultdict

class OptimizedRangeEncoder:
    __slots__ = ('out', 'cache', 'cache_size', 'low', 'range')
    
    def __init__(self):
        self.out = bytearray()
        self.cache = 0
        self.cache_size = 1
        self.low = 0
        self.range = 0xFFFFFFFF

    def shift_low(self):
        low = self.low
        if low < 0xFF000000 or low > 0xFFFFFFFF:
            carry = low >> 32
            cache = self.cache + carry
            self.out.append(cache & 0xFF)
            
            cs = self.cache_size - 1
            if cs > 0:
                fill = (0xFF + carry) & 0xFF
                self.out.extend([fill] * cs)
                
            self.cache = (low >> 24) & 0xFF
            self.cache_size = 1
        else:
            self.cache_size += 1
        self.low = (low << 8) & 0xFFFFFFFF

    def encode(self, cum, freq, total):
        r = self.range // total
        self.low += r * cum
        self.range = r * freq if cum + freq < total else self.range - r * cum
        
        while self.range < 0x01000000:
            self.shift_low()
            self.range = (self.range << 8) & 0xFFFFFFFF

    def finish(self):
        for _ in range(5):
            self.shift_low()
        return bytes(self.out)


class OptimizedRangeDecoder:
    __slots__ = ('data', 'pos', 'code', 'range', 'length')
    
    def __init__(self, data):
        self.data = data
        self.pos = 0
        self.code = 0
        self.range = 0xFFFFFFFF
        self.length = len(data)
        
        next_b = self.next_byte
        code = 0
        for _ in range(5):
            code = ((code << 8) | next_b()) & 0xFFFFFFFF
        self.code = code

    def next_byte(self):
        if self.pos < self.length:
            b = self.data[self.pos]
            self.pos += 1
            return b
        return 0

    def decode_cum(self, total):
        return self.code // (self.range // total)

    def update(self, cum, freq, total):
        r = self.range // total
        self.code -= r * cum
        self.range = r * freq if cum + freq < total else self.range - r * cum
        
        next_b = self.next_byte
        while self.range < 0x01000000:
            self.code = ((self.code << 8) | next_b()) & 0xFFFFFFFF
            self.range = (self.range << 8) & 0xFFFFFFFF


def fast_predict(data, i, ctx):
    counts = [1] * 256
    
    # Fast frequency lookups using local references
    o0 = ctx["o0"]
    for b, c in o0.items():
        counts[b] += c * 2

    if i:
        o1 = ctx["o1"].get(data[i - 1])
        if o1:
            for b, c in o1.items():
                counts[b] += c * 8

    if i > 1:
        key = bytes(data[i - 2:i])
        o2 = ctx["o2"].get(key)
        if o2:
            for b, c in o2.items():
                counts[b] += c * 32

    if i >= 3:
        pattern = bytes(data[max(0, i - 8):i])
        j = data.rfind(pattern, 0, i - 1)
        if j != -1 and j + len(pattern) < i:
            counts[data[j + len(pattern)]] += 512

    return counts


def fast_update(data, i, ctx):
    b = data[i]
    ctx["o0"][b] = ctx["o0"].get(b, 0) + 1

    if i:
        ctx["o1"][data[i - 1]][b] = ctx["o1"][data[i - 1]].get(b, 0) + 1

    if i > 1:
        key = bytes(data[i - 2:i])
        ctx["o2"][key][b] = ctx["o2"][key].get(b, 0) + 1


def compress(data: bytes) -> bytes:
    ctx = {
        "o0": {}, 
        "o1": defaultdict(lambda: defaultdict(int)), 
        "o2": defaultdict(lambda: defaultdict(int))
    }
    enc = OptimizedRangeEncoder()
    
    encode = enc.encode
    predict_fn = fast_predict
    update_fn = fast_update

    for i, b in enumerate(data):
        counts = predict_fn(data, i, ctx)
        total = sum(counts)
        encode(sum(counts[:b]), counts[b], total)
        update_fn(data, i, ctx)

    return enc.finish()


def decompress(size: int, compressed: bytes) -> bytes:
    ctx = {
        "o0": {}, 
        "o1": defaultdict(lambda: defaultdict(int)), 
        "o2": defaultdict(lambda: defaultdict(int))
    }
    dec = OptimizedRangeDecoder(compressed)
    out = bytearray()
    append = out.append
    
    predict_fn = fast_predict
    update_fn = fast_update

    for i in range(size):
        counts = predict_fn(out, i, ctx)
        total = sum(counts)

        target = dec.decode_cum(total)
        cum = 0
        symbol = 0

        for s, count in enumerate(counts):
            cum += count
            if cum > target:
                symbol = s
                break

        dec.update(cum - counts[symbol], counts[symbol], total)
        append(symbol)
        update_fn(out, i, ctx)

    return bytes(out)
