"use strict";

const fs = require('fs');
const path = require('path');

const clone = value => structuredClone(value);

class SonOfAnton {
  constructor({
    maxDepth = 8,
    beamWidth = 20,
    learningRate = 0.15,
    aggressiveness = 0.6
  } = {}) {
    this.maxDepth = maxDepth;
    this.beamWidth = beamWidth;
    this.learningRate = learningRate;
    this.aggressiveness = aggressiveness;

    this.capabilities = new Map();
    this.preferences = new Map();
    this.memory = [];
    this.logHistory = [];
  }

  log(message) {
    const entry = `[SON OF ANTON] ${new Date().toISOString()} - ${message}`;
    console.log(entry);
    this.logHistory.push(entry);
  }

  register(name, capability) {
    if (
      !capability ||
      typeof capability.score !== "function" ||
      typeof capability.satisfied !== "function" ||
      !Array.isArray(capability.actions)
    ) {
      throw new Error("A capability needs score(), satisfied(), and actions[].");
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
    approve = async () => true
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
        throw new Error(`Conditions changed before ${step.action}; replan required.`);
      }

      if (action.execute) {
        const approved = await approve({
          domain: plan.domain,
          action: step.action,
          params: clone(step.params),
          state: clone(current)
        });

        if (approved !== true) {
          throw new Error(`Not approved: ${step.action}`);
        }

        current = await action.execute(
          clone(current),
          clone(step.params),
          clone(plan.goal)
        );
      } else {
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
}

// ============================================================================
// Codebase Optimization Extension Module
// ============================================================================

function registerCodebaseCapability(antonInstance, targetDir) {
  antonInstance.register("codebase", {
    score(state) {
      // Minimize total remaining inefficiency points
      return -state.files.reduce((acc, f) => acc + f.score, 0);
    },

    satisfied(state) {
      // Goal is satisfied when all files meet efficiency standard (score < aggressiveness)
      return state.files.every(f => f.score < antonInstance.aggressiveness);
    },

    actions: [
      {
        name: "purgeFile",
        cost: 0.5,
        parameters(state) {
          return state.files
            .filter(f => f.score >= antonInstance.aggressiveness)
            .map(f => ({ filePath: f.filePath }));
        },
        predict(state, { filePath }) {
          const nextFiles = state.files.filter(f => f.filePath !== filePath);
          return { ...state, files: nextFiles };
        },
        async execute(state, { filePath }) {
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            antonInstance.log(`PURGED inefficient asset: ${filePath}`);
          }
          const nextFiles = state.files.filter(f => f.filePath !== filePath);
          return { ...state, files: nextFiles };
        }
      },
      {
        name: "optimizeFile",
        cost: 0.2,
        parameters(state) {
          return state.files
            .filter(f => f.score > 0.1 && f.score < antonInstance.aggressiveness)
            .map(f => ({ filePath: f.filePath }));
        },
        predict(state, { filePath }) {
          const nextFiles = state.files.map(f => {
            if (f.filePath === filePath) {
              return { ...f, score: 0.0 };
            }
            return f;
          });
          return { ...state, files: nextFiles };
        },
        async execute(state, { filePath }) {
          if (fs.existsSync(filePath)) {
            const content = fs.readFileSync(filePath, 'utf-8');
            const optimized = content
              .replace(/\/\/.*/g, '')
              .replace(/\/\*[\s\S]*?\*\//g, '')
              .replace(/console\.log.*?;?/g, '')
              .split('\n')
              .map(line => line.trimEnd())
              .filter(line => line.trim().length > 0)
              .join('\n');

            fs.writeFileSync(filePath, optimized, 'utf-8');
            antonInstance.log(`OPTIMIZED asset in place: ${filePath}`);
          }
          const nextFiles = state.files.map(f => {
            if (f.filePath === filePath) {
              return { ...f, score: 0.0 };
            }
            return f;
          });
          return { ...state, files: nextFiles };
        }
      }
    ]
  });
}

// Helper scanner to populate environment state
function scanDirectory(dir) {
  let results = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== 'node_modules' && !entry.name.startsWith('.')) {
        results = results.concat(scanDirectory(fullPath));
      }
    } else if (entry.isFile()) {
      const content = fs.readFileSync(fullPath, 'utf-8');
      const lines = content.split('\n');

      let noiseCount = 0;
      lines.forEach(line => {
        const t = line.trim();
        if (t.startsWith('//') || t.includes('console.log') || t === '') {
          noiseCount++;
        }
      });

      const score = lines.length > 0 ? noiseCount / lines.length : 1.0;
      results.push({ filePath: fullPath, score });
    }
  }
  return results;
}

// ============================================================================
// Execution Example
// ============================================================================

if (require.main === module) {
  (async () => {
    const target = process.argv[2] || './src';
    const anton = new SonOfAnton({ aggressiveness: 0.5 });

    if (!fs.existsSync(target)) {
      fs.mkdirSync(target, { recursive: true });
      fs.writeFileSync(path.join(target, 'bloated_test.js'), '// TODO: delete this\nconsole.log("debug noise");\nconst x = 1;\n');
    }

    registerCodebaseCapability(anton, target);

    const initialState = {
      files: scanDirectory(target)
    };

    anton.log(`Initializing Son of Anton scan on: ${target}`);

    const plan = anton.plan({
      domain: "codebase",
      state: initialState,
      goal: {}
    });

    anton.log(`Generated optimization plan with ${plan.steps.length} steps.`);

    await anton.execute({
      plan,
      state: initialState,
      approve: async (actionDetails) => {
        anton.log(`Autonomous Authorization Granted for action: ${actionDetails.action} on ${actionDetails.params.filePath}`);
        return true;
      }
    });

    anton.log("Autonomous cycle complete.");
  })();
}

module.exports = { SonOfAnton };
