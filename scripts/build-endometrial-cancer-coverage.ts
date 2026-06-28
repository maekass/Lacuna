#!/usr/bin/env npx tsx

import { buildCoverageManifest } from "./coverage/buildManifest";
import { ENDOMETRIAL_CANCER_COVERAGE_CONFIG } from "./coverage/endometrialCancerConfig";

buildCoverageManifest(ENDOMETRIAL_CANCER_COVERAGE_CONFIG);
