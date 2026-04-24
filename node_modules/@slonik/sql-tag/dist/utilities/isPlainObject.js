"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isPlainObject = void 0;
const isPlainObject = (subject) => {
    if (typeof subject !== 'object' || subject === null) {
        return false;
    }
    const prototype = Object.getPrototypeOf(subject);
    return ((prototype === null ||
        prototype === Object.prototype ||
        Object.getPrototypeOf(prototype) === null) &&
        !(Symbol.toStringTag in subject) &&
        !(Symbol.iterator in subject));
};
exports.isPlainObject = isPlainObject;
//# sourceMappingURL=isPlainObject.js.map