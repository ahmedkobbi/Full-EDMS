"use strict";
/**
 * @smart-edms/types — licensing system (spec §12, §15.2)
 *
 * Purpose: model the full licensing server entity graph (Customer, Contact,
 * Product, Plan, License, Activation, Device, Heartbeat, etc.) plus the
 * signed license artifact formats (`.sedmslic`, `.sedmsreq`, `.sedmscrl`),
 * signing keys, license environments, and the full entitlement-module list.
 *
 * Critical rules (spec §12.4):
 *  - License artifacts are digitally signed with asymmetric cryptography.
 *  - The private key never leaves the KMS/HSM.
 *  - Signature verification fails closed.
 *  - The public key is embedded in on-premise backend and Electron client.
 */
Object.defineProperty(exports, "__esModule", { value: true });
//# sourceMappingURL=license.js.map