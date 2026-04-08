// ── Seed data for the architecture visualization app ──

import type { SystemNode, Requirement, Interface, Chat } from "./types";
import { COLORS } from "./constants";

export const initialHierarchy: SystemNode[] = [
  { id: "du42", name: "du42", reqs: 1, color: COLORS.yellow },
  { id: "ground-station", name: "Ground Station", reqs: 0, color: COLORS.yellow },
  {
    id: "launch-vehicle", name: "Launch Vehicle", reqs: 42, color: COLORS.orange,
    children: [
      {
        id: "stage-1", name: "Stage 1", reqs: 12, color: COLORS.blue,
        children: [
          { id: "s1-avionics", name: "Avionics", reqs: 3, color: COLORS.orange },
          { id: "s1-payload", name: "Payload", reqs: 1, color: COLORS.green },
          { id: "s1-propulsion", name: "Propulsion system", reqs: 4, color: COLORS.blue },
          { id: "s1-structures", name: "Structures", reqs: 1, color: COLORS.orange },
        ],
      },
      {
        id: "stage-2", name: "Stage 2", reqs: 20, color: COLORS.orange,
        children: [
          { id: "s2-avionics", name: "Avionics", reqs: 7, color: COLORS.green },
          { id: "s2-payload-fairing", name: "Payload fairing", reqs: 3, color: COLORS.orange },
          { id: "s2-propulsion", name: "Propulsion system", reqs: 6, color: COLORS.blue },
          { id: "s2-separation", name: "Separation system", reqs: 0, color: COLORS.blue },
          { id: "s2-structures", name: "Structures", reqs: 1, color: COLORS.orange },
          { id: "s2-attitude", name: "Attitude control", reqs: 0, color: COLORS.yellow },
          { id: "s2-navigation", name: "Navigation system", reqs: 0, color: COLORS.orange },
          { id: "s2-data-handling", name: "Data handling", reqs: 0, color: COLORS.blue },
        ],
      },
    ],
  },
  { id: "example", name: "Example", reqs: 0, color: COLORS.gray },
];

export const initRequirements: Requirement[] = [
  { id: "REQ-62", label: "First stage thermal" },
  { id: "REQ-67", label: "Baseline structural" },
  { id: "REQ-78", label: "Avionics comms" },
  { id: "REQ-101", label: "Navigation accuracy" },
  { id: "REQ-110", label: "Propulsion safety" },
];

