"use strict";
/* eslint-disable no-console */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const __1 = require("..");
const ava_1 = __importDefault(require("ava"));
const get_port_1 = __importDefault(require("get-port"));
const node_child_process_1 = require("node:child_process");
const node_crypto_1 = require("node:crypto");
const promises_1 = require("node:timers/promises");
const startTestContainer = async () => {
    const dockerContainerName = `slonik-test-${(0, node_crypto_1.randomUUID)()}`;
    const servicePort = await (0, get_port_1.default)();
    const dockerArgs = [
        'run',
        '--name',
        dockerContainerName,
        '--rm',
        '-e',
        'POSTGRES_HOST_AUTH_METHOD=trust',
        '-p',
        servicePort + ':5432',
        'postgres:14',
        '-N 1000',
    ];
    const dockerProcess = (0, node_child_process_1.spawn)('docker', dockerArgs);
    dockerProcess.on('error', (error) => {
        console.error(error);
    });
    dockerProcess.stdout.on('data', (data) => {
        console.log(data.toString());
    });
    dockerProcess.stderr.on('data', (data) => {
        console.error(data.toString());
    });
    dockerProcess.on('exit', (code) => {
        console.log(`Docker process exited with code ${code}`);
    });
    await new Promise((resolve) => {
        dockerProcess.stdout.on('data', (data) => {
            if (data
                .toString()
                .includes('database system is ready to accept connections')) {
                resolve(undefined);
            }
        });
    });
    await (0, promises_1.setTimeout)(1000);
    const terminate = () => {
        (0, node_child_process_1.execSync)(`docker kill ${dockerContainerName}`);
    };
    return {
        dsn: `postgresql://postgres@localhost:${servicePort}/postgres`,
        terminate,
    };
};
/**
 * @see https://github.com/brianc/node-postgres/issues/3083
 */
(0, ava_1.default)('handles unexpected backend termination', async (t) => {
    try {
        const output = (0, node_child_process_1.execSync)('docker --version', { encoding: 'utf8' });
        console.log('Docker CLI is available:', output.trim());
    }
    catch {
        console.log('Skipper the test. Docker CLI is not available.');
        return;
    }
    const { dsn, terminate } = await startTestContainer();
    const pool = await (0, __1.createPool)(dsn);
    // eslint-disable-next-line promise/prefer-await-to-then
    (0, promises_1.setTimeout)(1000).then(terminate);
    const error = await t.throwsAsync(pool.query(__1.sql.unsafe `SELECT pg_sleep(2)`));
    t.true(error instanceof __1.BackendTerminatedUnexpectedlyError);
});
//# sourceMappingURL=termination.test.js.map