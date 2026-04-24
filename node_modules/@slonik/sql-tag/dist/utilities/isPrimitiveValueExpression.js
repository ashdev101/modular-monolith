"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isPrimitiveValueExpression = void 0;
const isPrimitiveValueExpression = (maybe) => {
    return (typeof maybe === 'string' ||
        typeof maybe === 'number' ||
        typeof maybe === 'boolean' ||
        typeof maybe === 'bigint' ||
        maybe === null);
};
exports.isPrimitiveValueExpression = isPrimitiveValueExpression;
//# sourceMappingURL=isPrimitiveValueExpression.js.map