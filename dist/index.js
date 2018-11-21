"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client = require("socket.io-client");
const events_1 = require("events");
function toBuffer(ab) {
    var buf = new Buffer(ab.byteLength);
    var view = new Uint8Array(ab);
    for (var i = 0; i < buf.length; ++i) {
        buf[i] = view[i];
    }
    return buf;
}
const isBrowser = new Function('try {return this===window;}catch(e){ return false;}');
if (isBrowser()) {
    window.Socket = client;
}
else {
    global.Socket = client;
}
class SerialPortSocket extends events_1.EventEmitter {
    constructor(address, options) {
        super();
        this.socket = client(address, options);
        this.socket.on('connect', () => this.emit('online'));
        this.socket.on('disconnect', () => this.emit('offline'));
        this.socket.on('port-open', (portName) => {
            this.emit(`${portName}-port-open`);
        });
        this.socket.on('port-close', (portName) => {
            this.emit(`${portName}-port-close`);
        });
        this.socket.on('port-data', (portName, data) => {
            if (isBrowser()) {
                if (typeof data === 'string') {
                    this.emit(`${portName}-port-data`, data);
                }
                else if (data instanceof ArrayBuffer) {
                    this.emit(`${portName}-port-data`, toBuffer(data));
                }
            }
            else {
                this.emit(`${portName}-port-data`, data);
            }
        });
        this.socket.on('port-error', (portName, error) => {
            this.emit(`${portName}-port-error`, error);
        });
        this.socket.on('parser-data', (portName, data) => {
            this.emit('parser-data', portName, data);
            this.emit(`${portName}-parser-data`, data);
        });
    }
    open(portName, options) {
        this.socket.emit('port-open', portName, options);
    }
    reopen(portName) {
        this.socket.emit('port-reopen', portName);
    }
    close(portName) {
        this.socket.emit('port-close', portName);
    }
    write(portName, data) {
        this.socket.emit('port-write', portName, data);
    }
    flush(portName) {
        this.socket.emit('port-flush', portName);
    }
    pipe(portName, parserType, options) {
        this.socket.emit('port-pipe', portName, parserType, options);
    }
    listPorts() {
        return new Promise((resolve, reject) => {
            this.socket.on('port-list', (list) => {
                resolve(list);
            });
            this.socket.emit('port-list');
        });
    }
    destroy() {
        this.removeAllListeners();
        this.socket.disconnect();
        this.socket.removeAllListeners();
    }
}
exports.SerialPortSocket = SerialPortSocket;
class DelimiterParser extends events_1.EventEmitter {
    constructor(options) {
        super();
        this.parserType = '';
        this.options = options;
    }
    setPort(portName, serialPortSocket) {
        serialPortSocket.on(`${portName}-parser-data`, (data) => {
            this.emit('data', data);
        });
    }
}
exports.DelimiterParser = DelimiterParser;
class ReadLineParser extends DelimiterParser {
    constructor(options) {
        super(options);
        this.parserType = 'Readline';
    }
}
exports.ReadLineParser = ReadLineParser;
class SerialPort extends events_1.EventEmitter {
    constructor(portName, options) {
        super();
        this.portName = '';
        this.isOpen = false;
        const sp = this;
        sp.portName = portName;
        options = options || {};
        if (SerialPort.sps === undefined) {
            sp.emit('error', new Error('SerialPortSocket not initialized'));
            return;
        }
        SerialPort.sps.on(`${portName}-port-open`, () => {
            sp.emit('open');
            sp.isOpen = true;
        });
        SerialPort.sps.on(`${portName}-port-data`, (data) => sp.emit('data', data));
        SerialPort.sps.on(`${portName}-port-close`, () => {
            sp.emit('close');
            sp.isOpen = false;
        });
        SerialPort.sps.on(`${portName}-port-error`, (err) => sp.emit('error', err));
        SerialPort.sps.open(portName, options);
    }
    open() {
        SerialPort.sps.open(this.portName);
    }
    close() {
        SerialPort.sps.close(this.portName);
    }
    write(data) {
        SerialPort.sps.write(this.portName, data);
    }
    flush() {
        SerialPort.sps.flush(this.portName);
    }
    pipe(parser) {
        parser.setPort(this.portName, SerialPort.sps);
        SerialPort.sps.pipe(this.portName, parser.parserType, parser.options);
    }
    static listPorts() {
        return new Promise((resolve, reject) => {
            SerialPort.sps.listPorts().then(resolve).catch(reject);
        });
    }
    static initSocket(address, options) {
        SerialPort.sps = new SerialPortSocket(address, options);
    }
}
SerialPort.parsers = { Readline: ReadLineParser };
exports.SerialPort = SerialPort;
