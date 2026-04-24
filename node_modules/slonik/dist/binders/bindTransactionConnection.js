"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.bindTransactionConnection = void 0;
const any_1 = require("../connectionMethods/any");
const anyFirst_1 = require("../connectionMethods/anyFirst");
const exists_1 = require("../connectionMethods/exists");
const many_1 = require("../connectionMethods/many");
const manyFirst_1 = require("../connectionMethods/manyFirst");
const maybeOne_1 = require("../connectionMethods/maybeOne");
const maybeOneFirst_1 = require("../connectionMethods/maybeOneFirst");
const nestedTransaction_1 = require("../connectionMethods/nestedTransaction");
const one_1 = require("../connectionMethods/one");
const oneFirst_1 = require("../connectionMethods/oneFirst");
const query_1 = require("../connectionMethods/query");
const stream_1 = require("../connectionMethods/stream");
const state_1 = require("../state");
const bindTransactionConnection = (parentLog, connection, clientConfiguration, transactionDepth) => {
    const poolClientState = (0, state_1.getPoolClientState)(connection);
    const assertTransactionDepth = () => {
        if (transactionDepth !== poolClientState.transactionDepth) {
            throw new Error('Cannot run a query using parent transaction.');
        }
    };
    return {
        any: (slonikSql) => {
            assertTransactionDepth();
            return (0, any_1.any)(parentLog, connection, clientConfiguration, slonikSql);
        },
        anyFirst: (slonikSql) => {
            assertTransactionDepth();
            return (0, anyFirst_1.anyFirst)(parentLog, connection, clientConfiguration, slonikSql);
        },
        exists: async (slonikSql) => {
            assertTransactionDepth();
            return await (0, exists_1.exists)(parentLog, connection, clientConfiguration, slonikSql);
        },
        many: (slonikSql) => {
            assertTransactionDepth();
            return (0, many_1.many)(parentLog, connection, clientConfiguration, slonikSql);
        },
        manyFirst: (slonikSql) => {
            assertTransactionDepth();
            return (0, manyFirst_1.manyFirst)(parentLog, connection, clientConfiguration, slonikSql);
        },
        maybeOne: (slonikSql) => {
            assertTransactionDepth();
            return (0, maybeOne_1.maybeOne)(parentLog, connection, clientConfiguration, slonikSql);
        },
        maybeOneFirst: (slonikSql) => {
            assertTransactionDepth();
            return (0, maybeOneFirst_1.maybeOneFirst)(parentLog, connection, clientConfiguration, slonikSql);
        },
        one: (slonikSql) => {
            assertTransactionDepth();
            return (0, one_1.one)(parentLog, connection, clientConfiguration, slonikSql);
        },
        oneFirst: (slonikSql) => {
            assertTransactionDepth();
            return (0, oneFirst_1.oneFirst)(parentLog, connection, clientConfiguration, slonikSql);
        },
        query: (slonikSql) => {
            assertTransactionDepth();
            return (0, query_1.query)(parentLog, connection, clientConfiguration, slonikSql);
        },
        stream: async (slonikSql, streamHandler) => {
            assertTransactionDepth();
            return await (0, stream_1.stream)(parentLog, connection, clientConfiguration, slonikSql, streamHandler);
        },
        transaction: async (handler, transactionRetryLimit) => {
            assertTransactionDepth();
            return await (0, nestedTransaction_1.nestedTransaction)(parentLog, connection, clientConfiguration, handler, transactionDepth, transactionRetryLimit);
        },
    };
};
exports.bindTransactionConnection = bindTransactionConnection;
//# sourceMappingURL=bindTransactionConnection.js.map