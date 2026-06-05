"use client";

import { useCallback, useReducer } from "react";
import type {
  Finding,
  InvestigationState,
  InvestigationSummary,
  ToolLogEntry,
  WSEvent,
} from "@/types";

type Action =
  | { type: "SET_ID"; id: string }
  | { type: "SET_STATUS"; status: InvestigationState["status"] }
  | { type: "TOOL_START"; tool: string }
  | { type: "TOOL_COMPLETE"; tool: string; duration_ms: number; output_hash?: string }
  | { type: "TOOL_ERROR"; tool: string; error: string }
  | { type: "FINDING_NEW"; finding: Finding }
  | { type: "FINDING_UPDATED"; finding: Finding }
  | { type: "SELF_CORRECTION"; finding_id: string; reason: string }
  | { type: "COMPLETE"; summary: InvestigationSummary };

const initial: InvestigationState = {
  id: null,
  status: "idle",
  findings: [],
  toolLog: [],
  summary: null,
};

function logId() {
  return Math.random().toString(36).slice(2, 10);
}

function reducer(state: InvestigationState, action: Action): InvestigationState {
  switch (action.type) {
    case "SET_ID":
      return { ...state, id: action.id };
    case "SET_STATUS":
      return { ...state, status: action.status };
    case "TOOL_START":
      return {
        ...state,
        toolLog: [
          ...state.toolLog,
          { id: logId(), tool: action.tool, timestamp: Date.now(), status: "running" },
        ],
      };
    case "TOOL_COMPLETE": {
      const log = state.toolLog.map((e) =>
        e.tool === action.tool && e.status === "running"
          ? { ...e, status: "complete" as const, duration_ms: action.duration_ms, output_hash: action.output_hash }
          : e
      );
      return { ...state, toolLog: log };
    }
    case "TOOL_ERROR": {
      const log = state.toolLog.map((e) =>
        e.tool === action.tool && e.status === "running"
          ? { ...e, status: "error" as const, note: action.error }
          : e
      );
      return { ...state, toolLog: log };
    }
    case "FINDING_NEW":
      return { ...state, findings: [...state.findings, action.finding] };
    case "FINDING_UPDATED":
      return {
        ...state,
        findings: state.findings.map((f) =>
          f.id === action.finding.id ? action.finding : f
        ),
      };
    case "SELF_CORRECTION": {
      const log: ToolLogEntry[] = [
        ...state.toolLog,
        {
          id: logId(),
          tool: "self-correction",
          timestamp: Date.now(),
          status: "running",
          note: action.reason,
        },
      ];
      return { ...state, toolLog: log };
    }
    case "COMPLETE":
      return { ...state, status: "complete", summary: action.summary };
    default:
      return state;
  }
}

export function useInvestigation() {
  const [state, dispatch] = useReducer(reducer, initial);

  const handleEvent = useCallback((event: WSEvent) => {
    switch (event.type) {
      case "tool_start":
        dispatch({ type: "TOOL_START", tool: event.tool });
        break;
      case "tool_complete":
        dispatch({ type: "TOOL_COMPLETE", tool: event.tool, duration_ms: event.duration_ms, output_hash: event.output_hash });
        break;
      case "tool_error":
        dispatch({ type: "TOOL_ERROR", tool: event.tool, error: event.error });
        break;
      case "finding_new":
        dispatch({ type: "FINDING_NEW", finding: event.finding });
        break;
      case "finding_updated":
        dispatch({ type: "FINDING_UPDATED", finding: event.finding });
        break;
      case "self_correction":
        dispatch({ type: "SELF_CORRECTION", finding_id: event.finding_id, reason: event.reason });
        break;
      case "investigation_complete":
        dispatch({ type: "COMPLETE", summary: event.summary });
        break;
    }
  }, []);

  return { state, handleEvent, dispatch };
}
