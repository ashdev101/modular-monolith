"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const createSqlTag_1 = require("../createSqlTag");
const ava_1 = __importDefault(require("ava"));
const zod_1 = require("zod");
const sql = (0, createSqlTag_1.createSqlTag)();
(0, ava_1.default)('describes zod object associated with the query', (t) => {
    const zodObject = zod_1.z.object({
        id: zod_1.z.number(),
    });
    const query = sql.type(zodObject) `
    SELECT 1 id
  `;
    t.is(query.parser, zodObject);
});
//# sourceMappingURL=type.test.js.map