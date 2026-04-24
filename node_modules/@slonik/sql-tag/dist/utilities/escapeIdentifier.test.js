"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const escapeIdentifier_1 = require("./escapeIdentifier");
const ava_1 = __importDefault(require("ava"));
(0, ava_1.default)('escapes SQL identifiers', (t) => {
    t.is((0, escapeIdentifier_1.escapeIdentifier)('foo'), '"foo"');
    t.is((0, escapeIdentifier_1.escapeIdentifier)('foo bar'), '"foo bar"');
    t.is((0, escapeIdentifier_1.escapeIdentifier)('"foo"'), '"""foo"""');
});
//# sourceMappingURL=escapeIdentifier.test.js.map