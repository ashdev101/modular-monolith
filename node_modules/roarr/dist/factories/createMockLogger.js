"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createMockLogger = void 0;
// Mock logger level methods are no-ops - no need for child logger creation
const noopLevelMethod = () => {
    return undefined;
};
const createMockLogger = (onMessage, parentContext) => {
    // eslint-disable-next-line unicorn/consistent-function-scoping
    const log = () => {
        return undefined;
    };
    log.adopt = async (routine) => {
        return routine();
    };
    log.child = () => {
        return (0, exports.createMockLogger)(onMessage, parentContext);
    };
    log.getContext = () => {
        return {};
    };
    // All level methods are no-ops for mock logger - no child logger needed
    log.debug = noopLevelMethod;
    log.debugOnce = noopLevelMethod;
    log.error = noopLevelMethod;
    log.errorOnce = noopLevelMethod;
    log.fatal = noopLevelMethod;
    log.fatalOnce = noopLevelMethod;
    log.info = noopLevelMethod;
    log.infoOnce = noopLevelMethod;
    log.trace = noopLevelMethod;
    log.traceOnce = noopLevelMethod;
    log.warn = noopLevelMethod;
    log.warnOnce = noopLevelMethod;
    return log;
};
exports.createMockLogger = createMockLogger;
//# sourceMappingURL=createMockLogger.js.map