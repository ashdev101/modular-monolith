"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const stripArrayNotation_1 = require("./stripArrayNotation");
const ava_1 = __importDefault(require("ava"));
(0, ava_1.default)('strips array notation', (t) => {
    t.is((0, stripArrayNotation_1.stripArrayNotation)('foo'), 'foo');
    t.is((0, stripArrayNotation_1.stripArrayNotation)('foo[]'), 'foo');
    t.is((0, stripArrayNotation_1.stripArrayNotation)('foo[][]'), 'foo');
});
//# sourceMappingURL=stripArrayNotation.test.js.map