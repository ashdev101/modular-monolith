"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const createSqlTag_1 = require("../createSqlTag");
const ava_1 = __importDefault(require("ava"));
const roarr_1 = require("roarr");
const zod_1 = require("zod");
const test = ava_1.default;
test.beforeEach((t) => {
    t.context.logs = [];
    roarr_1.ROARR.write = (message) => {
        t.context.logs.push(JSON.parse(message));
    };
});
test('describes zod object associated with the query', (t) => {
    const typeAliases = {
        id: zod_1.z.object({
            id: zod_1.z.number(),
        }),
    };
    const sql = (0, createSqlTag_1.createSqlTag)({
        typeAliases,
    });
    const query = sql.typeAlias('id') `
    SELECT 1 id
  `;
    t.is(query.parser, typeAliases.id);
});
test('cannot alias unknown fields', (t) => {
    const typeAliases = {
        id: zod_1.z.object({
            id: zod_1.z.number(),
        }),
    };
    const sql = (0, createSqlTag_1.createSqlTag)({
        typeAliases,
    });
    t.throws(() => {
        // @ts-expect-error - intentional
        sql.typeAlias('void') `
      SELECT 1 id
    `;
    });
});
//# sourceMappingURL=typeAlias.test.js.map