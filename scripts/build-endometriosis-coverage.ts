#!/usr/bin/env npx tsx

import { buildCoverageManifest } from "./coverage/buildManifest";
import { ENDOMETRIOSIS_COVERAGE_CONFIG } from "./coverage/endometriosisConfig";

buildCoverageManifest(ENDOMETRIOSIS_COVERAGE_CONFIG);
