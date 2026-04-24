"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createBigintTypeParser = void 0;
// eslint-disable-next-line unicorn/prefer-native-coercion-functions
const bigintParser = (value) => {
    return BigInt(value);
};
const createBigintTypeParser = () => {
    return {
        name: 'int8',
        parse: bigintParser,
    };
};
exports.createBigintTypeParser = createBigintTypeParser;
//# sourceMappingURL=createBigintTypeParser.js.map