"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Card from "@/components/ui/Card";

interface ToolLink {
  name: string;
  description: string;
  href: string;
  type: "docs" | "api" | "sdk" | "repo";
}

const TOOLS: ToolLink[] = [
  {
    name: "API Reference",
    description:
      "REST API documentation for dataset access and Gamma integration",
    href: "/api/docs",
    type: "api",
  },
  {
    name: "Dataset JSON",
    description: "Direct access to verified dataset in JSON format",
    href: "/api/dataset/verified",
    type: "api",
  },
  {
    name: "Python API (FastAPI + GraphQL)",
    description:
      "Local sidecar — REST, OpenAPI, and GraphQL for dataset + trials (port 8000)",
    href: "http://localhost:8000/docs",
    type: "api",
  },
  {
    name: ".NET API (ASP.NET Core + EF)",
    description:
      "Local sidecar — REST, Swagger, and EF Core for dataset + research studies (port 8001)",
    href: "http://localhost:8001/swagger",
    type: "api",
  },
  {
    name: "GitHub Repository",
    description: "Source code, issues, and contribution guidelines",
    href: "https://github.com/maekass/Lacuna",
    type: "repo",
  },
  {
    name: "MODEL_CARD.md",
    description: "Methodology and limitations for Exit Predictor scoring",
    href: "https://github.com/maekass/Lacuna/blob/main/docs/MODEL_CARD.md",
    type: "docs",
  },
  {
    name: "Gamma API Docs",
    description: "External documentation for presentation generation API",
    href: "https://developers.gamma.app",
    type: "api",
  },
  {
    name: "ClinicalTrials.gov API",
    description: "NIH clinical trial search API v2 documentation",
    href: "https://clinicaltrials.gov/api",
    type: "api",
  },
];

const CODE_EXAMPLES = [
  {
    language: "TypeScript",
    title: "Fetch Verified Dataset",
    code: `const response = await fetch(
  'https://lacuna-maekass.vercel.app/api/dataset/verified'
);
const data = await response.json();
console.log(\`\${data.acquisitions.length} verified deals\`);`,
  },
  {
    language: "Python",
    title: "GraphQL Dataset Summary",
    code: `import httpx

# Local FastAPI sidecar (npm run python-api:dev)
response = httpx.post(
    "http://localhost:8000/graphql",
    json={"query": "{ datasetSummary { acquisitionCount } }"},
)
print(response.json())`,
  },
  {
    language: "curl",
    title: "Quick API Test",
    code: `curl -s https://lacuna-maekass.vercel.app/api/dataset/verified | \\
  jq '.provenance'`,
  },
];

function ToolCard({ tool }: { tool: ToolLink }) {
  const typeColors = {
    docs: "bg-blue-100 text-blue-800 border-blue-200",
    api: "bg-violet-100 text-violet-800 border-violet-200",
    sdk: "bg-emerald-100 text-emerald-800 border-emerald-200",
    repo: "bg-slate-100 text-slate-800 border-slate-200",
  };

  const typeLabels = {
    docs: "Docs",
    api: "API",
    sdk: "SDK",
    repo: "Repo",
  };

  return (
    <a
      href={tool.href}
      target={tool.href.startsWith("http") ? "_blank" : undefined}
      rel={tool.href.startsWith("http") ? "noopener noreferrer" : undefined}
      className="block p-4 bg-white rounded-lg border border-lacuna-lavender/30 hover:border-lacuna-lavender/60 hover:shadow-sm transition-all"
    >
      <div className="flex items-start justify-between">
        <div>
          <h4 className="font-medium text-lacuna-plum">{tool.name}</h4>
          <p className="text-sm text-lacuna-blue mt-1">{tool.description}</p>
        </div>
        <span
          className={`px-2 py-1 rounded text-xs font-medium border ${
            typeColors[tool.type]
          }`}
        >
          {typeLabels[tool.type]}
        </span>
      </div>
    </a>
  );
}

export default function DeveloperTools() {
  const [activeTab, setActiveTab] = useState<"tools" | "examples">("tools");
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const copyCode = (code: string, index: number) => {
    navigator.clipboard.writeText(code);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div className="space-y-4">
      <Card>
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-lacuna-plum">
            Developer Tools
          </h3>
          <p className="text-sm text-lacuna-blue">
            API documentation, SDK references, and code examples for engineers
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setActiveTab("tools")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === "tools"
                ? "bg-lacuna-plum text-white"
                : "bg-lacuna-lavender/25 text-lacuna-plum hover:bg-lacuna-lavender/40"
            }`}
          >
            Resources
          </button>
          <button
            onClick={() => setActiveTab("examples")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === "examples"
                ? "bg-lacuna-plum text-white"
                : "bg-lacuna-lavender/25 text-lacuna-plum hover:bg-lacuna-lavender/40"
            }`}
          >
            Code Examples
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === "tools" && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-1 md:grid-cols-2 gap-3"
          >
            {TOOLS.map((tool) => <ToolCard key={tool.name} tool={tool} />)}
          </motion.div>
        )}

        {activeTab === "examples" && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            {CODE_EXAMPLES.map((example, idx) => (
              <div
                key={example.title}
                className="bg-slate-900 rounded-lg overflow-hidden"
              >
                <div className="flex items-center justify-between px-4 py-2 bg-slate-800 border-b border-slate-700">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-slate-300">
                      {example.language}
                    </span>
                    <span className="text-xs text-slate-500">·</span>
                    <span className="text-xs text-slate-400">
                      {example.title}
                    </span>
                  </div>
                  <button
                    onClick={() => copyCode(example.code, idx)}
                    className="text-xs text-slate-400 hover:text-white transition-colors"
                  >
                    {copiedIndex === idx ? "Copied!" : "Copy"}
                  </button>
                </div>
                <pre className="p-4 overflow-x-auto">
                  <code className="text-sm text-slate-300 font-mono">{example.code}</code>
                </pre>
              </div>
            ))}
          </motion.div>
        )}

        <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-xs text-blue-800">
            <strong>Engineering Note:</strong>{" "}
            All API endpoints are versioned and follow REST conventions. The
            dataset is immutable between releases — check the{" "}
            <code className="bg-blue-100 px-1 rounded">provenance</code>{" "}
            field for version and last-updated timestamps.
          </p>
        </div>
      </Card>
    </div>
  );
}
