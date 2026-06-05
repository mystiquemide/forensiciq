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
import { type Finding, LABEL_COLORS } from "@/types";

interface Props {
  findings: Finding[];
}

function buildNodes(findings: Finding[]): Node[] {
  return findings.map((f, i) => {
    const color = LABEL_COLORS[f.label];
    const angle = (i / Math.max(findings.length, 1)) * 2 * Math.PI;
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
        width: 48 + f.confidence * 24,
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
      const sharedSources = a.sources.filter((s) => b.sources.includes(s));
      if (sharedSources.length > 0) {
        edges.push({
          id: `${a.id}-${b.id}`,
          source: a.id,
          target: b.id,
          style: { stroke: "#00D4B830", strokeWidth: 1 },
          animated: false,
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
    <div className="w-full h-full rounded-lg border border-border overflow-hidden">
      <ReactFlow
        nodes={nodes.map((n) => ({ ...n, data: { ...n.data, label: nodeLabel(n) } }))}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        fitView
        minZoom={0.3}
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
        style={{ background: "#0F1629" }}
      >
        <Background color="#1E2D4D" gap={40} size={1} />
        <Controls
          style={{ background: "#141D35", border: "1px solid #1E2D4D" }}
          showInteractive={false}
        />
      </ReactFlow>

      {findings.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center text-text-muted text-sm pointer-events-none">
          Evidence graph populates as tools run...
        </div>
      )}
    </div>
  );
}
