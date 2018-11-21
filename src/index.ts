import * as client from 'socket.io-client';
import { EventEmitter } from 'events';

declare const Buffer:any;

function toBuffer(ab:ArrayBuffer) {
  var buf = new Buffer(ab.byteLength);
  var view = new Uint8Array(ab);
  for (var i = 0; i < buf.length; ++i) {
      buf[i] = view[i];
  }
  return buf;
}

const isBrowser = new Function('try {return this===window;}catch(e){ return false;}');

if (isBrowser()) {
  (<any>window).Socket = client;
} else {
  (<any>global).Socket = client;
}

export interface PortInterface {
  comName:string;
  productId?:string;
  vendorId?:string;
  serialNumber?:string;
  descriptionName?:string;
}

export class SerialPortSocket extends EventEmitter {
  socket:any;
  constructor(address:string, options:any) {
    super();
    this.socket = client(address, options);
    this.socket.on('connect', () => this.emit('online'));
    this.socket.on('disconnect', () => this.emit('offline'));
    this.socket.on('port-open', (portName:string) => {
      this.emit(`${portName}-port-open`);
    });
    this.socket.on('port-close', (portName:string) => {
      this.emit(`${portName}-port-close`);
    });
    this.socket.on('port-data', (portName:string, data:any) => {
      if (isBrowser()) {
        if (typeof data === 'string') {
          this.emit(`${portName}-port-data`, data);
        } else if (data instanceof ArrayBuffer) {
          this.emit(`${portName}-port-data`, toBuffer(data));
        }
      } else {
        this.emit(`${portName}-port-data`, data);
      }
    });
    this.socket.on('port-error', (portName:string, error:string) => {
      this.emit(`${portName}-port-error`, error);
    });
    this.socket.on('parser-data', (portName:string, data:any) => {
      this.emit('parser-data', portName, data);
      this.emit(`${portName}-parser-data`, data);
    });
  }
  open(portName:string, options?:any) {
    this.socket.emit('port-open', portName, options);
  }
  reopen(portName:string) {
    this.socket.emit('port-reopen', portName);
  }
  close(portName:string) {
    this.socket.emit('port-close', portName);
  }
  write(portName:string, data:any) {
    this.socket.emit('port-write', portName, data);
  }
  flush(portName:string) {
    this.socket.emit('port-flush', portName);
  }
  pipe(portName:string, parserType:string, options:any) {
    this.socket.emit('port-pipe', portName, parserType, options);
  }
  listPorts() {
    return new Promise((resolve, reject) => {
      this.socket.on('port-list', (list:Array<PortInterface>) => {
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

export class DelimiterParser extends EventEmitter {
  parserType:string = '';
  options:any;
  constructor(options:any) {
    super();
    this.options = options;
  }
  setPort(portName:string, serialPortSocket:any) {
    serialPortSocket.on(`${portName}-parser-data`, (data:any) => {
      this.emit('data', data);
    });
  }
}

export class ReadLineParser extends DelimiterParser {
  parserType:string;
  constructor(options:any) {
    super(options);
    this.parserType = 'Readline';
  }
}

export class SerialPort extends EventEmitter {
  static parsers:any = {Readline: ReadLineParser};
  static sps:SerialPortSocket;
  portName:string = '';
  isOpen:boolean = false;
  constructor(portName:string, options:any) {
    super();
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
  write(data:any) {
    SerialPort.sps.write(this.portName, data);
  }
  flush() {
    SerialPort.sps.flush(this.portName);
  }
  pipe(parser:DelimiterParser) {
    parser.setPort(this.portName, SerialPort.sps);
    SerialPort.sps.pipe(this.portName, parser.parserType, parser.options);
  }
  static listPorts() {
    return new Promise((resolve, reject) => {
      SerialPort.sps.listPorts().then(resolve).catch(reject);
    });
  }
  static initSocket(address:string, options?:any) { //TODO:如果已经初始化，就停止
    SerialPort.sps = new SerialPortSocket(address, options);
  }
}
