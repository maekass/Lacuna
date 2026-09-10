# MeshIC Autonomous Remediation Decisions

During the September 10, 2026 audit pass, remediation decisions follow these defaults:

- prefer withholding over unsupported fallback values;
- prefer primary-source identity/provenance validation over inferred mappings;
- preserve raw evidence and lineage while removing misleading labels;
- do not merge uncalibrated composite scores into decision surfaces;
- add CI gates for classes of errors already observed;
- keep changes isolated on the audit branch until checks pass.
