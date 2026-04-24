"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createTimestampTypeParser = void 0;
const timestampParser = (value) => {
    if (value === 'infinity') {
        return Number.POSITIVE_INFINITY;
    }
    if (value === '-infinity') {
        return Number.NEGATIVE_INFINITY;
    }
    return value === null ? value : Date.parse(value + ' UTC');
};
const createTimestampTypeParser = () => {
    return {
        name: 'timestamp',
        parse: timestampParser,
    };
};
exports.createTimestampTypeParser = createTimestampTypeParser;
//# sourceMappingURL=createTimestampTypeParser.js.map