export const initIfaces: Interface[] = [
  {
    id: "INT-1", source: "stage-1", target: "ground-station", name: "Stage 1 \u2192 Ground Stn",
    desc: "Telemetry downlink from Stage 1 to Ground Station", interfaceType: "Signal",
    requirements: [
      { id: "REQ-78", tests: [{ name: "Telemetry link budget test", status: "pass" }, { name: "End-to-end signal path verification", status: "pass" }] },
    ],
    dateCreated: "2024-12-08", dateLastUpdated: "2025-08-10", verificationStatus: "success",
    maturityLevel: "verified", owner: "Yoon Bae", team: "Yoon flow test", progress: 85,
  },
  {
    id: "INT-2", source: "ground-station", target: "stage-2", name: "Ground Stn \u2192 Stage 2",
    desc: "Command uplink to Stage 2", interfaceType: "Signal",
    requirements: [],
    dateCreated: "2025-03-26", dateLastUpdated: "2025-10-14", verificationStatus: "unknown",
    maturityLevel: "defined", owner: "", team: "Yoon flow test", progress: 40,
  },
  {
    id: "INT-3", source: "s1-avionics", target: "s1-propulsion", name: "Avionics \u2192 Propulsion",
    desc: "Engine control commands and thrust vector data", interfaceType: "Mechanical",
    requirements: [
      { id: "REQ-110", tests: [{ name: "Thrust vector control loop test", status: "pass" }, { name: "Engine start sequence validation", status: "pass" }] },
    ],
    dateCreated: "2025-05-12", dateLastUpdated: "2025-08-10", verificationStatus: "success",
    maturityLevel: "verified", owner: "Yoon Bae", team: "Propulsion team", progress: 100,
  },
  {
    id: "INT-5", source: "example", target: "stage-2", name: "Example \u2192 Stage 2",
    desc: "", interfaceType: "",
    requirements: [],
    dateCreated: "2024-12-02", dateLastUpdated: "2025-08-10", verificationStatus: "unknown",
    maturityLevel: "concept", owner: "", team: "", progress: 0,
  },
  {
    id: "INT-6", source: "s1-propulsion", target: "s1-structures", name: "Propulsion \u2192 Structures",
    desc: "Thrust load transfer interface", interfaceType: "Mechanical",
    requirements: [
      { id: "REQ-62", tests: [{ name: "Static fire load measurement", status: "fail" }] },
      { id: "REQ-67", tests: [{ name: "Structural margin analysis", status: "pending" }] },
    ],
    dateCreated: "2024-11-15", dateLastUpdated: "2025-07-22", verificationStatus: "fail",
    maturityLevel: "defined", owner: "Yoon Bae", team: "Structures team", progress: 55,
  },
  {
    id: "INT-7", source: "s2-avionics", target: "s2-propulsion", name: "S2 Avio \u2192 S2 Propulsion",
    desc: "Flight computer to engine controller", interfaceType: "Electrical",
    requirements: [
      { id: "REQ-78", tests: [{ name: "Electrical continuity test", status: "pass" }, { name: "Command latency benchmark", status: "pass" }] },
    ],
    dateCreated: "2025-01-10", dateLastUpdated: "2025-06-18", verificationStatus: "success",
    maturityLevel: "verified", owner: "Yoon Bae", team: "Avionics team", progress: 90,
  },
  {
    id: "INT-8", source: "s2-propulsion", target: "s2-structures", name: "S2 Propulsion \u2192 Structures",
    desc: "Upper stage thrust loads", interfaceType: "Mechanical",
    requirements: [
      { id: "REQ-67", tests: [] },
    ],
    dateCreated: "2025-02-05", dateLastUpdated: "2025-09-03", verificationStatus: "unknown",
    maturityLevel: "defined", owner: "", team: "Structures team", progress: 30,
  },
  {
    id: "INT-9", source: "s1-avionics", target: "s1-payload", name: "Avionics \u2192 Payload",
    desc: "Payload telemetry relay", interfaceType: "Signal",
    requirements: [],
    dateCreated: "2025-04-20", dateLastUpdated: "2025-04-20", verificationStatus: "unknown",
    maturityLevel: "concept", owner: "", team: "", progress: 10,
  },
  {
    id: "INT-10", source: "s2-avionics", target: "s2-navigation", name: "S2 Avio \u2192 Navigation",
    desc: "Inertial navigation data feed", interfaceType: "Signal",
    requirements: [
      { id: "REQ-101", tests: [{ name: "INS drift rate validation", status: "pass" }] },
    ],
    dateCreated: "2025-03-14", dateLastUpdated: "2025-08-29", verificationStatus: "success",
    maturityLevel: "verified", owner: "Yoon Bae", team: "Navigation team", progress: 75,
  },
  {
    id: "INT-11", source: "s2-navigation", target: "s2-attitude", name: "Navigation \u2192 Attitude Ctrl",
    desc: "Attitude correction commands from nav system", interfaceType: "Signal",
    requirements: [
      { id: "REQ-101", tests: [{ name: "Attitude loop response test", status: "fail" }] },
    ],
    dateCreated: "2025-05-01", dateLastUpdated: "2025-10-07", verificationStatus: "fail",
    maturityLevel: "concept", owner: "", team: "GNC team", progress: 20,
  },
  {
    id: "INT-12", source: "s2-avionics", target: "s2-data-handling", name: "S2 Avio \u2192 Data Handling",
    desc: "Onboard data bus interface", interfaceType: "Electrical",
    requirements: [
      { id: "REQ-78", tests: [{ name: "Bus throughput stress test", status: "pending" }] },
    ],
    dateCreated: "2025-06-12", dateLastUpdated: "2025-06-12", verificationStatus: "unknown",
    maturityLevel: "defined", owner: "Yoon Bae", team: "Avionics team", progress: 50,
  },
  {
    id: "INT-13", source: "s2-separation", target: "s2-structures", name: "Separation \u2192 Structures",
    desc: "Stage separation mechanism mounting", interfaceType: "Mechanical",
    requirements: [
      { id: "REQ-67", tests: [{ name: "Separation shock test", status: "pass" }] },
      { id: "REQ-110", tests: [{ name: "Bolt cutter pyro validation", status: "pass" }] },
    ],
    dateCreated: "2025-01-28", dateLastUpdated: "2025-07-15", verificationStatus: "success",
    maturityLevel: "defined", owner: "Yoon Bae", team: "Structures team", progress: 65,
  },
  {
    id: "INT-14", source: "s2-payload-fairing", target: "s2-structures", name: "Fairing \u2192 Structures",
    desc: "Fairing attachment points", interfaceType: "Mechanical",
    requirements: [
      { id: "REQ-62", tests: [] },
    ],
    dateCreated: "2025-03-05", dateLastUpdated: "2025-09-20", verificationStatus: "unknown",
    maturityLevel: "concept", owner: "", team: "Structures team", progress: 15,
  },
  {
    id: "INT-24", source: "stage-1", target: "stage-2", name: "Stage 1 \u2192 Stage 2",
    desc: "Inter-stage structural and electrical interface", interfaceType: "Mechanical",
    requirements: [
      { id: "REQ-78", tests: [{ name: "Inter-stage separation test", status: "pass" }] },
      { id: "REQ-67", tests: [{ name: "Structural load path analysis", status: "pass" }] },
    ],
    dateCreated: "2024-12-08", dateLastUpdated: "2025-08-10", verificationStatus: "success",
    maturityLevel: "verified", owner: "Yoon Bae", team: "Integration team", progress: 95,
  },
  {
    id: "INT-25", source: "stage-2", target: "stage-1", name: "Stage 2 \u2192 Stage 1",
    desc: "Staging separation signal", interfaceType: "Signal",
    requirements: [
      { id: "REQ-110", tests: [{ name: "Staging signal timing test", status: "fail" }] },
    ],
    dateCreated: "2025-03-26", dateLastUpdated: "2025-10-14", verificationStatus: "fail",
    maturityLevel: "defined", owner: "", team: "Integration team", progress: 35,
  },
  {
    id: "INT-30", source: "s1-avionics", target: "s2-avionics", name: "S1 Avio \u2192 S2 Avio",
    desc: "Cross-stage avionics data link", interfaceType: "Signal",
    requirements: [
      { id: "REQ-78", tests: [] },
    ],
    dateCreated: "2025-05-28", dateLastUpdated: "2025-05-28", verificationStatus: "unknown",
    maturityLevel: "concept", owner: "", team: "Avionics team", progress: 5,
  },
  {
    id: "INT-31", source: "du42", target: "ground-station", name: "du42 \u2192 Ground Stn",
    desc: "External data uplink", interfaceType: "Electrical",
    requirements: [
      { id: "REQ-67", tests: [{ name: "Uplink bandwidth test", status: "fail" }, { name: "Protocol compliance check", status: "pass" }] },
    ],
    dateCreated: "2025-02-19", dateLastUpdated: "2025-05-18", verificationStatus: "success",
    maturityLevel: "verified", owner: "Yoon Bae", team: "Ground ops", progress: 80,
  },
];

