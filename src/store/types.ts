// ── Data-model interfaces for the architecture visualization app ──

/** Test result within an interface requirement */
export interface TestResult {
  name: string;
  status: "pass" | "fail" | "pending";
}

/** Requirement attached to an interface, with its associated tests */
export interface InterfaceRequirement {
  id: string;
  tests: TestResult[];
}

/** Top-level requirement definition */
export interface Requirement {
  id: string;
  label: string;
}

/** Hierarchy node representing a system/subsystem */
export interface SystemNode {
  id: string;
  name: string;
  reqs: number;
  color: string;
  children?: SystemNode[];
}

/** Interface between two system nodes */
export interface Interface {
  id: string;
  source: string;
  target: string;
  name: string;
  desc: string;
  interfaceType: string;
  requirements: InterfaceRequirement[];
  dateCreated: string;
  dateLastUpdated: string;
  verificationStatus: "success" | "fail" | "unknown";
  maturityLevel: "verified" | "defined" | "concept";
  owner: string;
  team: string;
  progress: number;
}

/** Layout-positioned block (extends SystemNode with geometry) */
export interface PositionedBlock extends SystemNode {
  x: number;
  y: number;
  w: number;
  h: number;
  expanded: boolean;
  hasChildren: boolean;
}

/** Dot endpoint position for interface connections */
export interface DotPosition {
  id: string;
  cx: number;
  cy: number;
}

/** Assigned source/target dot pair for drawing a connection */
export interface DotAssignment {
  s: DotPosition;
  t: DotPosition;
}

/** Bounding rectangle for a pill (interface label on the canvas) */
export interface PillRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Single message in a chat conversation */
export interface ChatMessage {
  role: "user" | "ai";
  content: string;
  time: Date;
}

/** Chat conversation with metadata */
export interface Chat {
  id: string;
  name: string;
  timeAgo: string;
  date: string;
  messages: ChatMessage[];
}

/** Saved canvas view snapshot */
export interface SavedView {
  id: string;
  name: string;
  dragOffsets: Record<string, { dx: number; dy: number }>;
  pillOffsets: Record<string, { dx: number; dy: number }>;
  lineOffsets: Record<string, { dx: number; dy: number }>;
  dotOverrides: Record<string, { cx: number; cy: number }>;
  pan: { x: number; y: number };
  zoom: number;
  expanded: string[];
  focusId: string | null;
  revealed: string[];
  typeFilter: string[];
  createdAt: number;
}

/** Tab in the workbench panel */
export interface WorkbenchTab {
  id: string;
  type: string;
  parentIfaceId?: string;
}

/** Drag offset for a block */
export interface DragOffset {
  dx: number;
  dy: number;
}

/** Pill offset for an interface pill */
export interface PillOffset {
  dx: number;
  dy: number;
}
