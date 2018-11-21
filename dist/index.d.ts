/// <reference types="node" />
import { EventEmitter } from 'events';
export interface PortInterface {
    comName: string;
    productId?: string;
    vendorId?: string;
    serialNumber?: string;
    descriptionName?: string;
}
export declare class SerialPortSocket extends EventEmitter {
    socket: any;
    constructor(address: string, options: any);
    open(portName: string, options?: any): void;
    reopen(portName: string): void;
    close(portName: string): void;
    write(portName: string, data: any): void;
    flush(portName: string): void;
    pipe(portName: string, parserType: string, options: any): void;
    listPorts(): Promise<{}>;
    destroy(): void;
}
export declare class DelimiterParser extends EventEmitter {
    parserType: string;
    options: any;
    constructor(options: any);
    setPort(portName: string, serialPortSocket: any): void;
}
export declare class ReadLineParser extends DelimiterParser {
    parserType: string;
    constructor(options: any);
}
export declare class SerialPort extends EventEmitter {
    static parsers: any;
    static sps: SerialPortSocket;
    portName: string;
    isOpen: boolean;
    constructor(portName: string, options: any);
    open(): void;
    close(): void;
    write(data: any): void;
    flush(): void;
    pipe(parser: DelimiterParser): void;
    static listPorts(): Promise<{}>;
    static initSocket(address: string, options?: any): void;
}
