"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createTypeParserPreset = void 0;
const createBigintTypeParser_1 = require("./typeParsers/createBigintTypeParser");
const createDateTypeParser_1 = require("./typeParsers/createDateTypeParser");
const createIntervalTypeParser_1 = require("./typeParsers/createIntervalTypeParser");
const createNumericTypeParser_1 = require("./typeParsers/createNumericTypeParser");
const createTimestampTypeParser_1 = require("./typeParsers/createTimestampTypeParser");
const createTimestampWithTimeZoneTypeParser_1 = require("./typeParsers/createTimestampWithTimeZoneTypeParser");
const createTypeParserPreset = () => {
    return [
        (0, createBigintTypeParser_1.createBigintTypeParser)(),
        (0, createDateTypeParser_1.createDateTypeParser)(),
        (0, createIntervalTypeParser_1.createIntervalTypeParser)(),
        (0, createNumericTypeParser_1.createNumericTypeParser)(),
        (0, createTimestampTypeParser_1.createTimestampTypeParser)(),
        (0, createTimestampWithTimeZoneTypeParser_1.createTimestampWithTimeZoneTypeParser)(),
    ];
};
exports.createTypeParserPreset = createTypeParserPreset;
//# sourceMappingURL=createTypeParserPreset.js.map