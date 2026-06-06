"use client";

import { useCallback, useEffect } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Network } from "lucide-react";
import { type Finding, LABEL_COLORS } from "@/types";

interface Props {
  findings: Finding[];
}

function buildNodes(findings: Finding[]): Node[] {
  return findings.map((f, i) => {
    const color = LABEL_COLORS[f.label];
    const angle  = (i / Math.max(findings.length, 1)) * 2 * Math.PI;
    const radius = Math.min(180, 60 + findings.length * 15);
    return {
      id: f.id,
      position: {
        x: 300 + radius * Math.cos(angle),
        y: 200 + radius * Math.sin(angle),
      },
      data: { label: f.label, confidence: f.confidence, description: f.description },
      style: {
        background: `${color}18`,
        border: `1.5px solid ${color}60`,
        borderRadius: "50%",
        width:  48 + f.confidence * 24,
        height: 48 + f.confidence * 24,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color,
        fontSize: "10px",
        fontFamily: "JetBrains Mono, monospace",
        fontWeight: 500,
        cursor: "default",
        boxShadow: `0 0 12px ${color}22`,
      },
      draggable: true,
    };
  });
}

function buildEdges(findings: Finding[]): Edge[] {
  const edges: Edge[] = [];
  for (let i = 0; i < findings.length; i++) {
    for (let j = i + 1; j < findings.length; j++) {
      const a = findings[i];
      const b = findings[j];
      if (a.sources.some((s) => b.sources.includes(s))) {
        edges.push({
          id: `${a.id}-${b.id}`,
          source: a.id,
          target: b.id,
          style: { stroke: "#00D4B830", strokeWidth: 1 },
        });
      }
    }
  }
  return edges;
}

export default function EvidenceGraph({ findings }: Props) {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  useEffect(() => {
    setNodes(buildNodes(findings));
    setEdges(buildEdges(findings));
  }, [findings, setNodes, setEdges]);

  const nodeLabel = useCallback((node: Node) => {
    const pct = Math.round((node.data.confidence as number) * 100);
    return `${node.data.label as string}\n${pct}%`;
  }, []);

  return (
    <div className="relative w-full h-full">
      <ReactFlow
        nodes={nodes.map((n) => ({ ...n, data: { ...n.data, label: nodeLabel(n) } }))}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        fitView
        minZoom={0.3}
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
        style={{ background: "#0A0E1A" }}
      >
        <Background color="#1E2D4D" gap={40} size={1} />
        <Controls
          showInteractive={false}
          className="!bg-bg-2 !border-border [&>button]:!bg-bg-2 [&>button]:!border-border [&>button]:!text-text-secondary [&>button:hover]:!bg-bg-3 [&>button]:!fill-text-secondary"
        />
      </ReactFlow>

      {findings.length === 0 && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 pointer-events-none">
          {/* Animated radar background */}
          <svg viewBox="0 0 320 320" width="320" height="320" className="absolute opacity-[0.06]" aria-hidden="true">
            <circle cx="160" cy="160" r="150" fill="none" stroke="#00D4B8" strokeWidth="1" strokeDasharray="10 7"
              style={{ transformOrigin: "160px 160px", animation: "spin-reverse 28s linear infinite" }} />
            <circle cx="160" cy="160" r="112" fill="none" stroke="#00D4B8" strokeWidth="1" strokeDasharray="16 9"
              style={{ transformOrigin: "160px 160px", animation: "spin 20s linear infinite" }} />
            <circle cx="160" cy="160" r="76" fill="none" stroke="#00D4B8" strokeWidth="1.5" />
            <line x1="160" y1="160" x2="160" y2="12" stroke="#00D4B8" strokeWidth="1.5"
              style={{ transformOrigin: "160px 160px", animation: "radar-sweep 6s linear infinite" }} />
            <line x1="160" y1="8"   x2="160" y2="20"  stroke="#00D4B8" strokeWidth="1" />
            <line x1="160" y1="300" x2="160" y2="312" stroke="#00D4B8" strokeWidth="1" />
            <line x1="8"   y1="160" x2="20"  y2="160" stroke="#00D4B8" strokeWidth="1" />
            <line x1="300" y1="160" x2="312" y2="160" stroke="#00D4B8" strokeWidth="1" />
            <circle cx="160" cy="160" r="38" fill="none" stroke="#00D4B8" strokeWidth="2"
              style={{ transformOrigin: "160px 160px", animation: "spin-reverse 8s linear infinite" }} />
            <circle cx="160" cy="160" r="5" fill="#00D4B8" />
          </svg>
          <Network size={24} className="text-teal opacity-30 relative z-10" />
          <p className="text-text-muted text-xs font-mono relative z-10">Evidence graph populates as tools run...</p>
        </div>
      )}
    </div>
  );
}