export const initialChatList: Chat[] = [
  {
    id: "c1", name: "PDR changes", timeAgo: "now", date: "20 Jan 2026, 11:28",
    messages: [
      { role: "user", content: "What changed in the latest PDR review?", time: new Date("2026-01-20T11:20:00") },
      { role: "ai", content: "The latest PDR review updated three interface definitions: du42 \u2192 Ground Station now uses Signal type instead of Mechanical, the Stage 1 \u2192 Stage 2 link added two new requirements (REQ-80, REQ-81), and the Avionics \u2192 Propulsion interface maturity was promoted from Defined to Verified.", time: new Date("2026-01-20T11:21:00") },
      { role: "user", content: "Are there any conflicts with the propulsion branch?", time: new Date("2026-01-20T11:24:00") },
      { role: "ai", content: "Yes \u2014 the pdr-propulsion-main branch modified the same Avionics \u2192 Propulsion interface. It kept the maturity at Defined and added a different requirement (REQ-85). You'll need to resolve the maturity conflict and decide whether to keep both REQ-81 and REQ-85 or merge them.", time: new Date("2026-01-20T11:25:00") },
    ],
  },
  {
    id: "c2", name: "Missing requirements", timeAgo: "1h", date: "20 Jan 2026, 11:28",
    messages: [
      { role: "user", content: "Which interfaces are missing requirements?", time: new Date("2026-01-20T10:30:00") },
      { role: "ai", content: "I found 3 interfaces with no requirements assigned:\n\n1. Ground Stn \u2192 Stage 2 \u2014 no requirements\n2. S1 Avio \u2192 S2 Avio \u2014 no requirements\n3. Avionics \u2192 Payload \u2014 no requirements\n\nAll other interfaces have at least one requirement linked.", time: new Date("2026-01-20T10:31:00") },
    ],
  },
];
