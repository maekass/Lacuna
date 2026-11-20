import { readFileSync } from "node:fs";
import {
  DEFAULT_PEER_SCREEN_CONFIG_PATH,
  type PeerScreenConfig,
  peerScreenConfigSchema,
} from "@/lib/payerOps/codingJudgment/config";
import { sha256Text } from "@/lib/payerOps/codingJudgment/agent";

/** Read and validate a peer-screen config file; returns it with its hash. */
export function loadPeerScreenConfig(
  path: string = DEFAULT_PEER_SCREEN_CONFIG_PATH,
): { config: PeerScreenConfig; sha256: string; path: string } {
  const text = readFileSync(path, "utf8");
  return {
    config: peerScreenConfigSchema.parse(JSON.parse(text)),
    sha256: sha256Text(text),
    path,
  };
}
